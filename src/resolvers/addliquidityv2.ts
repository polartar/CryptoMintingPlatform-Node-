import { ResolverBase, config, logger } from 'src/common';
import { Context } from '../types/context';
import { ethers, BigNumber } from 'ethers';
import EthWallet from '../wallet-api/coin-wallets/eth-wallet';
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
      tokenA: string;
      tokenB: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const walletApi = wallet.coin('ETH') as EthWallet;
    const { receiveAddress } = await walletApi.getWalletInfo(user);

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
    const signer = ethersWallet.connect(provider);

    //Factory Contract

    const factoryContract = new ethers.Contract(
      '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      IUniswapV2FactoryABI,
      signer,
    );

    try {
      const pairAddress = await factoryContract.createPair(
        args.tokenA,
        args.tokenB,
      );
      const txPairAddress = await pairAddress.wait();
      // const feeTo = await factoryContract.feeTo();
      // const feeToSetter = await factoryContract.feeToSetter();
      return {
        message: 'Pair created',
        pairAddress,
        // feeTo,
        // feeToSetter
      };
    } catch (error) {
      logger.warn(
        'Resolvers.LiquidityResolverV2.createPair.errorMessage ' +
          error.message,
      );
      const pairAddress = await factoryContract.getPair(
        args.tokenA,
        args.tokenB,
      );
      return {
        message: 'Pair is already created',
        pairAddress: pairAddress,
        // feeTo: "",
        // feeToSetter: ""
      };
    }
  };

  approveTokens = async (
    parent: any,
    args: {
      walletPassword: string;
      token: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const walletApi = wallet.coin('ETH') as EthWallet;
    const { receiveAddress } = await walletApi.getWalletInfo(user);

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

    const ethersWallet = new ethers.Wallet(passwordDecripted, provider);
    const approveContract = new ethers.Contract(
      args.token,
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
      tokenA: string;
      tokenB: string;
      amountADesired: number;
      amountBDesired: number;
      decimalsA: number;
      decimalsB: number;
      walletPassword: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const walletApi = wallet.coin('ETH') as EthWallet;
    const { receiveAddress } = await walletApi.getWalletInfo(user);

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
    const signer = ethersWallet.connect(provider);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const liquidityContract = new ethers.Contract(
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      IUniswapV2Router,
      signer,
    );

    try {
      const [gasPrice] = await Promise.all([provider.getGasPrice()]);
      const amountA = args.amountADesired
        .toFixed(args.decimalsA)
        .replace(/\./g, '');
      const amountB = args.amountBDesired
        .toFixed(args.decimalsB)
        .replace(/\./g, '');
      const addliquidity = await liquidityContract.addLiquidity(
        args.tokenA,
        args.tokenB,
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
      tokenA: string;
      tokenB: string;
      walletPassword: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const walletApi = wallet.coin('ETH') as EthWallet;
    const { receiveAddress } = await walletApi.getWalletInfo(user);

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
    const signer = ethersWallet.connect(provider);

    //Factory Contract

    const factoryContract = new ethers.Contract(
      '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      IUniswapV2FactoryABI,
      signer,
    );

    const pairAddress = await factoryContract.getPair(args.tokenA, args.tokenB);

    const pairContract = new ethers.Contract(
      pairAddress,
      IUniswapV2Pair,
      signer,
    );

    const { _reserve0, _reserve1 } = await pairContract.getReserves();

    const [gasPrice] = await Promise.all([provider.getGasPrice()]);

    const liquidity = await pairContract.balanceOf(receiveAddress);

    return {
      message: 'hey',
    };
  };

  removeLiquidityV2 = async (
    parent: any,
    args: {
      tokenA: string;
      tokenB: string;
      liquidity: number;
      walletPassword: string;
      percentage: number;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const walletApi = wallet.coin('ETH') as EthWallet;
    const { receiveAddress } = await walletApi.getWalletInfo(user);

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

    const pairAddress = await factoryContract.getPair(args.tokenA, args.tokenB);

    const pairContract = new ethers.Contract(
      pairAddress,
      IUniswapV2Pair,
      signer,
    );
    const liquidity = await pairContract.balanceOf(receiveAddress);

    try {
      const [gasPrice] = await Promise.all([provider.getGasPrice()]);
      const removeLiquidity = await liquidityContract.removeLiquidity(
        args.tokenA,
        args.tokenB,
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
  Mutation: {
    createPair: liquidityResolverV2.createPair,
    approveTokens: liquidityResolverV2.approveTokens,
    addLiquidityV2: liquidityResolverV2.addLiquidityV2,
    remLiquidityV2: liquidityResolverV2.removeLiquidityV2,
    getPairInfo: liquidityResolverV2.getPairInfo,
  },
};
