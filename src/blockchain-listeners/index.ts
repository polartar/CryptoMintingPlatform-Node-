import btcListener from './btc';

export const removeListeners = async (userId: string) => {
  await Promise.all([btcListener.removeListeners(userId)]);
};

export default {
  BTC: btcListener,
};
