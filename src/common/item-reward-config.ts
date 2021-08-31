import {
  eSupportedInterfaces,
  ItemTokenName,
  IRewardItemMetadata,
} from '../types';
import { config } from '.';
import * as erc1155Abi from './ABI/erc1155.json';
import Erc1155API from '../wallet-api/coin-wallets/erc1155-wallet';

const { contractAddresses, tokenIds } = config;
const {
  BETA_KEY,
  ALFA_FOUNTAIN_OK,
  ALFA_FOUNTAIN_GOOD,
  ALFA_FOUNTAIN_GREAT,
  ALFA_FOUNTAIN_MAJESTIC,
  EXPRESS_DEPOT,
} = ItemTokenName;

const betaKey = {
  walletApi: eSupportedInterfaces.erc1155,
  name: 'Town Star Beta Key',
  backgroundColor: '#FFFFFF',
  icon:
    'https://gala-tokens.s3-us-west-2.amazonaws.com/images/sandbox-games/town-star/beta/beta-key.png',
  abi: erc1155Abi,
  decimalPlaces: 0,
  contractAddress: contractAddresses.gala,
  tokenId: tokenIds[BETA_KEY],
  symbol: '',
  chainId: config.chainId,
  supplyWarnThreshold: 1000,
  WalletInterface: Erc1155API, // Do not use. This is just to make typescript happy.
};
const alfaFountainOk = {
  walletApi: eSupportedInterfaces.erc1155,
  name: 'Alfa Fountain Ok',
  backgroundColor: '#FFFFFF',
  icon:
    'https://gala-tokens.s3-us-west-2.amazonaws.com/images/sandbox-games/town-star/alfa-fountain/alfa-fountain-ok.png',
  abi: erc1155Abi,
  decimalPlaces: 0,
  contractAddress: contractAddresses.gala,
  tokenId: tokenIds[ALFA_FOUNTAIN_OK],
  symbol: '',
  chainId: config.chainId,
  supplyWarnThreshold: 1000,
  WalletInterface: Erc1155API, // Do not use. This is just to make typescript happy.
};
const alfaFountainGood = {
  walletApi: eSupportedInterfaces.erc1155,
  name: 'Alfa Fountain Good',
  backgroundColor: '#FFFFFF',
  icon:
    'https://gala-tokens.s3-us-west-2.amazonaws.com/images/sandbox-games/town-star/alfa-fountain/alfa-fountain-good.png',
  abi: erc1155Abi,
  decimalPlaces: 0,
  contractAddress: contractAddresses.gala,
  tokenId: tokenIds[ALFA_FOUNTAIN_GOOD],
  symbol: '',
  chainId: config.chainId,
  supplyWarnThreshold: 1000,
  WalletInterface: Erc1155API, // Do not use. This is just to make typescript happy.
};
const alfaFountainGreat = {
  walletApi: eSupportedInterfaces.erc1155,
  name: 'Alfa Fountain Great',
  backgroundColor: '#FFFFFF',
  icon:
    'https://gala-tokens.s3-us-west-2.amazonaws.com/sandbox-games/town-star/alfa-fountain/alfa-fountain-great.json',
  abi: erc1155Abi,
  decimalPlaces: 0,
  contractAddress: contractAddresses.gala,
  tokenId: tokenIds[ALFA_FOUNTAIN_GREAT],
  symbol: '',
  supplyWarnThreshold: 1000,
  chainId: config.chainId,
  WalletInterface: Erc1155API, // Do not use. This is just to make typescript happy.
};
const alfaFountainMajestic = {
  walletApi: eSupportedInterfaces.erc1155,
  name: 'Alfa Fountain Majestic',
  backgroundColor: '#FFFFFF',
  icon:
    'https://gala-tokens.s3-us-west-2.amazonaws.com/images/sandbox-games/town-star/alfa-fountain/alfa-fountain-majestic.png',
  abi: erc1155Abi,
  decimalPlaces: 0,
  contractAddress: contractAddresses.gala,
  tokenId: tokenIds[ALFA_FOUNTAIN_MAJESTIC],
  symbol: '',
  chainId: config.chainId,
  supplyWarnThreshold: 100,
  WalletInterface: Erc1155API, // Do not use. This is just to make typescript happy.
};

const expressDepot = {
  walletApi: eSupportedInterfaces.erc1155,
  name: 'Express Depot',
  backgroundColor: '#FFFFFF',
  icon:
    'https://gala-tokens.s3-us-west-2.amazonaws.com/images/sandbox-games/town-star/express-depot/express-depot.png',
  abi: erc1155Abi,
  decimalPlaces: 0,
  contractAddress: contractAddresses.gala,
  tokenId: tokenIds[EXPRESS_DEPOT],
  symbol: '',
  chainId: config.chainId,
  supplyWarnThreshold: 1000,
  WalletInterface: Erc1155API, // Do not use. This is just to make typescript happy.
};

export const itemRewardConfig = new Map<ItemTokenName, IRewardItemMetadata>([
  [BETA_KEY, betaKey],
  [ALFA_FOUNTAIN_OK, alfaFountainOk],
  [ALFA_FOUNTAIN_GOOD, alfaFountainGood],
  [ALFA_FOUNTAIN_GREAT, alfaFountainGreat],
  [ALFA_FOUNTAIN_MAJESTIC, alfaFountainMajestic],
  [EXPRESS_DEPOT, expressDepot],
]);
