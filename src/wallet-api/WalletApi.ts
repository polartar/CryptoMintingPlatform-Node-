// import config from '../../common/config'
import { ICoinMetadata, eSupportedInterfaces } from '../types';
import { walletConfig } from '../common';
import {
  BtcWallet,
  EthWallet,
  Erc20Wallet,
  CoinWalletBase,
} from './coin-wallets';
import autoBind = require('auto-bind');

export default class WalletApi {
  public allCoins: CoinWalletBase[];
  private symbolToInterface: Map<string, CoinWalletBase> = new Map();

  constructor(hostName: string) {
    autoBind(this);
    const walletsForHost = this.selectWalletsFromHostName(hostName);
    const allCoins = walletConfig
      .filter(possible => {
        return walletsForHost.includes(possible.symbol);
      })
      .map(envConfig => {
        return this.selectWalletInterface(envConfig);
      });
    this.allCoins = allCoins;
    this.mapSymbolsToInterfaces(allCoins);
  }

  private mapSymbolsToInterfaces(walletApis: CoinWalletBase[]) {
    walletApis.forEach(walletApi => {
      this.symbolToInterface.set(walletApi.symbol.toLowerCase(), walletApi);
    });
  }

  // maybe to rename to coin() so that when it is called it is just wallet.coin('btc')?
  public coin(symbol: string) {
    const walletApi = this.symbolToInterface.get(symbol.toLowerCase());
    if (!walletApi) throw new Error(`coinSymbol: ${symbol} not supported.`);
    return walletApi;
  }

  private selectWalletInterface(
    coinWalletConfig: ICoinMetadata,
  ): CoinWalletBase {
    switch (coinWalletConfig.walletApi) {
      case eSupportedInterfaces.btc: {
        return new BtcWallet(coinWalletConfig);
      }
      case eSupportedInterfaces.eth: {
        return new EthWallet(coinWalletConfig);
      }
      case eSupportedInterfaces.erc20: {
        return new Erc20Wallet(coinWalletConfig);
      }
    }
  }

  private selectWalletsFromHostName(hostName: string) {
    const ARCADE = 'ARCADE';
    const GREEN = 'GREEN';
    const BTC = 'BTC';
    const ETH = 'ETH';

    if (hostName.includes('share.green')) {
      console.log('selected - GREEN')
      return [GREEN, BTC];
    } else if (hostName.includes('connectblockchain.net')) {
      console.log('selected - CONNECT')
      return [BTC, ETH];
    } else if (hostName.includes('codexunited.com')) {
      console.log('selected - CODEX')
      return [BTC, ETH];
    } else if (hostName.includes('arcadeblockchain.com')) {
      console.log('selected - ARCADE')
      return [BTC, ARCADE];
    } else if (hostName.includes('localhost')) {
      console.log('selected - LOCALHOST')
      return [BTC, ETH, GREEN, ARCADE];
    } else {
      throw new Error('Host not configured for wallet selection');
    }
  }
}
