import UNISWAP = require('@uniswap/sdk');
import { ISwapToken } from '../types';
import { ServerToServerService } from './server-to-server';
import ethers = require('ethers');
import { WETH } from '@uniswap/sdk';

const ETHEREUM_NODE_URL = '';
const CONTRACT_ADDRESS = '';
const chainId = UNISWAP.ChainId.MAINNET;

class StartSwap extends ServerToServerService {
  public uniswapSwap = async (
    inputToken: ISwapToken[],
    outputToken: ISwapToken[],
    amount: string,
    toAddress: string,
    decryptedKey: any,
  ) => {
    try {
      const InToken = new UNISWAP.Token(
        inputToken[0].chainId,
        inputToken[0].address,
        inputToken[0].decimals,
        inputToken[0].symbol,
        inputToken[0].name,
      );

      const OutToken = new UNISWAP.Token(
        outputToken[0].chainId,
        outputToken[0].address,
        outputToken[0].decimals,
        outputToken[0].symbol,
        outputToken[0].name,
      );

      const pair = await UNISWAP.Fetcher.fetchPairData(OutToken, InToken);

      const route = new UNISWAP.Route([pair], InToken);
      const trade = new UNISWAP.Trade(
        route,
        new UNISWAP.TokenAmount(InToken, amount),
        UNISWAP.TradeType.EXACT_INPUT,
      );
      const slippageTolerance = new UNISWAP.Percent('50', '10000'); //Bits => 0.050%
      const amountOutMin = ethers.BigNumber.from(
        trade.minimumAmountOut(slippageTolerance).raw.toString(),
      );
      const amountIn = ethers.BigNumber.from(trade.inputAmount.raw.toString());
      const path = [InToken.address, OutToken];
      const to = toAddress;
      const deadLine = Math.floor(Date.now() / 1000 / 60) + 60;

      //   console.log(
      //     'Mid Price inputToken --> outputToken:',
      //     route.midPrice.toSignificant(6),
      //   );
      //   console.log(
      //     'Mid Price outputToken --> inputToken:',
      //     route.midPrice.invert().toSignificant(6),
      //   );

      const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_NODE_URL);
      const signer = new ethers.Wallet(decryptedKey, provider);
      const account = signer.connect(provider);
      const uniswap = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
          'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
          'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        ],
        account,
      );
      let tx;
      if (inputToken[0].address === WETH[chainId].address) {
        console.log(`Swap exact ETH for tokens`);
        tx = await uniswap.swapExactETHForTokens(
          amountOutMin,
          path,
          to,
          deadLine,
          { value: amountIn },
        );
      } else if (outputToken[0].address === WETH[chainId].address) {
        console.log(`Swap exact tokens for ETH`);
        tx = await uniswap.swapExactTokensForETH(
          amountIn,
          amountOutMin,
          path,
          to,
          deadLine,
        );
      } else {
        console.log(`Swap exact tokens for tokens`);
        tx = await uniswap.swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          path,
          to,
          deadLine,
        );
      }
      console.log(`Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Transaction has been mint in block ${receipt.blocknumber}`);
      return { message: 'Success' };
    } catch (error) {
      throw new Error(error);
    }
  };
}

export const startSwap = new StartSwap();
