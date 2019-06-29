import { DataSource } from 'apollo-datasource';
import { WalletBase, BtcWallet, EthWallet, Erc20Wallet } from '../interfaces';
import { config } from '../common';
import { IExportedCoinInterfaceEnv } from '../types';
const autoBind = require('auto-bind');
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
  private symbolToInterface: Map<string, WalletBase> = new Map();
  private origin: string;

  constructor(origin: string) {
    super();
    autoBind(this);
    this.origin = origin;
    const metadata = this.getCoinMetadataForEnvironment();
    this.mapSymbolsToInterfaces(metadata);
  }

  private mapSymbolsToInterfaces(metadata: IExportedCoinInterfaceEnv) {
    this.symbolToInterface.set('btc', new BtcWallet(metadata.btc));
    this.symbolToInterface.set('eth', new EthWallet(metadata.eth));
    metadata.erc20s.forEach(erc20 => {
      this.symbolToInterface.set(
        erc20.symbol.toLowerCase(),
        new Erc20Wallet(erc20),
      );
    });
  }

  private getCoinMetadataForEnvironment() {
    const { supportedOrigins, supportedCoins } = config;

    for (const url of Object.values(supportedOrigins.dev)) {
      if (url === this.origin) return supportedCoins.dev;
    }
    for (const url of Object.values(supportedOrigins.prod)) {
      if (url === this.origin) return supportedCoins.prod;
    }
    throw new Error('Could not map origin to supportedCoins interface.');
  }

  public getWalletsToDisplay() {
    if (this.origin.includes('share.green')) return ['btc', 'green'];
    if (this.origin.includes('connectblockchain.net'))
      return ['btc', 'eth', 'green', 'arcade'];
    if (this.origin.includes('codexunited.com')) return ['btc', 'eth', 'green'];
    if (this.origin.includes('localhost'))
      return ['btc', 'eth', 'green', 'arcade'];
  }

  public allCoins() {
    const walletsForDomain = this.getWalletsToDisplay();
    return walletsForDomain.map(symbol => this.symbolToInterface.get(symbol));
  }

  // maybe to rename to coin() so that when it is called it is just wallet.coin('btc')?
  public coin(symbol: string) {
    const lowerSymbol = symbol.toLowerCase();
    return this.symbolToInterface.get(lowerSymbol);
  }
}
