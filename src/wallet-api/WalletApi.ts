// import config from '../../common/config'
import { ICoinMetadata, eSupportedInterfaces } from '../types';
import { walletConfig } from '../common/wallet-config'
import defaults from '../common/wallet-config/defaults';
import { BtcWallet, EthWallet, Erc20Wallet, CoinWalletBase } from './coin-wallets';
import autoBind = require('auto-bind');


export default class WalletApi {
  public allCoins: CoinWalletBase[];
  private symbolToInterface: Map<string, CoinWalletBase> = new Map();

  constructor(hostName: string, isDev: boolean) {
    autoBind(this);
    const environment = isDev ? 'dev' : 'prod';
    const walletsForHost = this.selectWalletsFromHostName(hostName);
    const allCoins = walletConfig
      .filter(possible => {
        return walletsForHost.includes(possible.symbol)
      })
      .map(envConfig => {
        return this.selectWalletInterface(envConfig.walletApi, envConfig[environment])
      });
    this.allCoins = allCoins;
    this.mapSymbolsToInterfaces(allCoins)
  }

  private mapSymbolsToInterfaces(walletApis: CoinWalletBase[]) {
    walletApis.forEach(walletApi => {
      this.symbolToInterface.set(walletApi.symbol.toLowerCase(), walletApi)
    })
  }

  // maybe to rename to coin() so that when it is called it is just wallet.coin('btc')?
  public coin(symbol: string) {
    return this.symbolToInterface.get(symbol.toLowerCase());
  }

  private selectWalletInterface(walletApi: string, coinConfig: ICoinMetadata): CoinWalletBase {
    switch (walletApi) {
      case eSupportedInterfaces.btc: {
        return new BtcWallet(coinConfig)
      };
      case eSupportedInterfaces.eth: {
        return new EthWallet(coinConfig)
      };
      case eSupportedInterfaces.erc20: {
        return new Erc20Wallet(coinConfig)
      }
    }
  }

  private selectWalletsFromHostName(hostName: string) {
    const {
      green: { symbol: GREEN },
      btc: { symbol: BTC },
      eth: { symbol: ETH },
      arcade: { symbol: ARCADE }
    } = defaults
    switch (hostName) {
      case 'share.green': {
        return [GREEN, BTC]
      };
      case 'connectblockchain.net': {
        return [BTC, ETH, GREEN, ARCADE]
      };
      case 'codexunited.com': {
        return [BTC, ETH, GREEN, ARCADE]
      };
      case 'arcade': {
        return [BTC, ARCADE]
      };
      case 'localhost': {
        return [BTC, ETH, GREEN, ARCADE]
      };
      default: {
        throw new Error('Host not configured for wallet selection')
      }
    }
  }
}
