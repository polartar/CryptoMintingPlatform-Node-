import { config } from '../';
import { systemLogger } from './';

class LogMessage {
  public logConfigAtStartup = () => {
    [
      ['ETH_NODE', config.ethNodeUrl],
      ['DISPLAYED_WALLETS', config.displayedWallets.join(',')],
      ['INDEXED_TRANSACTIONS', config.indexedTransactions],
      ['LINK_SHORTENER_URL', config.linkShortenerUrl],
    ].forEach(([label, value]) => {
      systemLogger.info(`CONFIG: ${label}=${value}`);
    });
  };
}

const logMessage = new LogMessage();
export default logMessage;
