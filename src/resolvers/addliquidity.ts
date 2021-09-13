import { ResolverBase, config } from 'src/common';
import { IToken, Immutables, State } from 'src/types/ILiquidity';
import { Context } from '../types/context';
import { ethers } from 'ethers';
import {
  nearestUsableTick,
  // NonfungiblePositionManager,
  Pool,
  Position,
} from '@uniswap/v3-sdk';
import {
  // Percent,
  Token,
  //CurrencyAmount
} from '@uniswap/sdk-core';
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
const { chainId, ethNodeUrl } = config;

class LiquidityResolver extends ResolverBase {
  poolAddress = async (
    parent: any,
    args: {
      token0: IToken;
      token1: IToken;
      fee: number;
    },
    { user, wallet }: Context,
  ) => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(ethNodeUrl);

      const token0 = new Token(
        chainId,
        args.token0.contractAddress,
        args.token0.decimalPlaces,
      );

      const token1 = new Token(
        chainId,
        args.token1.contractAddress,
        args.token1.decimalPlaces,
      );

      const poolAddress = Pool.getAddress(token0, token1, args.fee);

      const poolContract = new ethers.Contract(
        poolAddress,
        IUniswapV3PoolABI,
        provider,
      );

      const immutables: Immutables = {
        factory: await poolContract.factory(),
        token0: await poolContract.token0(),
        token1: await poolContract.token1(),
        fee: await poolContract.fee(),
        tickSpacing: await poolContract.tickSpacing(),
        maxLiquidityPerTick: await poolContract.maxLiquidityPerTick(),
      };

      const slot = await poolContract.slot0();
      const PoolState: State = {
        liquidity: await poolContract.liquidity(),
        sqrtPriceX96: slot[0],
        tick: slot[1],
        observationIndex: slot[2],
        observationCardinality: slot[3],
        observationCardinalityNext: slot[4],
        feeProtocol: slot[5],
        unlocked: slot[6],
      };

      const block = await provider.getBlock(provider.getBlockNumber());
      const deadline = block.timestamp + 200;

      const NEW_POOL = new Pool(
        token0,
        token1,
        immutables.fee,
        PoolState.sqrtPriceX96.toString(),
        PoolState.liquidity.toString(),
        PoolState.tick,
      );

      const liquidityNumber = Number(PoolState.liquidity);
      const portionLiqudity = liquidityNumber * 0.0002;

      const liquidityPosition = ethers.BigNumber.from(
        portionLiqudity.toString(),
      );

      const numberOfToken1 = Number(NEW_POOL.priceOf(token0).numerator);
      const numberOfToken2 = Number(NEW_POOL.priceOf(token1).numerator);
      const priceToken1 = numberOfToken1 / numberOfToken2;
      const priceToken2 = numberOfToken2 / numberOfToken1;

      const position = new Position({
        pool: NEW_POOL,
        liquidity: liquidityPosition.toString(),
        tickLower:
          nearestUsableTick(PoolState.tick, immutables.tickSpacing) -
          immutables.tickSpacing * 2,
        tickUpper:
          nearestUsableTick(PoolState.tick, immutables.tickSpacing) +
          immutables.tickSpacing * 2,
      });

      return {
        poolAddress: poolAddress,
        priceToken1,
        priceToken2,
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
