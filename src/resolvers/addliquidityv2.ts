import { ResolverBase, config, logger } from 'src/common';
import { Context } from '../types/context';
import { ethers, BigNumber } from 'ethers';
import Erc20API from 'src/wallet-api/coin-wallets/erc20-wallet';
import {
  //Percent,
  Token,
  //CurrencyAmount
} from '@uniswap/sdk-core';

import { abi as IUniswapV2FactoryABI } from '@uniswap/v2-core/build/IUniswapV2Factory.json';
import { abi as IUniswapV2ERC20ABI } from '@uniswap/v2-core/build/UniswapV2ERC20.json';
import * as IUniswapV2Router from 'simple-uniswap-sdk/dist/esm/ABI/uniswap-router-v2.json';
import { abi as IUniswapV2Pair } from '@uniswap/v2-core/build/UniswapV2Pair.json';

const { chainId, ethNodeUrl } = config;
const provider = new ethers.providers.JsonRpcProvider(ethNodeUrl);

class LiquidityResolverV2 extends ResolverBase {
  createPair = async (
    parent: any,
    args: {
      walletPassword: string;
      coinSymbol0: string;
      coinSymbol1: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const inputToken = wallet.coin(args.coinSymbol0) as Erc20API;
    const token0 = inputToken.contractAddress;
    const outputToken = wallet.coin(args.coinSymbol1) as Erc20API;
    const token1 = outputToken.contractAddress;
    const { receiveAddress } = await inputToken.getWalletInfo(user);

    const validPassword = await inputToken.checkPassword(
      user,
      args.walletPassword,
    );

    if (!validPassword) {
      return {
        message: 'Invalid Password',
        pairAddress: "Pair couldn't be created.",
      };
    }

    let passwordDecripted;
    try {
      const encryptedKey = await inputToken.getEncryptedPrivKey(user.userId);
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
    const signer = ethersWallet.connect(provider);

    //Factory Contract

    const factoryContract = new ethers.Contract(
      '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      IUniswapV2FactoryABI,
      signer,
    );

    try {
      const pairAddress = await factoryContract.createPair(token0, token1);
      const txPairAddress = await pairAddress.wait();
      return {
        message: 'Pair created',
        pairAddress,
      };
    } catch (error) {
      logger.warn(
        'Resolvers.LiquidityResolverV2.createPair.errorMessage ' +
          error.message,
      );
      try {
        const pairAddress = await factoryContract.getPair(token0, token1);
        return {
          message: 'Pair is already created',
          pairAddress: pairAddress,
        };
      } catch (error) {
        return {
          message: error.message,
          pairAddress: "Pair couldn't be created.",
        };
      }
    }
  };

  approveTokens = async (
    parent: any,
    args: {
      walletPassword: string;
      coinSymbol0: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const inputToken = wallet.coin(args.coinSymbol0) as Erc20API;
    const token0 = inputToken.contractAddress;
    const { receiveAddress } = await inputToken.getWalletInfo(user);

    const validPassword = await inputToken.checkPassword(
      user,
      args.walletPassword,
    );

    if (!validPassword) {
      return {
        message: 'Invalid Password',
        created: false,
      };
    }

    let passwordDecripted;
    try {
      const encryptedKey = await inputToken.getEncryptedPrivKey(user.userId);
      const decryptedPrivateKey = this.decrypt(
        encryptedKey,
        args.walletPassword,
      );
      const { decryptedString } = decryptedPrivateKey;
      passwordDecripted = decryptedString;
    } catch (e) {
      logger.warn('EncryptedKey no return instead we reach a 401 status' + e);
    }

    const ethersWallet = new ethers.Wallet(passwordDecripted, provider);
    const approveContract = new ethers.Contract(
      token0,
      IUniswapV2ERC20ABI,
      provider,
    );

    const contract = approveContract.connect(ethersWallet);

    try {
      const maxInt = BigNumber.from('2').pow(
        BigNumber.from('256').sub(BigNumber.from('1')),
      );
      const approval = await approveContract.allowance(
        receiveAddress,
        '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      );
      const [gasPrice] = await Promise.all([provider.getGasPrice()]);
      if (approval < maxInt) {
        const approve = await contract.approve(
          '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
          maxInt,
          { gasLimit: 250000, gasPrice: gasPrice },
        );
        const txApprove = await approve.wait();
        return {
          message: 'Token approve',
          created: true,
        };
      } else {
        return {
          message: 'This token is already approve',
          created: true,
        };
      }
    } catch (error) {
      logger.warn(
        'Resolvers.LiquidityResolverV2.approveToken.errorMessage ' +
          error.message,
      );
    }
  };

  addLiquidityV2 = async (
    parent: any,
    args: {
      coinSymbol0: string;
      coinSymbol1: string;
      amountADesired: number;
      amountBDesired: number;
      walletPassword: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const inputToken = wallet.coin(args.coinSymbol0) as Erc20API;
    const token0 = inputToken.contractAddress;
    const decimals0 = inputToken.decimalPlaces;
    const outputToken = wallet.coin(args.coinSymbol1) as Erc20API;
    const token1 = outputToken.contractAddress;
    const decimals1 = outputToken.decimalPlaces;
    const { receiveAddress } = await inputToken.getWalletInfo(user);

    const validPassword = await inputToken.checkPassword(
      user,
      args.walletPassword,
    );

    if (!validPassword) {
      return {
        message: 'Invalid Password',
      };
    }

    let passwordDecripted;
    try {
      const encryptedKey = await inputToken.getEncryptedPrivKey(user.userId);
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
    const signer = ethersWallet.connect(provider);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const liquidityContract = new ethers.Contract(
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      IUniswapV2Router,
      signer,
    );

    try {
      const [gasPrice] = await Promise.all([provider.getGasPrice()]);
      const amountA = args.amountADesired.toFixed(decimals0).replace(/\./g, '');
      const amountB = args.amountBDesired.toFixed(decimals1).replace(/\./g, '');
      const addliquidity = await liquidityContract.addLiquidity(
        token0,
        token1,
        amountA,
        amountB,
        0,
        0,
        receiveAddress,
        deadline,
        { gasLimit: 250000, gasPrice: gasPrice },
      );
      const tx = await addliquidity.wait();
      return {
        message: 'Liquidity Added',
      };
    } catch (error) {
      logger.warn(
        'Resolvers.LiquidityResolverV2.addLiquidity.errorMessage ' +
          error.message,
      );
      return {
        message: 'error',
      };
    }
  };

  getPairInfo = async (
    parent: any,
    args: {
      coinSymbol0: string;
      coinSymbol1: string;
      walletPassword: string;
    },
    ctx: Context,
  ) => {
    this.requireAuth(ctx.user);
    const inputToken = ctx.wallet.coin(args.coinSymbol0) as Erc20API;
    const token0 = inputToken.contractAddress;
    const decimals0 = inputToken.decimalPlaces;
    const outputToken = ctx.wallet.coin(args.coinSymbol1) as Erc20API;
    const token1 = outputToken.contractAddress;
    const decimals1 = outputToken.decimalPlaces;
    const { receiveAddress } = await inputToken.getWalletInfo(ctx.user);

    const validPassword = await inputToken.checkPassword(
      ctx.user,
      args.walletPassword,
    );

    if (!validPassword) {
      return {
        message: 'Invalid Password',
        reserve0: '',
        reserve1: '',
        liquidity: '',
      };
    }

    let passwordDecripted;
    try {
      const encryptedKey = await inputToken.getEncryptedPrivKey(
        ctx.user.userId,
      );
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
    const signer = ethersWallet.connect(provider);

    //Factory Contract

    const factoryContract = new ethers.Contract(
      '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      IUniswapV2FactoryABI,
      signer,
    );

    let pairAddress = await factoryContract.getPair(token0, token1);

    if (pairAddress === '0x0000000000000000000000000000000000000000') {
      const argsCreatePair = {
        walletPassword: args.walletPassword,
        coinSymbol0: args.coinSymbol0,
        coinSymbol1: args.coinSymbol1,
      };
      const res = await this.createPair(parent, argsCreatePair, ctx);
      pairAddress = res.pairAddress;
    }

    const pairContract = new ethers.Contract(
      pairAddress,
      IUniswapV2Pair,
      signer,
    );

    const { _reserve0, _reserve1 } = await pairContract.getReserves();

    const numbReserve0 = _reserve0.div(Math.pow(10, decimals0)).toString();
    const remindReserve0 = _reserve0.mod(Math.pow(10, decimals1)).toString();
    const reserve0 = numbReserve0 + '.' + remindReserve0;
    const numbReserve1 = _reserve1.div(Math.pow(10, decimals0)).toString();
    const remindReserve1 = _reserve1.mod(Math.pow(10, decimals1)).toString();
    const reserve1 = numbReserve1 + '.' + remindReserve1;

    const liquidityBigNumber = await pairContract.balanceOf(receiveAddress);
    let liquidity = liquidityBigNumber.toString();

    if (liquidity === '0') liquidity = '0.0';

    return {
      message: 'Success',
      reserve0,
      reserve1,
      liquidity,
    };
  };

  removeLiquidityV2 = async (
    parent: any,
    args: {
      coinSymbol0: string;
      coinSymbol1: string;
      walletPassword: string;
      percentage: number;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const inputToken = wallet.coin(args.coinSymbol0) as Erc20API;
    const token0 = inputToken.contractAddress;
    const outputToken = wallet.coin(args.coinSymbol1) as Erc20API;
    const token1 = outputToken.contractAddress;
    const { receiveAddress } = await inputToken.getWalletInfo(user);

    const validPassword = await inputToken.checkPassword(
      user,
      args.walletPassword,
    );

    if (!validPassword) {
      return {
        message: 'Invalid Password',
        amountA: '',
        amountB: '',
      };
    }

    let passwordDecripted;
    try {
      const encryptedKey = await inputToken.getEncryptedPrivKey(user.userId);
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
    const signer = ethersWallet.connect(provider);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const liquidityContract = new ethers.Contract(
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      IUniswapV2Router,
      signer,
    );

    const factoryContract = new ethers.Contract(
      '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      IUniswapV2FactoryABI,
      signer,
    );

    const pairAddress = await factoryContract.getPair(token0, token1);

    const pairContract = new ethers.Contract(
      pairAddress,
      IUniswapV2Pair,
      signer,
    );
    const liquidity = await pairContract.balanceOf(receiveAddress);

    try {
      const [gasPrice] = await Promise.all([provider.getGasPrice()]);
      const removeLiquidity = await liquidityContract.removeLiquidity(
        token0,
        token1,
        liquidity,
        0,
        0,
        receiveAddress,
        deadline,
        { gasLimit: 250000, gasPrice: gasPrice },
      );
      const tx = await removeLiquidity.wait();
      return {
        message: 'Liquidity Removed',
      };
    } catch (error) {
      logger.warn('Eroor' + error.message);
    }
  };
}

export const liquidityResolverV2 = new LiquidityResolverV2();

export default {
  Query: {
    getPairInfo: liquidityResolverV2.getPairInfo,
  },

  Mutation: {
    createPair: liquidityResolverV2.createPair,
    approveTokens: liquidityResolverV2.approveTokens,
    addLiquidityV2: liquidityResolverV2.addLiquidityV2,
    remLiquidityV2: liquidityResolverV2.removeLiquidityV2,
  },
};
