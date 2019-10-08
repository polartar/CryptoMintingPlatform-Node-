import { CoinSymbol } from '../types';

class BaseListener {
  public coinSymbol: CoinSymbol;

  listenForNewTransaction: (walletId: string) => Promise<any>;
  removeListeners: (walletId: string) => Promise<void>;
}

export default BaseListener;
