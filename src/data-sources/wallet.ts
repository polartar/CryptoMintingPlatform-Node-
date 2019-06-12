import { DataSource } from 'apollo-datasource';
import { WalletBase, BtcWallet, EthWallet, Erc20Wallet } from '../interfaces';
import { UserInputError } from 'apollo-server-express';
const autoBind = require('auto-bind');
import { config } from '../common';
interface ISupportedCoinConfig {
  name: string;
  symbol: string;
  backgroundColor: string;
  icon: string;
  abi: any;
  contractAddress: string;
  decimalPlaces: number;
}
// This class is used as a common data source to select the appropriate interface given a token symbol sent as an argument in the GQL query.
export default class Wallet extends DataSource {
  // Each of the different interfaces will extend the abstract class WalletBase which will ensure that each interface implements the same methods, and returns the same data shape.
  private btc: WalletBase;
  private eth: WalletBase;
  private erc20s: WalletBase[] = [];

  constructor() {
    super();
    autoBind(this);
    config.supportedCoins.forEach(this.bootstrapInterfaces);
  }

  private bootstrapInterfaces(supportedCoinJson: ISupportedCoinConfig) {
    const {
      name,
      symbol,
      backgroundColor,
      icon,
      abi,
      contractAddress,
      decimalPlaces,
    } = supportedCoinJson;
    switch (supportedCoinJson.symbol.toLowerCase()) {
      case 'btc': {
        this.btc = new BtcWallet(
          name,
          symbol,
          contractAddress,
          abi,
          backgroundColor,
          icon,
        );
        break;
      }
      case 'eth': {
        this.eth = new EthWallet(
          name,
          symbol,
          contractAddress,
          abi,
          backgroundColor,
          icon,
        );
        break;
      }
      default: {
        this.erc20s.push(
          new Erc20Wallet(
            name,
            symbol,
            contractAddress,
            abi,
            backgroundColor,
            icon,
            decimalPlaces,
          ),
        );
      }
    }
  }

  public allCoins() {
    return [this.btc, this.eth, ...this.erc20s];
  }

  // maybe to rename to coin() so that when it is called it is just wallet.coin('btc')?
  public coin(symbol: string) {
    const lowerSymbol = symbol.toLowerCase();
    switch (lowerSymbol) {
      case 'btc': {
        return this.btc;
      }
      case 'eth': {
        return this.eth;
      }
      default: {
        // Hopefully if the previous two cases don't match the symbol, the token is ERC20 and you can return a new ERC20 interface configured with the contract address, token symbol, ABI, etc.
        const foundErc20 = this.erc20s.find(
          token => token.symbol.toLowerCase() === lowerSymbol,
        );
        if (!foundErc20) {
          throw new UserInputError('Symbol not supported');
        }
        return foundErc20;
      }
    }
  }
}
