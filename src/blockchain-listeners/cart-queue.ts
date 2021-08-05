import { logger } from "../common";

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
    }

    setCartWatcher(brand: string, blockchain: string, orderId: string, data: any) {
        const keyToAdd: string = `${blockchain}.${brand}.${orderId}`;
        const valueToAdd: string = JSON.stringify(data);
        this.client.set(keyToAdd, valueToAdd);
    }
    
    getCartWatcher(blockchain: string) {
        this.client.keys(`${blockchain}.*`, function(err: any, keys: any) {
            if(err) {
                logger.error(`getCartWatcher failed to get Keys for ${blockchain} : ${JSON.stringify(err)}`);
            }
            for (const key of keys) {
                console.log(this.client.get(key, redis.print));
            }
        });
    }

    deleteCartWatcher(key:string) {
        this.client.hdel(key, function(err: any, val: any) {
            if(err) {
                logger.error(`deleteCartWatcher failed for ${key} : ${JSON.stringify(err)}`);
            }
        });
    }
}

const cartQueue: CartQueue = new CartQueue();
export default cartQueue;
