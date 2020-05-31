import {
  eSupportedInterfaces,
  ItemTokenName,
  IRewardItemMetadata,
} from '../types';
import { config } from '.';
import * as erc1155Abi from './ABI/erc1155.json';

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
  supplyWarnThreshold: 1000,
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
  supplyWarnThreshold: 1000,
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
  supplyWarnThreshold: 1000,
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
  supplyWarnThreshold: 100,
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
  supplyWarnThreshold: 1000,
};

export const itemRewardConfig = new Map<ItemTokenName, IRewardItemMetadata>([
  [BETA_KEY, betaKey],
  [ALFA_FOUNTAIN_OK, alfaFountainOk],
  [ALFA_FOUNTAIN_GOOD, alfaFountainGood],
  [ALFA_FOUNTAIN_GREAT, alfaFountainGreat],
  [ALFA_FOUNTAIN_MAJESTIC, alfaFountainMajestic],
  [EXPRESS_DEPOT, expressDepot],
]);
