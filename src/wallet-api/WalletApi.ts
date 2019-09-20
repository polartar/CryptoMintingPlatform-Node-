// import config from '../../common/config'
import { ICoinMetadata, eSupportedInterfaces } from '../types';
import { walletConfig, logger } from '../common';
import {
  BtcWallet,
  EthWallet,
  Erc20Wallet,
  DocWallet,
  CoinWalletBase,
} from './coin-wallets';
const autoBind = require('auto-bind');

export default class WalletApi {
  private symbolToInterface: Map<string, CoinWalletBase> = new Map();
  private parentWalletSymbols = ['BTC', 'ETH'];

  public allCoins: CoinWalletBase[];
  public parentInterfaces: CoinWalletBase[];

  constructor(hostName: string) {
    autoBind(this);
    const walletsForHost = this.selectWalletsFromHostName(hostName);
    const allCoins = this.mapInterfacesByFilter(walletsForHost);
    this.parentInterfaces = this.mapInterfacesByFilter(
      this.parentWalletSymbols,
    );
    this.allCoins = allCoins;
    this.mapSymbolsToInterfaces(allCoins);
  }

  private mapInterfacesByFilter(symbols: string[]) {
    return walletConfig
      .filter(possible => {
        return symbols.includes(possible.symbol);
      })
      .map(envConfig => {
        return this.selectWalletInterface(envConfig);
      });
  }

  private mapSymbolsToInterfaces(walletApis: CoinWalletBase[]) {
    walletApis.forEach(walletApi => {
      this.symbolToInterface.set(walletApi.symbol.toLowerCase(), walletApi);
    });
  }

  public coin(symbol: string) {
    try {
      logger.debug(`wallet-api.coin-wallet.WalletApi.coin.symbol: ${symbol}`);
      const walletApi = this.symbolToInterface.get(symbol.toLowerCase());
      if (!walletApi) throw new Error(`coinSymbol: ${symbol} not supported.`);
      return walletApi;
    } catch (error) {
      logger.warn(`wallet-api.coin-wallet.WalletApi.coin.catch: ${error}`);
      throw error;
    }
  }

  private selectWalletInterface(
    coinWalletConfig: ICoinMetadata,
  ): CoinWalletBase {
    try {
      switch (coinWalletConfig.walletApi) {
        case eSupportedInterfaces.btc: {
          logger.debug(
            `wallet-api.coin-wallet.WalletApi.selectWalletInterface: ${
              coinWalletConfig.walletApi
            } => BTC`,
          );
          return new BtcWallet(coinWalletConfig);
        }
        case eSupportedInterfaces.eth: {
          logger.debug(
            `wallet-api.coin-wallet.WalletApi.selectWalletInterface: ${
              coinWalletConfig.walletApi
            } => ETH`,
          );
          return new EthWallet(coinWalletConfig);
        }
        case eSupportedInterfaces.erc20: {
          logger.debug(
            `wallet-api.coin-wallet.WalletApi.selectWalletInterface: ${
              coinWalletConfig.walletApi
            } => ERC20`,
          );
          return new Erc20Wallet(coinWalletConfig);
        }
        case eSupportedInterfaces.doc: {
          logger.debug(
            `wallet-api.coin-wallet.WalletApi.selectWalletInterface: ${
              coinWalletConfig.walletApi
            } => Doc`,
          );
          return new DocWallet(coinWalletConfig);
        }
        default: {
          throw new Error(`Interface not supported`);
        }
      }
    } catch (error) {
      logger.warn(
        `wallet-api.coin-wallet.WalletApi.selectWalletInterface.catch: ${error}`,
      );
      throw error;
    }
  }

  private selectWalletsFromHostName(hostName: string) {
    const ARCADE = 'ARCADE';
    const GREEN = 'GREEN';
    const BTC = 'BTC';
    const ETH = 'ETH';
    const WinX = 'WinX';

    if (hostName.includes('share.green')) {
      logger.debug(
        `wallet-api.coin-wallet.WalletApi.selectWalletsFromHostName: GREEN`,
      );
      return [GREEN, BTC, ETH];
    } else if (hostName.includes('connectblockchain.net')) {
      logger.debug(
        `wallet-api.coin-wallet.WalletApi.selectWalletsFromHostName: CONNECT`,
      );
      return [BTC, ETH];
    } else if (hostName.includes('codexunited.com')) {
      logger.debug(
        `wallet-api.coin-wallet.WalletApi.selectWalletsFromHostName: CODEX`,
      );
      return [BTC, ETH];
    } else if (hostName.includes('arcadeblockchain.com')) {
      logger.debug(
        `wallet-api.coin-wallet.WalletApi.selectWalletsFromHostName: ARCADE`,
      );
      return [ARCADE, BTC, ETH];
    } else if (hostName.includes('localhost')) {
      logger.debug(
        `wallet-api.coin-wallet.WalletApi.selectWalletsFromHostName: LOCALHOST`,
      );
      return [BTC, ETH, GREEN, ARCADE, WinX];
    } else {
      logger.warn(
        `wallet-api.coin-wallet.WalletApi.selectWalletsFromHostName: NONE MATCHED`,
      );
      throw new Error('Host not configured for wallet selection');
    }
  }
}
