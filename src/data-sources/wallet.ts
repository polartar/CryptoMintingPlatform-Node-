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
    // this.eth = new Eth()
    // TODO: implement ERC20 interface - This one will be tricky as it will likely need special arguments in the constructor like the contract address and the ABI. I really liked the idea of querying all of that data from the db as the server starts so that implementing new erc20s in the future would only require a new DB entry and a server restart.
  }

  // This method would return an array of all available wallet interfaces so you could implement iterating over this array and running a method for all available itnerfaces. i.e. to get the balance for all supported coins you could just map over this returned array and run the .getBalance method on each interface inside of a Promise.all
  // potential alternate name could be just coins() so that it is called with wallet.coins() to return an  array of all supported interfaces.
  // public getAllCoinAPI(): WalletBase[]

  // maybe to rename to coin() so that when it is called it is just wallet.coin('btc')?
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
