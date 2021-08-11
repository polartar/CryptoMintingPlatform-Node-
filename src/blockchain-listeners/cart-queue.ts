import { walletApi } from '../wallet-api';
import { logger } from "../common";
import { 
    CartService
    } from './cart-service';
const cron = require('node-cron');
const redis = require("redis");


class CartQueue {
    private client: any;
    constructor() {
        const redisInfo = {
            host: 'redis-13847.c111.us-east-1-mz.ec2.cloud.redislabs.com',
            port: 13847,
            password: '5huUbUZpI6CXsf3lCyiOw876aUpwb9F5',
        };
        this.client = redis.createClient(redisInfo);

        cron.schedule('* * * * *', () => this.cronFunction);


    }

    async setCartWatcher(brand: string, blockchain: string, orderId: string, data: any) {
        const keyToAdd: string = `${blockchain}.${brand}.${orderId}`;
        const valueToAdd: string = JSON.stringify(data);
        return await this.client.set(keyToAdd, valueToAdd);
    }
    
    async getCartWatcher(blockchain: string) {
        return await this.client.keys(`${blockchain}.*`, function(err: any, keys: any): string[] {
            const results: string[] = [];
            if(err) {
                logger.error(`getCartWatcher failed to get Keys for ${blockchain} : ${JSON.stringify(err)}`);
            }
            for (const key of keys) {
                results.push(key);
            }
            return results;    
        });
    }

    async getCartWatcherValue(key: string){
        return await this.client.get(key);
    }

    async deleteCartWatcher(key:string) {
        return await this.client.hdel(key, function(err: any, val: any) {
            if(err) {
                logger.error(`deleteCartWatcher failed for ${key} : ${JSON.stringify(err)}`);
            }
        });
    }

    private async cronFunction() {
        await Promise.all([
            this.lookAtTransactionsBySymbol('BTC'),
            this.lookAtTransactionsBySymbol('ETH'),
            this.lookAtTransactionsBySymbol('GREEN'),
            this.lookAtTransactionsBySymbol('GALA')
        ]);
    }

    private async lookAtTransactionsBySymbol(symbol: string): Promise<void> {
        const keys: string[] = await this.getCartWatcher(symbol);

        for (const key in keys) {
            const keyParts: string[] = key.split('.');
            //const brand: string = keyParts[1];
            const orderId: string = keyParts[2];
            const cartValueStr: string = await this.getCartWatcherValue(key);
            const value: {address: string, expDate: Date} = JSON.parse(cartValueStr);
            if(value.expDate < new Date()) {
                this.deleteCartWatcher(key);
            }
            else{
                const coin = walletApi.coin(symbol);
                const balance = await coin.getCartBalance(symbol, orderId, value.address);
                if(balance.amountUnconfirmed > 0){
                    const service: CartService = new CartService();
                    service.updateOrderToWooCart(orderId, balance.amountUnconfirmed);
                }
            }
        }
    }





    //TODO : Cron to cycle through the latest cart-service.orders, 
    //-remove extra watchers that have added to cartWatcher, but not on the order
    //-look at address, and check balance
    //-if amount is paid from order, post back to server that it is paid
    //-have scott verify that it is updating the value in woo


}

const cartQueue: CartQueue = new CartQueue();
export default cartQueue;
