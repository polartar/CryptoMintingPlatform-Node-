import { WalletClient } from 'bclient';
import * as autoBind from 'auto-bind';
import BaseListener from './base';
import { config, logger } from '../common';
import WalletApi from '../wallet-api/WalletApi';
import BtcWalletApi from '../wallet-api/coin-wallets/btc-wallet';
import { CoinSymbol } from '../types';

class BtcBlockchainListener implements BaseListener {
  private walletClient = new WalletClient(config.bcoinWallet);
  private openPromise = this.walletClient.open();
  private walletApi = new WalletApi(config.hostname);
  private btcWalletApi = this.walletApi.coin('BTC') as BtcWalletApi;
  public coinSymbol = CoinSymbol.btc;

  constructor() {
    autoBind(this);
  }

  publishNewBalance(walletId: string) {
    const payload = {
      walletId,
    };
    config.pubsub.publish(config.newBalance, payload);
  }

  public async listenForNewBalance(walletId: string) {
    logger.debug(
      `blockchain-listeners.btc.listenForNewBalance.walletId: ${walletId}`,
    );
    const token = await this.btcWalletApi.getToken(walletId);
    logger.debug(
      `blockchain-listeners.btc.listenForNewBalance.token.length: ${
        token ? token.length : 0
      }`,
    );
    if (!token) return;

    await this.openPromise;
    await this.walletClient.join(walletId, token);

    this.walletClient.bind('balance', async wallet => {
      this.publishNewBalance(wallet);
    });
  }

  public async removeListeners(walletId: string) {
    if (walletId) await this.walletClient.leave(walletId);
  }
}

export default new BtcBlockchainListener();
