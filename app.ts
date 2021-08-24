import UNISWAP = require('@uniswap/sdk');

const chainId = UNISWAP.ChainId.MAINNET;
const decimals = 18;
const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

const DAI = new UNISWAP.Token(
  chainId,
  tokenAddress,
  decimals,
  'DAI',
  'Dai Stablecoin',
);

async function trade() {
  const pair = await UNISWAP.Fetcher.fetchPairData(DAI, UNISWAP.WETH[chainId]);
  const route = new UNISWAP.Route([pair], UNISWAP.WETH[chainId]);
  const trade = new UNISWAP.Trade(
    route,
    new UNISWAP.TokenAmount(UNISWAP.WETH[chainId], '1000000000000000000'),
    UNISWAP.TradeType.EXACT_INPUT,
  );

  const slippageTolerance = new UNISWAP.Percent('50', '10000'); //Bits => 0.050%
  const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
  const path = [UNISWAP.WETH[chainId].address, DAI.address];
  const to = '';
  const deadLine = Math.floor(Date.now() / 1000 / 60) + 60;
  const value = trade.inputAmount.raw;
  console.log(trade);
}
trade();
