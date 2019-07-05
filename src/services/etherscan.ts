import axios from 'axios';
import config from '../common/config';
import { IEtherscanTx } from '../types';

class EthService {
  async getEthTransactions(accountAddress: string) {
    try {
      const transactionResponse: {
        data: { result: IEtherscanTx[] };
      } = await axios.get(config.etherscanUrl, {
        params: {
          module: 'account',
          action: 'txlist',
          address: accountAddress,
          apikey: config.etherScanApiKey,
        },
      });
      const {
        data: { result },
      } = transactionResponse;
      return result;
    } catch (error) {
      console.log(error);
    }
  }
}

export default new EthService();
