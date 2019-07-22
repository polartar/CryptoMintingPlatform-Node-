import { IEnvCoin, eSupportedInterfaces } from '../../types'
import defaults from './defaults'



const walletConfigOverrides: IEnvCoin[] = [
  {
    symbol: defaults.btc.symbol,
    walletApi: eSupportedInterfaces.btc,
    dev: {
      ...defaults.btc,
      contractAddress: null,
      decimalPlaces: 8,
    },
    prod: {
      ...defaults.btc,
      contractAddress: null,
      decimalPlaces: 8,
    },
  },
  {
    symbol: defaults.eth.symbol,
    walletApi: eSupportedInterfaces.eth,
    dev: {
      ...defaults.eth,
      contractAddress: null,
      decimalPlaces: 18,
    },
    prod: {
      ...defaults.eth,
      contractAddress: null,
      decimalPlaces: 18,
    },
  },
  {
    symbol: defaults.green.symbol,
    walletApi: eSupportedInterfaces.erc20,
    dev: {
      ...defaults.green,
      contractAddress: '0x1c3940bc09bb356af76c75a80d86313d620faa32',
      decimalPlaces: 18,
    },
    prod: {
      ...defaults.green,
      contractAddress: '0xb2089a7069861c8d90c8da3aacab8e9188c0c531',
      decimalPlaces: 8,
    },
  },
  {
    symbol: defaults.arcade.symbol,
    walletApi: eSupportedInterfaces.erc20,
    dev: {
      ...defaults.arcade,
      contractAddress: '0x79847306b65DE03F0cD179839AeEE3F18096C7C0',
      decimalPlaces: 8,
    },
    prod: {
      ...defaults.arcade,
      contractAddress: '0x267db5a7606cf14ef4aa7cd9a788e379fd95510d',
      decimalPlaces: 8,
    },
  }
]

export default walletConfigOverrides;