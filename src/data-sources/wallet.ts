import { DataSource } from 'apollo-datasource';
import { WalletBase } from './';
import Btc from './btc-wallet';
const autoBind = require('auto-bind');

export default class Wallet extends DataSource {
  private btc: WalletBase;
  constructor() {
    super();
    autoBind(this);
    this.btc = new Btc();
  }

  public getCoinAPI(symbol: string) {
    const lowerSymbol = symbol.toLowerCase();
    switch (lowerSymbol) {
      case 'btc': {
        return this.btc;
      }
      default: {
        throw new Error('Symbol not supported');
      }
    }
  }
}
