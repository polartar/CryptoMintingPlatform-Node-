import { walletApi } from '../wallet-api';
import { logger, config } from '../common';
import { CartService, MemprTxOrders } from './cart-service';
import { CartType, ICartWatcherData, CartRedisKey, CartStatus } from '../types';
import { CartTransaction, ICartTransaction, ICartTransactionDoc } from '../models';
const cron = require('node-cron');
const redis = require('redis');
const { promisifyAll } = require('bluebird');
import axios from 'axios';
import { subHours } from 'date-fns';

export class CartQueue {
  private client: any;
  private cronTask: any;
  private coinsToWatch: string[] = ['BTC', 'ETH'];
  constructor() {
    const redisInfo = config.redisInfo;
    promisifyAll(redis);
    this.client = redis.createClient(redisInfo);

    this.cronTask = cron.schedule('* * * * *', () => {
      const promiseArray: any[] = [];
      this.coinsToWatch.forEach(coin => {
        promiseArray.push(this.lookAtTransactionsBySymbol(coin));
      });
      Promise.all(promiseArray);
    });
    this.cronTask.start();
  }

  async setCartWatcher(
    symbol: string,
    orderId: string,
    data: ICartWatcherData,
  ) {
    try {
      const service: CartService = new CartService();
      const orderResponse: MemprTxOrders = await service.getOrdersFromMeprCart(orderId);

      const tx_json = JSON.parse(orderResponse['tx-json']);
      data.usdAmount = +tx_json.total;
      data.meprTxData = orderResponse['tx-json'];
    } catch (err) {
      logger.error(`Can't get transaction from WP error: ${err}`);
    }

    const keyToAdd: string = this.formatKey(symbol, orderId);
    const valueToAdd: string = JSON.stringify(data);

    this.client.set(keyToAdd, valueToAdd, function (err: any, res: any) {
      if (err) {
        logger.error(`queue set error: ${err} / ${keyToAdd} / ${valueToAdd}`);
      }
    });
    return { keyToAdd, valueToAdd: data };
  }

  async replaceCartWatcher(key: string, data: ICartWatcherData) {
    const valueToAdd: string = JSON.stringify(data);
    //logger.error(`setCart // ${key} / ${data}`);
    await this.deleteCartWatcher(key);
    await this.client.set(key, valueToAdd, function (err: any, res: any) {
      if (err) {
        logger.error(`queue replace error: ${err} / ${key} / ${valueToAdd}`);
      }
    });
  }

  async getCartWatcher(symbol: string) {

    const brand = config.brand;
    const currTime = new Date();
    const currTimeNative = (currTime).valueOf();

    //const allKeys = await this.client.keysAsync(`${symbol}.${brand}.*`);
    const allKeys = await this.client.keysAsync(`*`);

    // console.log('------------------ HOW MANY KEYS?? ---------------')
    // console.log(allKeys);
    // console.log('-/end----------------- HOW MANY KEYS?? ---------------')

    const fourHoursAgo = (subHours(currTime, 4)).valueOf();
    for (const key of allKeys) {

      const valueObj: ICartWatcherData = await this.getTransactionFromKey(key);
      const keyObj: CartRedisKey = this.parseKey(key);

      //Skipping other brands
      if (keyObj.brand !== brand) {
        continue;
      }

      //Purging from REDIS if it has been more than 5 hrs
      if (valueObj.exp.valueOf() < fourHoursAgo) {
        await this.deleteCartWatcher(key);
        continue;
      }

      //Skipping values
      if (valueObj.status === CartStatus[CartStatus.complete] ||
        valueObj.status === CartStatus[CartStatus.expired]) {
        continue;
      }

      //Check if the object is expired
      if (valueObj.exp.valueOf() < currTimeNative) {
        valueObj.status = CartStatus[CartStatus.expired];

        const dbCreateRecord = await this.saveToDb(valueObj, keyObj);
        valueObj.dbId = dbCreateRecord.id;

        await this.replaceCartWatcher(key, valueObj);
        continue;
      }

      // Query Blockchain for balance
      const coin = walletApi.coin(symbol);
      const balance = await coin
        .getCartBalance(symbol, keyObj.orderId, valueObj.address)
        .then(
          a => a,
          er2 => {
            logger.error(
              `FAILED WHEN TRYING TO FIND ${keyObj.orderType
              } CART : ${symbol}/${key.orderId}/${JSON.stringify(valueObj)} | error: ${er2}` ,
            );
          },
        );

        if (!balance) {
        continue;
      }
      const cryptoPrice = (valueObj.usdAmount / valueObj.crytoAmount);
      const acceptableBuffer = 1.5 * cryptoPrice;
      const acceptableBalance = +balance.amountConfirmed + acceptableBuffer;
      if (valueObj.status === CartStatus[CartStatus.confirming]) {
        if (acceptableBalance >= valueObj.crytoAmount) {
          //Update the DB
          valueObj.status = CartStatus[CartStatus.complete];
          valueObj.crytoAmountRemaining = 0;

          await this.saveToDb(valueObj, keyObj);

          try {
            const service: CartService = new CartService();
            service.updateTransactionToMemberpressCart(
              valueObj.address,
              balance.amountUnconfirmed,
              keyObj.symbol,
              keyObj.orderId,
              CartStatus.complete,
            );
          } catch (err) {
            logger.error(
              `PAID, but not updated in WP : ${keyObj.orderId} : ${valueObj.address} : ${balance.amountUnconfirmed}`,
            );
            console.log(`PAID, but not updated in WP : ${keyObj.orderId} : ${valueObj.address} : ${balance.amountUnconfirmed}`);
          }

          const orderInfo = JSON.parse(valueObj.meprTxData);
          try{
            await this.sendGooglePixelConvert(orderInfo);
          }
          catch(err){
            logger.error(`failed to get google pixel to fire ${valueObj} | ${keyObj}`);
          }

          await this.replaceCartWatcher(key, valueObj);
        }

        continue;
      }

      const acceptableUnconfirmed = +balance.amountUnconfirmed + acceptableBuffer;

      //Check in on insufficient transaction
      if (valueObj.status === CartStatus[CartStatus.insufficient]) {
        if (acceptableUnconfirmed >= valueObj.crytoAmount) {
          //Update the DB
          valueObj.status = CartStatus[CartStatus.confirming];
          valueObj.crytoAmountRemaining = 0;

          await this.saveToDb(valueObj, keyObj);
          await this.replaceCartWatcher(key, valueObj);
        }

        continue;
      }

      if (acceptableUnconfirmed >= valueObj.crytoAmount) {
        //Update the DB
        valueObj.status = CartStatus[CartStatus.confirming];
        valueObj.crytoAmountRemaining = 0;

        const newDbRecord = await this.saveToDb(valueObj, keyObj);
        valueObj.dbId = newDbRecord.id;

        await this.replaceCartWatcher(key, valueObj);

        this.deleteCartWatcherSibling(keyObj);
        continue;
      }

      if (+balance.amountUnconfirmed > 0) {
        //Update the DB
        valueObj.status = CartStatus[CartStatus.insufficient];
        valueObj.crytoAmountRemaining = valueObj.crytoAmount - +balance.amountUnconfirmed;

        const newDbRecord = await this.saveToDb(valueObj, keyObj);
        valueObj.dbId = newDbRecord.id;

        await this.replaceCartWatcher(key, valueObj);
        this.deleteCartWatcherSibling(keyObj);
        continue;
      }







          // if(keyObj.orderType === CartType.woocommerce){
          //   const orderResponse = await service.getOrdersFromWooCart();

          //   for (const order of orderResponse.orders) {
          //     if (order.id === keyObj.orderId) {
          //       for (const meta of order.meta_data) {
          //         if (meta.key === 'currency_amount_to_process') {
          //           const orderExpectedAmount = +meta.value;
          //           if (+balance.amountUnconfirmed >= orderExpectedAmount) {
          //             //Checking the order from WOO. Is our amount > expected amount??
          //             let arryOfItems: string = JSON.stringify(
          //               Object.keys(order.line_items),
          //             );
          //             arryOfItems = arryOfItems.replace(/\s+/g, '');

          //             service.updateOrderToWooCart(
          //               keyObj.orderId,
          //               valueObj.address,
          //               balance.amountUnconfirmed,
          //               symbol,
          //               keyObj.orderId,
          //             );

          //             await this.sendGooglePixelFire(
          //               order.billing.first_name,
          //               arryOfItems,
          //               +order.total,
          //             );

          //             await this.deleteCartWatcherOthercoins(brand, keyObj.orderId);
          //           } else {
          //             //TODO : email the user saying that they didn't send enough
          //             // service.updateOrderToWooCart(    //Partial Payment
          //             //   orderId,
          //             //   valueObj.address,
          //             //   balance.amountUnconfirmed,
          //             //   symbol,
          //             //   orderId,
          //             // );
          //           }
          //         }
          //       }
          //     }
          //   }

          // }
    }
  }

  async getRawCartWatcher(key: string) {
      const value = await this.client.getAsync(key);
      return value;
    }

    formatKey(symbol: string, orderId: string): string {
      const brand = config.brand;
      const keyToAdd: string = `${symbol}.${brand}.${orderId}`; //orderId will be mepr.${transactionId} OR ${orderId} (woo)
      return keyToAdd;
    }

    formatCartKey(keyObject: CartRedisKey): string {
      const keyToAdd: string = `${keyObject.symbol}.${keyObject.brand}.${keyObject.orderId}`; //orderId will be mepr.${transactionId} OR ${orderId} (woo)
      return keyToAdd;
    }

    parseKey(cartKey: string): CartRedisKey {
      const keyParts: string[] = cartKey.split('.');

      const result: CartRedisKey = {
        symbol: keyParts[0],
        brand: keyParts[1],
        orderId: keyParts[2],
        orderType: CartType.woocommerce,
      };
      if (keyParts[2].toUpperCase() === 'MEPR') {
        result.orderId = keyParts[3];
        result.orderType = CartType.memberpress;
      }
      return result;
    }

  async saveToDb(valueObj: ICartWatcherData, keyObj: CartRedisKey) : Promise < ICartTransactionDoc > {
      let orderInfo: any = {};
      if(valueObj.meprTxData) {
      orderInfo = JSON.parse(valueObj.meprTxData);
    }

    const dbItem: ICartTransaction = {
      wp_id: keyObj.orderId,
      status: valueObj.status,
      currency: keyObj.symbol,
      discountAmtUsd: "0",
      totalUsd: valueObj.usdAmount.toString(),
      totalCrypto: valueObj.crytoAmount.toString(),
      conversionRate: (valueObj.usdAmount / valueObj.crytoAmount).toString(),
      remainingCrypto: valueObj.crytoAmountRemaining.toString(),
      address: valueObj.address,
      name: orderInfo.member.display_name,
      email: orderInfo.member.email,
      data: JSON.stringify(orderInfo),
      created: new Date(),
    };

    if (valueObj.dbId) {
      //return await CartTransaction.updateOne({ id: valueObj.dbId }, dbItem);
    } else {
      return await CartTransaction.create(dbItem);
    }
  }

  async sendGooglePixelConvert(orderInfo: any): Promise<void> {
    try {
      const fname =
        orderInfo && orderInfo['membership']
          ? orderInfo['membership']['first_name']
          : '';
      const title =
        orderInfo && orderInfo['membership']
          ? orderInfo['membership']['title']
          : '';
      await this.sendGooglePixelFire(
        fname,
        title,
        +orderInfo['total'],
      );

    } catch (err) {
      const errorMessage = `sendGooglePixelConvert failed: ${orderInfo} | ${err}`;
      logger.error(errorMessage);
      throw Error(errorMessage)
    }

  }

  async getTransaction(
    symbol: string,
    orderId: string,
  ): Promise<ICartWatcherData> {
    const key: string = this.formatKey(symbol, orderId);
    return await this.getTransactionFromKey(key);
  }

  async getTransactionFromKey(key: string): Promise<ICartWatcherData> {
    const value: string = await this.getRawCartWatcher(key);
    return JSON.parse(value) as ICartWatcherData;
  }

  async sendGooglePixelFire(
    customerNumber: string,
    product: string,
    price: number,
  ) {
    try {
      let ua = '';
      switch (config.brand) {
        case 'green':
          ua = 'UA-132009155-2';
          break;
        case 'connect':
          ua = 'UA-132009155-8';
          break;
        case 'switch':
          ua = 'UA-132009155-10';
          break;
        case 'blue':
          ua = 'UA-132009155-9';
          break;
      }

      const parameters: string = `v=1&tid=${ua}&cid=${customerNumber}&t=event&ec=App&ea=buy_product&el=${product}&ev=${price}`;

      const { data } = await axios.post(
        `www.google-analytics.com/collect`,
        parameters,
      );
    } catch (err) {
      logger.error(`cart-queue.sendGooglePixelFire.failedToSendToGoogle`);
    }
  }

  async getValueAndUpdateAtCart(key: string, symbol: string, client: any) {
    return await this.client.getAsync(key);
  }

  async deleteCartWatcher(key: string) {
    const deleteResult = await this.client.delAsync(key);
    return deleteResult;
  }

  async deleteCartWatcherSibling(myKey: CartRedisKey) {
    const otherCryptoSymbol: string = myKey.symbol === "ETH" ? "BTC" : "ETH";
    const otherCryptoKey: CartRedisKey = {
      brand: myKey.brand,
      orderId: myKey.orderId,
      orderType: myKey.orderType,
      symbol: otherCryptoSymbol
    };

    await this.deleteCartWatcher(
      this.formatCartKey(otherCryptoKey));
  }

  async dangerNeverUse() {
    const allKeys = await this.client.keysAsync(`*`);
    for (const key of allKeys) {
      await this.deleteCartWatcher(key);
    }
  }

  async deleteCartWatcherOthercoins(brand: string, orderId: string) {
    //If we are done with 1 coin of the order, delete all the other coin watchers
    //for that order

    const promiseArray: any[] = [];
    this.coinsToWatch.forEach(coin => {
      promiseArray.push(this.client.delAsync(coin));
    });
    return await Promise.all(promiseArray);
  }

  private async lookAtTransactionsBySymbol(symbol: string): Promise<void> {
    await this.getCartWatcher(symbol);
  }
}

export const cartQueue: CartQueue = new CartQueue();
