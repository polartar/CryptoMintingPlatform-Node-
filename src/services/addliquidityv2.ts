import { WalletApi } from './../wallet-api/WalletApi';
import { ServerToServerService } from './server-to-server';
import { config, logger } from 'src/common';
import { ETH } from 'simple-uniswap-sdk';
import { abi as IUniswapV2FactoryABI } from '@uniswap/v2-core/build/IUniswapV2Factory.json';
import { abi as IUniswapV2ERC20ABI } from '@uniswap/v2-core/build/UniswapV2ERC20.json';
import * as IUniswapV2Router from 'simple-uniswap-sdk/dist/esm/ABI/uniswap-router-v2.json';
import { abi as IUniswapV2Pair } from '@uniswap/v2-core/build/UniswapV2Pair.json';
import { ethers, BigNumber } from 'ethers';
import { IsTokenApprove } from 'src/types/ILiquidity';
import Erc20API from 'src/wallet-api/coin-wallets/erc20-wallet';

const { chainId, ethNodeUrl } = config;
const provider = new ethers.providers.JsonRpcProvider(ethNodeUrl);

let network: string;
if (chainId === 1) {
  network = ETH.MAINNET().contractAddress;
} else if (chainId === 3) {
  network = ETH.ROPSTEN().contractAddress;
}

class AddLiquidity extends ServerToServerService {
  public createPair = async (args: {
    decryptedPassword: string;
    token0: string;
    token1: string;
  }) => {
    const ethersWallet = new ethers.Wallet(args.decryptedPassword);
    const signer = ethersWallet.connect(provider);

    //Factory Contract

    const factoryContract = new ethers.Contract(
      config.uniswapv2factory,
      IUniswapV2FactoryABI,
      signer,
    );

    try {
      const pairAddress = await factoryContract.createPair(
        args.token0,
        args.token1,
      );
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
        const pairAddress = await factoryContract.getPair(
          args.token0,
          args.token1,
        );
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

  getPairInfo = async (args: {
    token0: string;
    token1: string;
    decryptedPassword: string;
    decimalPlaces0: number;
    decimalPlaces1: number;
    receiveAddress: string;
  }) => {
    const ethersWallet = new ethers.Wallet(args.decryptedPassword);
    const signer = ethersWallet.connect(provider);

    //Factory Contract

    const factoryContract = new ethers.Contract(
      config.uniswapv2factory,
      IUniswapV2FactoryABI,
      signer,
    );

    let pairAddress = await factoryContract.getPair(args.token0, args.token1);

    if (pairAddress === '0x0000000000000000000000000000000000000000') {
      const argsCreatePair = {
        decryptedPassword: args.decryptedPassword,
        token0: args.token0,
        token1: args.token1,
      };
      const res = await this.createPair(argsCreatePair);
      pairAddress = res.pairAddress;
    }

    const pairContract = new ethers.Contract(
      pairAddress,
      IUniswapV2Pair,
      signer,
    );

    const { _reserve0, _reserve1 } = await pairContract.getReserves();

    const results = [
      Number(ethers.utils.formatUnits(_reserve0, args.decimalPlaces0)),
      Number(ethers.utils.formatUnits(_reserve1, args.decimalPlaces1)),
    ];

    const liquidityBigNumber = await pairContract.balanceOf(
      args.receiveAddress,
    );
    const liquidityTokens = ethers.utils.formatUnits(liquidityBigNumber, 18);

    return {
      message: 'Success',
      reserve0: results[1].toFixed(2),
      reserve1: results[0].toFixed(2),
      liquidity: liquidityTokens,
      pairAddress,
    };
  };

  checkApprove = async (
    args: {
      coinSymbol: string[];
      receiveAddress: string;
      address?: string;
    },
    wallet: WalletApi,
  ) => {
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
          args.receiveAddress,
          config.uniswapv2router,
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
          args.receiveAddress,
          config.uniswapv2router,
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

  approveTokens = async (args: {
    decryptedPassword: string;
    token0: string;
    address?: string;
    receiveAddress: string;
  }) => {
    const ethersWallet = new ethers.Wallet(args.decryptedPassword, provider);

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
          args.receiveAddress,
          config.uniswapv2router,
        );
        const [gasPrice] = await Promise.all([provider.getGasPrice()]);
        if (approval < maxInt) {
          const approve = await contractPair.approve(
            config.uniswapv2router,
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
      args.token0,
      IUniswapV2ERC20ABI,
      provider,
    );

    const contract = approveContract.connect(ethersWallet);

    try {
      const maxInt = BigNumber.from('2').pow(
        BigNumber.from('256').sub(BigNumber.from('1')),
      );
      const approval = await approveContract.allowance(
        args.receiveAddress,
        config.uniswapv2router,
      );
      const [gasPrice] = await Promise.all([provider.getGasPrice()]);
      if (approval < maxInt) {
        const approve = await contract.approve(config.uniswapv2router, maxInt, {
          gasLimit: 250000,
          gasPrice: gasPrice,
        });
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

  addLiquidityV2 = async (args: {
    token0: string;
    token1: string;
    decimals0: number;
    decimals1: number;
    amountADesired: string;
    amountBDesired: string;
    decryptedPassword: string;
    receiveAddress: string;
  }) => {
    const ethersWallet = new ethers.Wallet(args.decryptedPassword);
    const signer = ethersWallet.connect(provider);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const liquidityContract = new ethers.Contract(
      config.uniswapv2router,
      IUniswapV2Router,
      signer,
    );

    const isOEth = network.toLowerCase().includes(args.token0);
    const isIEth = network.toLowerCase().includes(args.token1);

    try {
      const [gasPrice] = await Promise.all([provider.getGasPrice()]);
      const amountA = Number(args.amountADesired)
        .toFixed(args.decimals0)
        .replace(/\./g, '');
      const amountB = Number(args.amountBDesired)
        .toFixed(args.decimals1)
        .replace(/\./g, '');
      let addliquidity;
      if (isOEth || isIEth) {
        addliquidity = await liquidityContract.addLiquidityETH(
          args.token0,
          args.token1,
          amountA,
          amountB,
          0,
          0,
          args.receiveAddress,
          deadline,
          { gasLimit: 250000, gasPrice: gasPrice },
        );
        await addliquidity.wait();

        return {
          message: 'Liquidity Added',
        };
      }
      addliquidity = await liquidityContract.addLiquidity(
        args.token0,
        args.token1,
        amountA,
        amountB,
        0,
        0,
        args.receiveAddress,
        deadline,
        { gasLimit: 250000, gasPrice: gasPrice },
      );
      await addliquidity.wait();
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

  removeLiquidityV2 = async (args: {
    token0: string;
    token1: string;
    decryptedPassword: string;
    receiveAddress: string;
    percentage: number;
  }) => {
    const ethersWallet = new ethers.Wallet(args.decryptedPassword);
    const signer = ethersWallet.connect(provider);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const liquidityContract = new ethers.Contract(
      config.uniswapv2router,
      IUniswapV2Router,
      signer,
    );

    const factoryContract = new ethers.Contract(
      config.uniswapv2factory,
      IUniswapV2FactoryABI,
      signer,
    );

    const pairAddress = await factoryContract.getPair(args.token0, args.token1);

    const pairContract = new ethers.Contract(
      pairAddress,
      IUniswapV2Pair,
      signer,
    );
    const liquidity = await pairContract.balanceOf(args.receiveAddress);
    const liquidityrem = liquidity.mul(Number(args.percentage)).div(100);

    const isOEth = network.toLowerCase().includes(args.token0);
    const isIEth = network.toLowerCase().includes(args.token1);

    try {
      const [gasPrice] = await Promise.all([provider.getGasPrice()]);
      let removeLiquidity;
      if (isOEth || isIEth) {
        removeLiquidity = await liquidityContract.removeLiquidityETH(
          args.token0,
          args.token1,
          liquidityrem,
          0,
          0,
          args.receiveAddress,
          deadline,
          { gasLimit: 250000, gasPrice: gasPrice },
        );
        await removeLiquidity.wait();
        return {
          message: 'Liquidity Removed',
        };
      }
      removeLiquidity = await liquidityContract.removeLiquidity(
        args.token0,
        args.token1,
        liquidityrem,
        0,
        0,
        args.receiveAddress,
        deadline,
        { gasLimit: 250000, gasPrice: gasPrice },
      );
      await removeLiquidity.wait();
      return {
        message: 'Liquidity Removed',
      };
    } catch (error) {
      logger.warn('Error' + error.message);
    }
  };
}

export const addLiquidityV2 = new AddLiquidity();
