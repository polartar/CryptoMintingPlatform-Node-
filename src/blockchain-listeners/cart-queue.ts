import { walletApi } from '../wallet-api';
import { logger, config } from '../common';
import { CartService, MemprTxOrders } from './cart-service';
import { CartType, ICartWatcherData, CartRedisKey } from '../types';
import { CartTransaction, ICartTransaction } from '../models';
const cron = require('node-cron');
const redis = require('redis');
const { promisifyAll } = require('bluebird');
import axios from 'axios';

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
      const orderResponse: MemprTxOrders = await service.getOrdersFromMeprCart(
        orderId,
      );
      const tx_json = JSON.parse(orderResponse['tx-json']);
      data.usdAmount = +tx_json.total;
      data.meprTxData = orderResponse['tx-json'];
    } catch (err) {
      logger.error(`Can't get transaction from WP error: ${err}`);
    }

    const keyToAdd: string = this.formatKey(symbol, orderId);
    const valueToAdd: string = JSON.stringify(data);
    //logger.error(`setCart // ${keyToAdd} / ${valueToAdd}`);

    this.client.set(keyToAdd, valueToAdd, function(err: any, res: any) {
      if (err) {
        logger.error(`queue set error: ${err} / ${keyToAdd} / ${valueToAdd}`);
      }
    });
  }

  async replaceCartWatcher(key: string, data: ICartWatcherData) {
    const valueToAdd: string = JSON.stringify(data);
    //logger.error(`setCart // ${key} / ${data}`);
    await this.deleteCartWatcher(key);
    await this.client.set(key, valueToAdd, function(err: any, res: any) {
      if (err) {
        logger.error(`queue replace error: ${err} / ${key} / ${valueToAdd}`);
      }
    });
  }

  async getCartWatcher(symbol: string) {
    const brand = config.brand;
    const allKeys = await this.client.keysAsync(`${symbol}.${brand}.*`);

    let counter: number = 0;
    for (const key of allKeys) {
      counter = counter + 1;

      const valueObj: ICartWatcherData = await this.getTransactionFromKey(key);
      const keyObj: CartRedisKey = this.parseKey(key);

      if (!valueObj.exp || new Date(valueObj.exp) < new Date()) {
        await this.deleteCartWatcher(key);

        //TODO : wooCommerce needs to be notified of 'expired' transaction.
      } else {
        const coin = walletApi.coin(symbol);
        const balance = await coin
          .getCartBalance(symbol, keyObj.orderId, valueObj.address)
          .then(
            a => a,
            er2 => {
              logger.error(
                `FAILED WHEN TRYING TO UPDATE ${
                  keyObj.orderType
                } CART : ${symbol}/${key.orderId}/${JSON.stringify(valueObj)}`,
              );
              return undefined;
            },
          );

        if (
          balance &&
          balance.amountUnconfirmed > 0 &&
          (valueObj.status === 'pending' ||
            valueObj.status === 'found' ||
            valueObj.status === 'insufficient')
        ) {
          const service: CartService = new CartService();
          try {
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
            // else{
            // const orderResponse = await service.getOrdersFromMeprCart(keyObj.orderId);
            let orderInfo: any = {
              total: '-1',
              membership: { title: '', email: '', first_name: '' },
            };
            if (valueObj.meprTxData) {
              orderInfo = JSON.parse(valueObj.meprTxData);
            }

            if (+balance.amountUnconfirmed >= valueObj.crytoAmount) {
              try {
                service.updateTransactionToMemberpressCart(
                  keyObj.orderId,
                  valueObj.address,
                  balance.amountUnconfirmed,
                  symbol,
                  `${keyObj.orderId}`,
                );
              } catch (err) {
                logger.error(
                  `PAID, but not updated in WP : ${keyObj.orderId} : ${valueObj.address} : ${balance.amountUnconfirmed}`,
                );
              }

              try {
                const total = valueObj.usdAmount;
                const name =
                  orderInfo && orderInfo['membership']
                    ? orderInfo['membership']['title']
                    : '';
                const email =
                  orderInfo && orderInfo['membership']
                    ? orderInfo['membership']['email']
                    : '';
                const dbItem: ICartTransaction = {
                  wp_id: keyObj.orderId,
                  status: 'complete',
                  currency: symbol,
                  discount_total: '',
                  discount_tax: '',
                  total: total.toString(),
                  name,
                  email,
                  data: JSON.stringify(orderInfo),
                };

                CartTransaction.create(dbItem);

                //TODO : add license(s)
              } catch (err) {
                logger.error(
                  `PAID, but not saved to MongoDb : ${keyObj.orderId} : ${valueObj.address} : ${balance.amountUnconfirmed}`,
                );
              }

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
                logger.error(
                  `PAID, but not sent to Google Pixel Fire : ${keyObj.orderId} : ${valueObj.address} : ${balance.amountUnconfirmed}`,
                );
              }

              valueObj.status = 'complete';
              await this.replaceCartWatcher(key, valueObj);

              //await this.deleteCartWatcherOthercoins(brand, keyObj.orderId);
            } else if (balance.amountUnconfirmed > 0) {
              valueObj.status = 'insufficient';
              valueObj.crytoAmountRemaining =
                valueObj.crytoAmount - balance.amountUnconfirmed;
              await this.replaceCartWatcher(key, valueObj);
            }

            //}
          } catch (err) {
            logger.error(
              `cart-queue.getCartWatcher.updateOrderToWooCart failed to update - ${err} : ${JSON.stringify(
                valueObj,
              )} : ${JSON.stringify(balance)} : ${symbol} : ${key}`,
            );
          }
        } //else if (balance && balance.amountConfirmed)
        // else (balance && balance.amountUnconfirmed > 0 && (valueObj.status === 'pending' || valueObj.status === 'found' || valueObj.status === 'insufficient')) {
        //   //Do we need some error handling if balance not found??
        // }
      }
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

  // async dangerNeverUse(){
  //     const allKeys = await this.client.keysAsync(`*`);
  //     for (const key of allKeys) {
  //         await this.deleteCartWatcher(key);
  //     }
  // }

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
