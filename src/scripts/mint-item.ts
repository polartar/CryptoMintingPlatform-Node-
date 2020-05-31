import { providers, Wallet, Contract, utils } from 'ethers';
import env from './script-config';
import abi = require('../common/ABI/erc1155.json');
import { logger } from '../common';
const { bigNumberify } = utils;

const rewardWallet = new Wallet('');

const items = {
  betaKey: '0x8000000000000000000000000000001f00000000000000000000000000000000',
  alfaFountain: {
    ok: '0x8000000000000000000000000000002000000000000000000000000000000000',
    good: '0x8000000000000000000000000000002100000000000000000000000000000000',
    great: '0x8000000000000000000000000000002200000000000000000000000000000000',
    majestic:
      '0x8000000000000000000000000000002300000000000000000000000000000000',
  },
};
const { GALA_ADDRESS, MNEMONIC, ETH_NODE_URL } = env;
void (async () => {
  const mintConfigs = [
    {
      address: rewardWallet.address,
      quantity: 5,
      tokenId: items.alfaFountain.ok,
    },
    {
      address: rewardWallet.address,
      quantity: 5,
      tokenId: items.alfaFountain.good,
    },
    {
      address: rewardWallet.address,
      quantity: 5,
      tokenId: items.alfaFountain.great,
    },
    {
      address: rewardWallet.address,
      quantity: 5,
      tokenId: items.alfaFountain.majestic,
    },
  ].map(({ tokenId, quantity, address }) => ({
    tokenId: bigNumberify(tokenId),
    addresses: new Array(quantity).fill(address),
  }));

  const provider = new providers.JsonRpcProvider(ETH_NODE_URL);
  const MINTER = Wallet.fromMnemonic(MNEMONIC).connect(provider);
  const mintContract = new Contract(GALA_ADDRESS, abi, MINTER);
  for (const mintConfig of mintConfigs) {
    const { addresses, tokenId } = mintConfig;
    try {
      const { hash, wait } = await mintContract.mintNonFungible(
        tokenId,
        addresses,
        '0x0',
        {
          gasPrice: utils.parseUnits('23', 'gwei'),
        },
      );
      logger.info(hash);
      await wait(1);
    } catch (error) {
      logger.warn(error);
    }
  }
  logger.info('Done');
})();
