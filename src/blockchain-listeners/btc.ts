import { WalletClient } from 'bclient';
import * as autoBind from 'auto-bind';
import BaseListener from './base';
import { config, logger } from '../common';
import WalletApi from '../wallet-api/WalletApi';
import BtcWalletApi from '../wallet-api/coin-wallets/btc-wallet';
import { IBcoinTx, CoinSymbol, ITransaction } from '../types';

class BtcBlockchainListener implements BaseListener {
  private walletClient = new WalletClient(config.bcoinWallet);
  private openPromise = this.walletClient.open();
  private walletApi = new WalletApi(config.hostname);
  private btcWalletApi = this.walletApi.coin('BTC') as BtcWalletApi;
  public coinSymbol = CoinSymbol.btc;

  constructor() {
    autoBind(this);
  }

  private async getAndFormatTransactionAndBalance(
    tx: IBcoinTx,
    walletId: string,
  ) {
    const [formattedTx] = this.btcWalletApi.formatTransactions([tx]);
    logger.debug(
      `blockchain-listeners.btc.listenForNewTransaction.walletClient.bind(tx).formattedTx: ${JSON.stringify(
        formattedTx,
      )}`,
    );
    const balance = await this.btcWalletApi.getBalance(walletId);
    return {
      formattedTx,
      balance,
    };
  }

  publishNewTx(
    walletId: string,
    balance: { confirmed: string; unconfirmed: string },
    formattedTx: ITransaction,
  ) {
    const payload = {
      walletId,
      balance,
      coinSymbol: this.coinSymbol,
      ...formattedTx,
    };
    logger.debug(
      `blockchain-listeners.btc.publishNewTx: ${JSON.stringify(payload)}`,
    );
    config.pubsub.publish(config.newTransaction, payload);
  }

  public async listenForNewTransaction(walletId: string) {
    logger.debug(
      `blockchain-listeners.btc.listenForNewTransaction.walletId: ${walletId}`,
    );
    const token = await this.btcWalletApi.getToken(walletId);
    logger.debug(
      `blockchain-listeners.btc.listenForNewTransaction.token.length: ${
        token ? token.length : 0
      }`,
    );
    if (!token) return;

    await this.openPromise;
    await this.walletClient.join(walletId, token);

    this.walletClient.bind('confirmed', async (wallet, tx) => {
      logger.debug(
        `blockchain-listeners.btc.listenForNewTransaction.walletClient.bind(confirmed).wallet: ${wallet}`,
      );
      logger.debug(
        `blockchain-listeners.btc.listenForNewTransaction.walletClient.bind(confirmed).tx.hash: ${
          tx.hash
        }`,
      );
      logger.debug(
        `blockchain-listeners.btc.listenForNewTransaction.walletClient.bind(confirmed).tx.confirmations: ${
          tx.confirmations
        }`,
      );
      if (tx.confirmations <= 3) {
        const {
          balance,
          formattedTx,
        } = await this.getAndFormatTransactionAndBalance(
          (tx as unknown) as IBcoinTx,
          wallet,
        );
        this.publishNewTx(walletId, balance, formattedTx);
      }
    });

    this.walletClient.bind('tx', async (wallet, tx) => {
      logger.debug(
        `blockchain-listeners.btc.listenForNewTransaction.walletClient.bind(tx).wallet: ${wallet}`,
      );
      logger.debug(
        `blockchain-listeners.btc.listenForNewTransaction.walletClient.bind(tx).tx.hash: ${
          tx.hash
        }`,
      );
      const {
        balance,
        formattedTx,
      } = await this.getAndFormatTransactionAndBalance(
        (tx as unknown) as IBcoinTx,
        wallet,
      );
      this.publishNewTx(walletId, balance, formattedTx);
    });
  }

  public async removeListeners(walletId: string) {
    if (walletId) await this.walletClient.leave(walletId);
  }
}

export default new BtcBlockchainListener();
