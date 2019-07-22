import ICoinMetadata from './ICoinMetadata'

export default interface IEnvCoin {
  symbol: string;
  walletApi: string;
  dev: ICoinMetadata;
  prod: ICoinMetadata;
}
