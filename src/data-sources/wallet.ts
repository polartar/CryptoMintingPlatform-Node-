import { DataSource } from 'apollo-datasource';
import { WalletBase } from './';
import Btc from './btc-wallet';
const autoBind = require('auto-bind');

export default class Wallet extends DataSource {
  btc: WalletBase;
  constructor() {
    super();
    autoBind(this);
    console.log('WalletBase -> constructor');
    this.btc = new Btc();
  }
}
