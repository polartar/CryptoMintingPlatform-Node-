import { DataSource } from 'apollo-datasource';
import { WalletBase } from './';
import Btc from './btc-wallet';
const autoBind = require('auto-bind');

// This class is used as a common data source to select the appropriate interface given a token symbol sent as an argument in the GQL query.
export default class Wallet extends DataSource {
  // Each of the different interfaces will extend the abstract class WalletBase which will ensure that each interface implements the same methods, and returns the same data shape.
  private btc: WalletBase;
  constructor() {
    super();
    autoBind(this);
    // There will be one interface for BTC
    this.btc = new Btc();
    // TODO: implement ETH interface
    // TODO: implement ERC20 interface
  }

  public getCoinAPI(symbol: string) {
    const lowerSymbol = symbol.toLowerCase();
    switch (lowerSymbol) {
      case 'btc': {
        return this.btc;
      }
      // NOT READY YET, but this is what it would look like once the eth interface is complete
      // case 'eth': {
      //   return this.eth
      // }
      default: {
        // Hopefully if the previous two cases don't match the symbol, the token is ERC20 and you can return a new ERC20 interface configured with the contract address, token symbol, ABI, etc.
        throw new Error('Symbol not supported');
      }
    }
  }
}
