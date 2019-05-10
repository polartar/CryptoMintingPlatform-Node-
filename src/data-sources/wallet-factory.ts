import Erc20Wallet from './erc20';
import BtcWallet from './btc';
import EthWallet from './eth';

class WalletFactory {
  createWallet(tokenName: string, tokenSymbol: string, contractId: string) {
    if (tokenSymbol === 'BTC') {
      return new BtcWallet();
    } else if (tokenSymbol === 'GREEN') {
      return new Erc20Wallet();
    } else if (tokenSymbol === 'ETH') {
      return new EthWallet(tokenName, tokenSymbol, contractId);
    }
  }
}

export const walletFactory = new WalletFactory();
