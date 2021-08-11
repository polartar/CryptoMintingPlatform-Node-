import { config } from '../common';
import { ServerToServerService } from '../services/server-to-server';
import { subDays } from 'date-fns';

export class CartService extends ServerToServerService {
  constructor() {
    super();
  }

  public getOrdersFromWooCart = async (): Promise<WooTxOrders[]> => {
    const axios = this.getAxios({ role: 'system' });

    const currDate = new Date();
    const yesterday = subDays(currDate, 1);

    const result = await axios.post<WooTxOrders[]>(
      `${config.wpCartApiUrl}/get_woo_tx_orders?ApiKey=338a3ba7-69b8-41ac-a920-9727ae939ba3&date_start=${this.dateString(yesterday)}&date_end=${this.dateString(currDate)}`,
       {});

    return result.data;
  };

  public updateOrderToWooCart = async (woo_tx_id: string, address: string, balance: number, coinSymbol: string): Promise<WooTxOrders[]> => {
    const postBody:any = {
      ApiKey: '338a3ba7-69b8-41ac-a920-9727ae939ba3',
      Address: address,
      CoinSymbol: coinSymbol,
      AmtTotal: balance,
      TxIds: woo_tx_id
    };

    try{
      const axios = this.getAxios({ role: 'system' });

      const result = await axios.post<WooTxOrders[]>(
        `${config.wpCartApiUrl}/update_woo_tx_order`, postBody
      );

      return result.data;
    }
    catch(err){
      console.log(`cart-service.CartService.updateOrderToWooCart : ${JSON.stringify(postBody)}`);
    }
  };

  private dateString(val: Date) {
    return `${val.getFullYear}-${val.getMonth}-${val.getDay}`;
  }
}

export class WooTxOrders {
  "success": number;
  "message": string;
  "orders": WooTxOrderDetail[];
  "orders-json": string;
}

export class WooTxOrderDetail {
  "id": number;
  "parent_id": number;
  "status": string;
  "currency": string;
  "version": string;
  "prices_include_tax": boolean;
  "date_created": WordpressDate;
  "discount_total": string;
  "discount_tax": string;
  "shipping_total": string;
  "shipping_tax": string;
  "cart_tax": string;
  "total": string;
  "total_tax": string;
  "customer_id": number;
  "order_key": string;
  "billing": any; //todo: update this
  "payment_method": string;
  "payment_method_title": string;
  "transaction_id": string;
  "customer_ip_address": string;
  "customer_user_agent": string;
  "created_via": string;
  "customer_note": string;
  "date_completed": WordpressDate;
  "date_paid": WordpressDate;
  "cart_hash": string;
  "number": string;
  "meta_data": WooTxOrderDetailMeta[];
  "line_items": any;
  "tax_lines": any[];
  "shipping_lines": any[];
  "fee_lines": any[];
  "coupon_lines": any[];
  "custom_field": any;
}


// "billing": {
//   "first_name": "Brant",
//   "last_name": "Frank",
//   "company": "asdf",
//   "address_1": "939393",
//   "address_2": "asdf",
//   "city": "lsoldid",
//   "state": "UT",
//   "postcode": "88888",
//   "country": "US",
//   "email": "brant@blockchain.com",
//   "phone": "8884441111"
// },
// "shipping": {
//   "first_name": "",
//   "last_name": "",
//   "company": "",
//   "address_1": "",
//   "address_2": "",
//   "city": "",
//   "state": "",
//   "postcode": "",
//   "country": ""
// },
// "custom_field": {
//   "currency_to_process": "BTC",
//   "currency_address": "",
//   "currency_value": "",
//   "currency_amount_to_process": "0.06289130",
//   "payment_type": "internal"
// }



export class WordpressDate {
  "date": string;
  "timezone_type": number;
  "timezone": string;
}

export class WooTxOrderDetailMeta {
  "id": number;
  "key": string;
  "value": string;
}
