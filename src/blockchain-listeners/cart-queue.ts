import { walletApi } from '../wallet-api';
import { logger } from "../common";
import {
    CartService
} from './cart-service';
const cron = require('node-cron');
const redis = require("redis");
const { promisifyAll } = require('bluebird');



export class CartQueue {
    private client: any;
    private cronTask: any;
    private coinsToWatch: string[] = ['BTC', 'ETH'];
    constructor() {
        console.log('building queue');
        const redisInfo = {
            host: 'redis-13847.c111.us-east-1-mz.ec2.cloud.redislabs.com',
            port: 13847,
            password: '5huUbUZpI6CXsf3lCyiOw876aUpwb9F5',
        };

        promisifyAll(redis);
        this.client = redis.createClient(redisInfo);

        this.cronTask = cron.schedule('* * * * *', () => {
            const promiseArray: any[] = [];
            this.coinsToWatch.forEach(coin => {
                promiseArray.push(this.lookAtTransactionsBySymbol(coin));
            })
            Promise.all(promiseArray);
        });
        this.cronTask.start();
    }

    async setCartWatcher(brand: string, blockchain: string, orderId: string, data: any) {
        const keyToAdd: string = `${blockchain}.${brand}.${orderId}`;
        const valueToAdd: string = JSON.stringify(data);
        console.log(`setting ${keyToAdd} : ${valueToAdd}`)

        this.client.set(keyToAdd, valueToAdd, function (err: any, res: any) {
            console.log(`set error: ${err}`);
            console.log(`set res: ${res}`);
        });
    }

    // async dangerNeverUse(){
    //     const allKeys = await this.client.keysAsync(`*`);
    //     for (const key of allKeys) {
    //         await this.deleteCartWatcher(key);
    //     }
    // }

    async getCartWatcher(symbol: string) {
        const allKeys = await this.client.keysAsync(`${symbol}.*`);
        //console.log(allKeys);

        let counter: number = 0;
        for (const key of allKeys) {
            counter = counter + 1;
            const keyParts: string[] = key.split('.');
            const value = await this.client.getAsync(key);
            const valueObj = JSON.parse(value);

            if (!valueObj.exp || new Date(valueObj.exp) < new Date()) {
                console.log(`deleting ${valueObj.exp} | ${new Date()}`);
                this.deleteCartWatcher(key);
            }
            else {
                const brand: string = keyParts[1];
                const orderId: string = keyParts[2];

                const coin = walletApi.coin(symbol);
                const balance = await coin.getCartBalance(symbol, orderId, valueObj.address)
                    .then(a => a, (er2 => {
                        logger.error(`FAILED WHEN TRYING TO UPDATE WOO CART : ${symbol}/${orderId}/${value}`);
                        return undefined;
                    }));

                // console.log(value);
                // console.log(balance);

                if (balance && balance.amountUnconfirmed > 0) {
                    const service: CartService = new CartService();
                    try {
                        service.updateOrderToWooCart("", valueObj.address, balance.amountUnconfirmed, symbol);

                        const orderResponse = await service.getOrdersFromWooCart();
                        for(const order of orderResponse.orders){
                            if(order.id === orderId){
                                for(const meta of order.meta_data) {
                                    if(meta.key === "currency_amount_to_process" ){
                                        const orderExpectedAmount = +meta.value;
                                        if(+balance.amountUnconfirmed >= orderExpectedAmount) {
                                            //Checking the order from WOO. Is our amount > expected amount??
                                            
                                            await this.deleteCartWatcherOthercoins(brand, orderId);
                                        }
                                        else
                                        {
                                            //TODO : email the user saying that they didn't send enough
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch(err){
                        logger.error(`cart-queue.getCartWatcher.updateOrderToWooCart failed to update - ${err} : ${JSON.stringify(valueObj)} : ${JSON.stringify(balance)} : ${symbol}`);
                    }
                }
                else {
                    //Do we need some error handling if balance not found??
                }
            }
            console.log(`ending ${symbol} search : iterations ${counter}`);
        }
    }

    async getValueAndUpdateAtCart(key: string, symbol: string, client: any) {
        return await this.client.getAsync(key);
    }

    async deleteCartWatcher(key: string) {
        const deleteResult = await this.client.delAsync(key);
        return deleteResult;
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
