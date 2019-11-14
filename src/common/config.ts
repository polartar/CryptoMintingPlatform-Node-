import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as autoBind from 'auto-bind';
import { PubSub } from 'apollo-server-express';
import keys from './keys';
import { Connection, createConnection } from 'mongoose';

dotenv.config({ path: '.env' });

class Config {
  public readonly nodeEnv = process.env.NODE_ENV;
  public readonly brand = this.getBrandFromHost();
  public readonly logLevel = process.env.LOG_LEVEL;
  public readonly port = this.normalizeNumber(process.env.PORT);
  public readonly hostname = process.env.HOSTNAME;
  public readonly mongodbUri = process.env.MONGODB_URI;
  public connectMongoConnection: Connection;
  public readonly jwtPrivateKey = keys.privateKey;
  public readonly jwtPublicKey = keys.publicKey;
  public readonly bitlyToken = process.env.BITLY_API_KEY;
  public readonly serviceAccounts = keys.serviceAccounts;
  public readonly defaultCryptoFavorites = ['BTC', 'ETH', 'LTC', 'XRP'];
  public readonly bypassTwoFaInDev =
    process.env.BYPASS_TWOFA_IN_DEV &&
    process.env.BYPASS_TWOFA_IN_DEV.toLowerCase() === 'true';
  public readonly apiKeyServiceUrl = process.env.API_KEY_SERVICE_URL;
  public readonly isDev = process.env.NODE_ENV !== 'production';
  public readonly etherScanApiKey = process.env.ETHERSCAN_API_KEY;
  public readonly clientSecretKeyRequired: boolean =
    process.env.CLIENT_SECRET_KEY_REQUIRED !== undefined &&
    process.env.CLIENT_SECRET_KEY_REQUIRED === 'true';
  public readonly erc20FeeCalcAddress = process.env.ETH_ADD_FOR_ERC20_FEE_CALC;
  public readonly erc20RewardDistributerPkey =
    process.env.ERC20_REWARD_DISTRIBUTER_PKEY;
  public readonly companyFeeBtcAddresses: { [key: string]: string } = {
    green: process.env.COMPANY_FEE_BTC_ADDRESS_GREEN,
    winx: process.env.COMPANY_FEE_BTC_ADDRESS_WINX,
    arcade: process.env.COMPANY_FEE_BTC_ADDRESS_ARCADE,
  };
  public readonly cryptoNetwork = process.env.CRYPTO_NETWORK;
  public readonly walletClientDomain = process.env.WALLET_CLIENT_DOMAIN;
  public readonly zendeskApiKey = process.env.ZENDESK_API_KEY;
  public readonly cryptoSymbolToNameMap: Map<
    string,
    string
  > = this.mapSymbolToName();
  public readonly bcoinWallet = {
    host: process.env.BCOIN_WALLET_HOST,
    ssl:
      process.env.BCOIN_WALLET_SSL &&
      process.env.BCOIN_WALLET_SSL.toLowerCase() === 'true',
    uri: process.env.CRYPTO_NETWORK,
    walletAuth: true,
    network: process.env.CRYPTO_NETWORK,
    port: +process.env.BCOIN_WALLET_PORT,
    apiKey: process.env.BCOIN_WALLET_API_KEY,
  };
  public readonly bcoinRpc = {
    ...this.bcoinWallet,
    port: process.env.BCOIN_NODE_PORT ? +process.env.BCOIN_NODE_PORT : 0,
    apiKey: process.env.BCOIN_NODE_API_KEY,
  };
  public readonly ethNodeUrl =
    process.env.CRYPTO_NETWORK === 'testnet'
      ? 'https://ropsten.infura.io/v3/c843dd81493d4fa3a6fd29277d831eb1'
      : 'https://eth.share.green';

  public readonly etherscanNetwork =
    process.env.CRYPTO_NETWORK === 'testnet' ? 'ropsten' : 'homestead';

  public readonly btcTxLink =
    process.env.CRYPTO_NETWORK === 'testnet'
      ? 'https://live.blockcypher.com/btc-testnet/tx'
      : 'https://live.blockcypher.com/btc/tx';

  public readonly ethTxLink =
    process.env.CRYPTO_NETWORK === 'testnet'
      ? 'https://ropsten.etherscan.io/tx'
      : 'https://etherscan.io/tx';

  public readonly contractAddresses = {
    green: process.env.GREEN_ADDRESS,
    arcade: process.env.ARCADE_ADDRESS,
  };
  public pubsub = new PubSub();
  public readonly newTransaction = 'NEW_TRANSACTION';
  public readonly newBalance = 'NEW_BALANCE';
  public readonly sendGridApiKey = process.env.SENDGRID_API_KEY;
  public readonly sendGridEmailFrom = process.env.SENDGRID_EMAIL_FROM;
  public readonly sharesPerSoftNodeLicense = this.normalizeNumber(
    process.env.SHARES_PER_SOFTNODE_LICENSE,
  );

  constructor() {
    autoBind(this);
    this.ensureRequiredVariables();
    this.setConnectMongoConnection();
  }

  private ensureRequiredVariables() {
    // required environment variables
    const missingEnvVariables = [
      'NODE_ENV',
      'LOG_LEVEL',
      'PORT',
      'HOSTNAME',
      'CRYPTO_NETWORK',
      'ARCADE_ADDRESS',
      'GREEN_ADDRESS',
      'BCOIN_WALLET_PORT',
      'BCOIN_WALLET_API_KEY',
      'BCOIN_WALLET_HOST',
      'BCOIN_WALLET_SSL',
      'API_KEY_SERVICE_URL',
      'ETHERSCAN_API_KEY',
      'ETH_ADD_FOR_ERC20_FEE_CALC',
      'COMPANY_FEE_BTC_ADDRESS_GREEN',
      'COMPANY_FEE_BTC_ADDRESS_WINX',
      'COMPANY_FEE_BTC_ADDRESS_ARCADE',
      'ZENDESK_API_KEY',
      'ERC20_REWARD_DISTRIBUTER_PKEY',
      'SENDGRID_API_KEY',
      'SENDGRID_EMAIL_FROM',
      'SHARES_PER_SOFTNODE_LICENSE',
    ].filter(name => !process.env[name]);
    if (missingEnvVariables.length > 0) {
      throw new Error(
        `Required environment variable(s) ${missingEnvVariables.join(
          ', ',
        )} undefined.`,
      );
    }
  }

  private getBrandFromHost() {
    const hostName = process.env.HOSTNAME.toLowerCase();
    if (hostName.includes('connectblockchain')) {
      return 'connect';
    }
    if (hostName.includes('green')) {
      return 'green';
    }
    if (hostName.includes('codex')) {
      return 'codex';
    }
    if (hostName.includes('arcade')) {
      return 'arcade';
    }
    if (hostName.includes('localhost')) {
      return 'localhost';
    }
  }

  public async setConnectMongoConnection() {
    const connectMongoUrl = process.env.CONNECT_MONGODB_URI;
    if (
      !this.hostname.includes('localhost') ||
      (!this.hostname.includes('connectblockchain.net') &&
        connectMongoUrl !== undefined)
    ) {
      this.connectMongoConnection = await createConnection(connectMongoUrl, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
      });
    }
  }

  private normalizeNumber(val: string) {
    const numberValue = parseInt(val, 10);

    if (isNaN(numberValue)) {
      // named pipe
      throw new Error(`Failed to normalize ${val} as a number`);
    }

    if (numberValue >= 0) {
      // numberValue number
      return numberValue;
    }

    throw new Error(
      `Failed to normalize as number greater than 0: ${numberValue}`,
    );
  }

  private mapSymbolToName() {
    const symbolsWithNames = JSON.parse(
      fs
        .readFileSync(
          path.join(__dirname, '../data/supportedFavoriteOptions.json'),
        )
        .toString(),
    ) as { name: string; symbol: string }[];

    const symbolToName = new Map();

    symbolsWithNames.forEach(({ name, symbol }) => {
      symbolToName.set(symbol, name);
    });

    return symbolToName;
  }
}

const config = new Config();
export default config;
