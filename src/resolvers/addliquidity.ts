import { ResolverBase, config, logger } from 'src/common';
import { Immutables, State } from 'src/types/ILiquidity';
import { Context } from '../types/context';
import { ethers } from 'ethers';
import {
  nearestUsableTick,
  NonfungiblePositionManager,
  Pool,
  Position,
} from '@uniswap/v3-sdk';
import {
  Percent,
  Token,
  //CurrencyAmount
} from '@uniswap/sdk-core';
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { UniswapPair } from 'simple-uniswap-sdk';
import EthWallet from '../wallet-api/coin-wallets/eth-wallet';

const { chainId, ethNodeUrl } = config;

class LiquidityResolver extends ResolverBase {
  poolAddress = async (
    parent: any,
    args: {
      token0: string;
      token1: string;
      fee: number;
      amountToken1: string;
      amountToken2: string;
      walletPassword: string;
      initialPrice: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const walletApi = wallet.coin('ETH') as EthWallet;
    const { receiveAddress } = await walletApi.getWalletInfo(user);
    try {
      const uniswapPair = new UniswapPair({
        fromTokenContractAddress: args.token0,
        toTokenContractAddress: args.token1,
        ethereumAddress: receiveAddress,
        chainId: chainId,
      });

      const uniswapPairFactory = await uniswapPair.createFactory();
      const trade = await uniswapPairFactory.trade('1');

      const provider = new ethers.providers.JsonRpcProvider(ethNodeUrl);

      const tokenFrom = trade.fromToken;
      const tokenTo = trade.toToken;

      const token0 = new Token(
        chainId,
        tokenFrom.contractAddress,
        tokenFrom.decimals,
      );

      const token1 = new Token(
        chainId,
        tokenTo.contractAddress,
        tokenTo.decimals,
      );

      const poolAddress = Pool.getAddress(token0, token1, args.fee);

      const poolContract = new ethers.Contract(
        poolAddress,
        IUniswapV3PoolABI,
        provider,
      );

      // const immutables: Immutables = {
      //   factory: await poolContract.factory(),
      //   token0: await poolContract.token0(),
      //   token1: await poolContract.token1(),
      //   fee: await poolContract.fee(),
      //   tickSpacing: await poolContract.tickSpacing(),
      //   maxLiquidityPerTick: await poolContract.maxLiquidityPerTick(),
      // };

      // const slot = await poolContract.slot0();
      // const PoolState: State = {
      //   liquidity: await poolContract.liquidity(),
      //   sqrtPriceX96: slot[0],
      //   tick: slot[1],
      //   observationIndex: slot[2],
      //   observationCardinality: slot[3],
      //   observationCardinalityNext: slot[4],
      //   feeProtocol: slot[5],
      //   unlocked: slot[6],
      // };

      const block = await provider.getBlock(provider.getBlockNumber());

      // const NEW_POOL = new Pool(
      //   token0,
      //   token1,
      //   immutables.fee,
      //   PoolState.sqrtPriceX96.toString(),
      //   PoolState.liquidity.toString(),
      //   PoolState.tick,
      // );

      // const liquidityNumber = Number(PoolState.liquidity);
      // const portionLiqudity = liquidityNumber * 0.0002;

      // const price0 = NEW_POOL.priceOf(token0)
      //   .toFixed(token0.decimals, NEW_POOL.priceOf(token0).scalar)
      //   .toString();
      // const price1 = NEW_POOL.priceOf(token1)
      //   .toFixed(token1.decimals, NEW_POOL.priceOf(token1).scalar)
      //   .toString();

      // const position = new Position({
      //   pool: NEW_POOL,
      //   liquidity: liquidityNumber.toString(),
      //   tickLower:
      //     nearestUsableTick(PoolState.tick, immutables.tickSpacing) -
      //     immutables.tickSpacing * 2,
      //   tickUpper:
      //     nearestUsableTick(PoolState.tick, immutables.tickSpacing) +
      //     immutables.tickSpacing * 2,
      // });
      const deadline = block.timestamp + 200;

      let passwordDecripted;
      try {
        const encryptedKey = await walletApi.getEncryptedPrivKey(user.userId);
        const decryptedPrivateKey = this.decrypt(
          encryptedKey,
          args.walletPassword,
        );
        const { decryptedString } = decryptedPrivateKey;
        passwordDecripted = decryptedString;
      } catch (e) {
        logger.warn('EncryptedKey no return instead we reach a 401 status' + e);
      }

      const ethersWallet = new ethers.Wallet(passwordDecripted);
      const account = ethersWallet.connect(provider);

      const tokenA = token0.address;
      // let abi = ["function approve(address _spender, uint256 _value) public returns (bool success)"]
      // let contract = new ethers.Contract(tokenAddress, abi, provider)
      // await contract.approve(accountAddress, amount)

      const tokenB = token1.address;
      // let abi = ["function approve(address _spender, uint256 _value) public returns (bool success)"]
      // let contract = new ethers.Contract(tokenAddress, abi, provider)
      // await contract.approve(accountAddress, amount)

      const amountADesired = args.amountToken1;
      const amountBDesired = args.amountToken2;
      const amountAMin = 0;
      const amountBMin = 0;
      const to = receiveAddress;

      const addLiquidity = new ethers.Contract(
        '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        [
          'function addLiquidity(  address tokenA,  address tokenB,  uint amountADesired,  uint amountBDesired,  uint amountAMin,  uint amountBMin,  address to,  uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
        ],
        account,
      );

      const tx = await addLiquidity.addLiquidity(
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        to,
        deadline,
      );

      const receipt = await tx.wait();

      return {
        poolAddress: poolAddress,
        // price0,
        // price1,
      };
    } catch (error) {
      throw new Error('Resolver.LiquidityResolver.poolAddress ' + error);
    }
  };

  addLiquidity = async (
    parent: any,
    args: {
      startingPrice: string;
      minPrice: string;
      maxPrice: string;
      amountToken1: string;
      amountToken2: string;
      walletPassword: string;
    },
    { user, wallet }: Context,
  ) => {
    try {
      return {
        message: 'Success',
      };
    } catch (error) {
      throw new Error('Resolver.LiquidityResolver.addliquidity ' + error);
    }
  };
}

export const liquidityResolver = new LiquidityResolver();

export default {
  Mutation: {
    createPosition: liquidityResolver.poolAddress,
    addLiquidity: liquidityResolver.addLiquidity,
  },
};
