import UNISWAP = require('@uniswap/sdk');
import { ITradeToken } from '../types';
import { ServerToServerService } from './server-to-server';
import ethers = require('ethers');

const ETHEREUM_NODE_URL = '';
const CONTRACT_ADDRESS = '';

class StartSwap extends ServerToServerService {
  public uniswapSwap = async (
    inputToken: ITradeToken[],
    outputToken: ITradeToken[],
    amount: string,
    toAddress: string,
    encryptedKey: any,
  ) => {
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

    const pair = await UNISWAP.Fetcher.fetchPairData(
      OutToken,
      InToken,
      //this.provider
    );

    const route = new UNISWAP.Route([pair], InToken);
    const trade = new UNISWAP.Trade(
      route,
      new UNISWAP.TokenAmount(InToken, amount),
      UNISWAP.TradeType.EXACT_INPUT,
    );
    const slippageTolerance = new UNISWAP.Percent('50', '10000'); //Bits => 0.050%
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
    const path = [InToken.address, OutToken];
    const to = toAddress;
    const deadLine = Math.floor(Date.now() / 1000 / 60) + 60;
    const value = trade.inputAmount.raw;
    console.log(
      'Mid Price inputToken --> outputToken:',
      route.midPrice.toSignificant(6),
    );
    console.log(
      'Mid Price outputToken --> inputToken:',
      route.midPrice.invert().toSignificant(6),
    );

    const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_NODE_URL);
    const signer = new ethers.Wallet(encryptedKey, provider);
    const account = signer.connect(provider);
    const uniswap = new ethers.Contract(
      CONTRACT_ADDRESS,
      [
        'function swapTokensForExactTokens( uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      ],
      account,
    );
    const tx = await uniswap.sendExactETHForTokens(
      amountOutMin,
      path,
      to,
      deadLine,
      { value, gasPrice: 20e9 },
    );
    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction has been mint in block ${receipt.blocknumber}`);
    return { message: 'Success' };
  };
}

export const startSwap = new StartSwap();
