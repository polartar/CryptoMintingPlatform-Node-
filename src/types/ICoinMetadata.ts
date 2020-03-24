import { eSupportedInterfaces } from '../types';

export default interface ICoinMetadata {
  name: string;
  backgroundColor: string;
  icon: string;
  symbol: string;
  abi: any;
  contractAddress: string | null;
  decimalPlaces: number;
  walletApi: eSupportedInterfaces;
}
