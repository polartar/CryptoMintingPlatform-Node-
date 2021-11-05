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
import { IsTokenApprove } from 'src/types/ILiquidity';

const { chainId, ethNodeUrl } = config;
const provider = new ethers.providers.JsonRpcProvider(ethNodeUrl);

class LiquidityResolverV2 extends ResolverBase {
  validatePasscode = async (
    parent: any,
    args: {
      walletPasscode: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    try {
      await this.validateWalletPassword({
        password: args.walletPasscode,
        symbol: '',
        walletApi: wallet,
        user,
      });
      return {
        message: 'Connected',
      };
    } catch (error) {
      throw new Error('Wrong password');
    }
  };

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

  checkApprove = async (
    parent: any,
    args: {
      walletPassword: string;
      coinSymbol: string[];
      address?: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const inputToken = wallet.coin(args.coinSymbol[0]) as Erc20API;
    const { receiveAddress } = await inputToken.getWalletInfo(user);

    const validPassword = await inputToken.checkPassword(
      user,
      args.walletPassword,
    );

    if (!validPassword) {
      return {
        message: 'Invalid Password',
        symbol: args.coinSymbol[0],
        isApprove: false,
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
    const symbolApprove: IsTokenApprove[] = [];

    const pairAddress = args.address;

    if (pairAddress !== '') {
      const approveContract = new ethers.Contract(
        pairAddress,
        IUniswapV2ERC20ABI,
        provider,
      );
      let approval;
      try {
        const maxInt = BigNumber.from('2').pow(
          BigNumber.from('256').sub(BigNumber.from('1')),
        );
        const minApprove = BigNumber.from('0');
        approval = await approveContract.allowance(
          receiveAddress,
          '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        );
        if (Number(approval) === Number(minApprove)) {
          const isApprove: IsTokenApprove = {
            message: 'LP Token is not approve',
            symbol: `${args.coinSymbol[0]}//${args.coinSymbol[1]}`,
            isApprove: false,
          };
          symbolApprove.push(isApprove);
        } else if (minApprove < approval && approval <= maxInt) {
          const isApprove: IsTokenApprove = {
            message: 'LP Token is approve',
            symbol: `${args.coinSymbol[0]}//${args.coinSymbol[1]}`,
            isApprove: true,
          };
          symbolApprove.push(isApprove);
        }
        return symbolApprove;
      } catch (error) {
        throw new Error('Impossible to verify allowance');
      }
    }

    for (let i = 0, length = args.coinSymbol.length; i < length; i++) {
      const walletToken = wallet.coin(args.coinSymbol[i]) as Erc20API;
      const token0 = walletToken.contractAddress;
      const approveContract = new ethers.Contract(
        token0,
        IUniswapV2ERC20ABI,
        provider,
      );
      let approval;
      try {
        const maxInt = BigNumber.from('2').pow(
          BigNumber.from('256').sub(BigNumber.from('1')),
        );
        const minApprove = BigNumber.from('0');
        approval = await approveContract.allowance(
          receiveAddress,
          '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        );
        if (approval === minApprove) {
          const isApprove: IsTokenApprove = {
            message: 'Token is not approve',
            symbol: args.coinSymbol[i],
            isApprove: false,
          };
          symbolApprove.push(isApprove);
        } else if (minApprove < approval && approval <= maxInt) {
          const isApprove: IsTokenApprove = {
            message: 'Token is approve',
            symbol: args.coinSymbol[i],
            isApprove: true,
          };
          symbolApprove.push(isApprove);
        }
      } catch (error) {
        throw new Error('Impossible to verify allowance');
      }
    }
    const array = symbolApprove;
    return array;
  };

  approveTokens = async (
    parent: any,
    args: {
      walletPassword: string;
      coinSymbol0: string;
      address?: string;
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

    if (args.address !== '') {
      const approvePairContract = new ethers.Contract(
        args.address,
        IUniswapV2ERC20ABI,
        provider,
      );
      try {
        const contractPair = approvePairContract.connect(ethersWallet);
        const maxInt = BigNumber.from('2').pow(
          BigNumber.from('256').sub(BigNumber.from('1')),
        );
        const approval = await approvePairContract.allowance(
          receiveAddress,
          '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        );
        const [gasPrice] = await Promise.all([provider.getGasPrice()]);
        if (approval < maxInt) {
          const approve = await contractPair.approve(
            '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            maxInt,
            { gasLimit: 250000, gasPrice: gasPrice },
          );
          const txApprove = await approve.wait();
          return {
            message: 'LP Token approve',
            created: true,
          };
        } else {
          return {
            message: 'This LP token is already approve',
            created: true,
          };
        }
      } catch (error) {
        throw new Error('Impossible to verify allowance');
      }
    }
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
      amountADesired: string;
      amountBDesired: string;
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
      const amountA = Number(args.amountADesired)
        .toFixed(decimals0)
        .replace(/\./g, '');
      const amountB = Number(args.amountBDesired)
        .toFixed(decimals1)
        .replace(/\./g, '');
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

    const results = [
      Number(ethers.utils.formatUnits(_reserve0, outputToken.decimalPlaces)),
      Number(ethers.utils.formatUnits(_reserve1, inputToken.decimalPlaces)),
    ];

    // let results = [
    //   Number(ethers.utils.formatEther(_reserve0)) / (10 ** inputToken.decimalPlaces),
    //   Number(ethers.utils.formatEther(_reserve1)) / (10 ** outputToken.decimalPlaces),
    // ];

    // const numbReserve0 = _reserve0.div(Math.pow(10, decimals0)).toString();
    // const remindReserve0 = _reserve0.mod(Math.pow(10, decimals1)).toString();
    // const reserve0 = numbReserve0 + '.' + remindReserve0;
    // const numbReserve1 = _reserve1.div(Math.pow(10, decimals0)).toString();
    // const remindReserve1 = _reserve1.mod(Math.pow(10, decimals1)).toString();
    // const reserve1 = numbReserve1 + '.' + remindReserve1;

    const liquidityBigNumber = await pairContract.balanceOf(receiveAddress);
    const liquidityTokens = ethers.utils.formatUnits(liquidityBigNumber, 18);

    return {
      message: 'Success',
      reserve0: results[1].toFixed(2),
      reserve1: results[0].toFixed(2),
      liquidity: liquidityTokens,
      pairAddress,
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
    const liquidityrem = liquidity.mul(Number(args.percentage)).div(100);

    try {
      const [gasPrice] = await Promise.all([provider.getGasPrice()]);
      const removeLiquidity = await liquidityContract.removeLiquidity(
        token0,
        token1,
        liquidityrem,
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
      logger.warn('Error' + error.message);
    }
  };
}

export const liquidityResolverV2 = new LiquidityResolverV2();

export default {
  Query: {
    getPairInfo: liquidityResolverV2.getPairInfo,
    checkApprove: liquidityResolverV2.checkApprove,
  },

  Mutation: {
    validatePasscode: liquidityResolverV2.validatePasscode,
    createPair: liquidityResolverV2.createPair,
    approveTokens: liquidityResolverV2.approveTokens,
    addLiquidityV2: liquidityResolverV2.addLiquidityV2,
    remLiquidityV2: liquidityResolverV2.removeLiquidityV2,
  },
};
