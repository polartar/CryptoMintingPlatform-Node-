import { providers, Wallet, Contract, utils } from 'ethers';
import { config as appConfig } from '../common';
import env from './script-config';
import abi = require('../common/ABI/erc1155.json');
import { nodeSelector } from '../services';

const { bigNumberify, parseUnits } = utils;

void (async () => {
  const tokenId = bigNumberify('0x0100000000000000000000000000000000');
  const addressAmounts = [
    {
      address: '',
      amount: '10000000',
    },
  ];
  const amounts = addressAmounts.map(({ amount }) => parseUnits(amount, 8));
  const addresses = addressAmounts.map(({ address }) => address);

  const provider = new providers.JsonRpcProvider(appConfig.ethNodeUrl);
  const wallet = Wallet.fromMnemonic(env.MNEMONIC).connect(provider);
  const contract = new Contract(env.GALA_ADDRESS, abi, wallet);
  const { hash, wait } = await contract.mintFungible(
    tokenId,
    addresses,
    amounts,
  );
  console.log(hash);
  const txReceipt = await wait(1);
  console.log(txReceipt);
})();
