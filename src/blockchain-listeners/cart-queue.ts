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
    constructor() {
        console.log('building queue');
        const redisInfo = {
            host: 'redis-13847.c111.us-east-1-mz.ec2.cloud.redislabs.com',
            port: 13847,
            password: '5huUbUZpI6CXsf3lCyiOw876aUpwb9F5',
        };

        promisifyAll(redis);
        this.client = redis.createClient(redisInfo);

        this.cronTask = cron.schedule('*/5 * * * * *', () => {
            console.log(`Cron Check ${new Date()}`);
            Promise.all([
                this.lookAtTransactionsBySymbol('BTC'),
                this.lookAtTransactionsBySymbol('ETH'),
                // this.lookAtTransactionsBySymbol('GREEN'),
                // this.lookAtTransactionsBySymbol('GALA')
            ]);
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

    async getCartWatcher(symbol: string) {

        const allKeys = await this.client.keysAsync(`${symbol}.*`);
        console.log(allKeys);

        let counter: number = 0;
        for (const key of allKeys) {
            counter = counter + 1;
            const keyParts: string[] = key.split('.');

            const value = await this.client.getAsync(key);
            console.log(`gotValue ${key} : ${value}`)
            
            const valueObj = JSON.parse(value);

            if (!valueObj.exp || valueObj.exp < new Date()) {
                console.log(`deleting ${valueObj.exp} | ${new Date()}`);
                this.deleteCartWatcher(key);
            }
            else {
                //const brand: string = keyParts[1];
                const orderId: string = keyParts[2];

                const coin = walletApi.coin(symbol);
                const balance = await coin.getCartBalance(symbol, orderId, valueObj.address)
                    .then(a => a, (er2 => {
                        console.log(`FAILED WHEN TRYING TO UPDATE WOO CART : ${symbol}/${orderId}/${value}`);
                        console.log(JSON.stringify(er2));
                        return undefined;
                    }));

                console.log(balance);

                if (balance && balance.amountUnconfirmed > 0) {
                    const service: CartService = new CartService();
                    service.updateOrderToWooCart("", valueObj.address, balance.amountUnconfirmed, symbol);
                }
                else{
                    //Do we need some error handling if balance not found??
                }

            }
            console.log(`ending ${symbol} search : iterations ${counter}`);
        }

            // this.client.keysAsync(`${symbol}.*`, function(err: any, keys: any) {
            //     console.log(`keys error: ${err}`);
            //     console.log(`keys res: ${keys}`);

            //     const results: string[] = [];
            //     if(err) {
            //         logger.error(`getCartWatcher failed to get Keys for ${symbol} : ${JSON.stringify(err)}`);
            //     }
            //     for (const key of keys) {
            //         results.push(key);
            //     }



            //     let counter: number = 0;
            //     for (const key in keys) {
            //         counter = counter + 1;
            //         const keyParts: string[] = key.split('.');

            //         //this.getValueAndUpdateAtCart(key, symbol, this.client);

            //     }
            //     console.log(`ending ${symbol} search : iterations ${counter}`);
            //     return results;
            // }, this.getValueAndUpdateAtCart);

            //console.log('HHEEERRREE :' + JSON.stringify(values));

        }

        async getValueAndUpdateAtCart(key: string, symbol: string, client: any) {
            return await this.client.getAsync(key);

            // client.get(key, function(err: any, res: any) {
            //     console.log(`get error: ${err}`);
            //     console.log(`get res: ${res}`);
            //     const keyParts: string[] = key.split('.');

            //     const value: {address: string, expDate: Date} = JSON.parse(res);
            //     if(value.expDate < new Date()) {
            //         this.deleteCartWatcher(key);
            //     }
            //     else{
            //         //const brand: string = keyParts[1];
            //         const orderId: string = keyParts[2];

            //         const coin = walletApi.coin(symbol);
            //         coin.getCartBalance(symbol, orderId, value.address)
            //             .then(balance => {
            //                 if(balance.amountUnconfirmed > 0){
            //                     const service: CartService = new CartService();
            //                     service.updateOrderToWooCart(orderId, balance.amountUnconfirmed);
            //                 }
            //             }, (er2 => {
            //                 console.log(`FAILED WHEN TRYING TO UPDATE WOO CART : ${symbol}/${orderId}/${value}`);
            //                 console.log(JSON.stringify(er2));

            //             }));
            //     }

            // });
        }

        async deleteCartWatcher(key: string) {
            const deleteResult = await this.client.delAsync(key);
            return deleteResult;
        }

    private async cronFunction() {
        console.log(`Cron Check ${new Date()}`);
        await Promise.all([
            this.lookAtTransactionsBySymbol('BTC'),
            this.lookAtTransactionsBySymbol('ETH'),
            // this.lookAtTransactionsBySymbol('GREEN'),
            // this.lookAtTransactionsBySymbol('GALA')
        ]);
    }

    private async lookAtTransactionsBySymbol(symbol: string): Promise<void> {
        console.log(`beginning ${symbol} search`);
        await this.getCartWatcher(symbol);


    }





    //TODO : Cron to cycle through the latest cart-service.orders, 
    //-remove extra watchers that have added to cartWatcher, but not on the order
    //-look at address, and check balance
    //-if amount is paid from order, post back to server that it is paid
    //-have scott verify that it is updating the value in woo


}

export const cartQueue: CartQueue = new CartQueue();
