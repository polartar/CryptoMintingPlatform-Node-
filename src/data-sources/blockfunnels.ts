import { config } from '../common';
import { IOrderContext } from '../types';
import { RESTDataSource } from 'apollo-datasource-rest';

class Blockfunnels extends RESTDataSource {
  baseURL = config.blockfunnelsUrl;

  public async orderProduct(orderInfo: {
    productId: string;
    productAmount: number;
    context: IOrderContext;
    id: string; // userId
  }) {
    const orderResponse = await this.post('/user/order', orderInfo);
    return orderResponse;
  }
}

export default Blockfunnels;

export const blockfunnelsService = new Blockfunnels();
