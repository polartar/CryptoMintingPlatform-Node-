import { WalletClient } from 'bclient';
import * as autoBind from 'auto-bind';
import BaseListener from './base';
import { config } from '../common';
import WalletApi from '../wallet-api/WalletApi';
import BtcWalletApi from '../wallet-api/coin-wallets/btc-wallet';
import { IBcoinTx, CoinSymbol } from '../types';

class BtcBlockchainListener implements BaseListener {
  private walletClient = new WalletClient(config.bcoinWallet);
  private openPromise = this.walletClient.open();
  private walletApi = new WalletApi(config.hostname);
  private btcWalletApi = this.walletApi.coin('BTC') as BtcWalletApi;
  public coinSymbol = CoinSymbol.btc;

  constructor() {
    autoBind(this);
  }

  public async listenForNewTransaction(walletId: string) {
    const token = await this.btcWalletApi.getToken(walletId);
    if (!token) return;

    await this.openPromise;
    await this.walletClient.join(walletId, token);

    this.walletClient.bind('tx', async (wallet, tx) => {
      const [formattedTx] = this.btcWalletApi.formatTransactions([
        (tx as unknown) as IBcoinTx,
      ]);

      config.pubsub.publish(config.newTransaction, {
        walletId,
        coinSymbol: this.coinSymbol,
        ...formattedTx,
      });
    });
  }

  public async removeListeners(walletId: string) {
    await this.walletClient.leave(walletId);
  }
}

export default new BtcBlockchainListener();
