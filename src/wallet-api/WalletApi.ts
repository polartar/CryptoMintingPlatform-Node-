import {
  logger,
  config,
  symbolToWalletConfig,
  erc1155ContractConfig,
} from '../common';
import { CoinWalletBase, Erc1155Wallet } from './coin-wallets';

export class WalletApi {
  private symbolToInterface: Map<string, CoinWalletBase> = new Map();
  private parentWalletSymbols = ['BTC', 'ETH'];

  public allCoins: CoinWalletBase[];
  public parentInterfaces: CoinWalletBase[];

  public erc1155ItemInterface = new Erc1155Wallet(erc1155ContractConfig);

  constructor() {
    this.allCoins = this.mapWalletInterfaces(config.displayedWallets);
    this.parentInterfaces = this.mapWalletInterfaces(
      this.parentWalletSymbols.map(symbol => symbol.toLowerCase()),
    );
    this.mapSymbolsToInterfaces(this.allCoins);
  }

  private mapSymbolsToInterfaces = (walletInterfaces: CoinWalletBase[]) => {
    walletInterfaces.forEach(walletInterface => {
      this.symbolToInterface.set(
        walletInterface.symbol.toLowerCase(),
        walletInterface,
      );
    });
  };

  public coin = (symbol: string) => {
    try {
      logger.debug(`wallet-api.coin-wallet.WalletApi.coin.symbol: ${symbol}`);
      const walletInterface = this.symbolToInterface.get(symbol.toLowerCase());
      if (!walletInterface)
        throw new Error(`coinSymbol: ${symbol} not supported.`);
      return walletInterface;
    } catch (error) {
      logger.warn(`wallet-api.coin-wallet.WalletApi.coin.catch: ${error}`);
      throw error;
    }
  };

  private mapWalletInterfaces = (
    displayedWalletSymbols: string[],
  ): CoinWalletBase[] => {
    try {
      return displayedWalletSymbols.map(symbol => {
        const coinConfig = symbolToWalletConfig.get(symbol);
        if (!coinConfig) {
          throw new Error(`Wallet not configured for support: ${symbol}`);
        }
        const { WalletInterface } = coinConfig;
        return new WalletInterface(coinConfig);
      }) as CoinWalletBase[];
    } catch (error) {
      logger.warn(
        `wallet-api.coin-wallet.WalletApi.selectWalletInterface.catch: ${error}`,
      );
      throw error;
    }
  };
}

export const walletApi = new WalletApi();
