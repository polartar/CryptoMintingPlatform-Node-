import axios from 'axios';
import config from '../common/config';

interface ITxResult {
  to: string;
  value: number;
  timeStamp: number;
}

class EthService {
  async getEthTransactions(accountAddress: string) {
    const response: { data: { result: ITxResult[] } } = await axios.get(
      config.ethNodeUrl,
      {
        params: {
          module: 'account',
          action: 'txlist',
          address: accountAddress,
          startblock: '0',
          endblock: '99999999',
          sort: 'asc',
          apiket: '8D4AD9TBBK8VHIHJ78WJBWSBYNV83AHMNC',
        },
      },
    );

    return response.data.result
      .filter(tx => {
        // only return transactions sent to the proved account address
        return tx.to.toUpperCase() === accountAddress.toUpperCase();
      })
      .map(tx => {
        return {
          amount: tx.value * Math.pow(10, 18 * -1),
          timestamp: tx.timeStamp,
          type: 'deposit',
        };
      });
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
