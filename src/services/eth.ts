import axios from 'axios';
import config from '../common/config';
import { IEtherscanTx } from '../types';

interface ITxResult {
  to: string;
  value: number;
  timeStamp: number;
}

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

  async getEthBalance(accountAddress: string) {
    let response;

    try {
      response = await axios.get(config.ethNodeUrl, {
        params: {
          module: 'account',
          action: 'balance',
          address: accountAddress,
          tag: 'latest',
          apiket: '8D4AD9TBBK8VHIHJ78WJBWSBYNV83AHMNC',
        },
      });
    } catch (err) {
      throw err;
    }

    return response.data.result * Math.pow(10, 18 * -1);
  }
}

export default new EthService();
