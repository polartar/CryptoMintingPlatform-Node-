import * as dotenv from 'dotenv';
import * as autoBind from 'auto-bind';
import * as supportedFavoriteOptions from '../data/supportedFavoriteOptions.json';
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
  public readonly cartUrl = process.env.CART_URL;
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
    gala: process.env.COMPANY_FEE_BTC_ADDRESS_GALA,
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
      : 'https://mainnet.infura.io/v3/c843dd81493d4fa3a6fd29277d831eb1';

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
    gala: process.env.GALA_ADDRESS,
  };
  public readonly tokenIds = {
    gala: process.env.GALA_TOKEN_ID,
  };

  public pubsub = new PubSub();
  public readonly newTransaction = 'NEW_TRANSACTION';
  public readonly newBalance = 'NEW_BALANCE';
  public readonly sendGridApiKey = process.env.SENDGRID_API_KEY;
  public readonly sendGridEmailFrom = process.env.SENDGRID_EMAIL_FROM;
  public readonly baseNumberOfShares = this.normalizeNumber(
    process.env.BASE_NUMBER_OF_SHARES,
  );
  public readonly dailyWalletStatsCronExpression =
    process.env.WALLET_STATS_CRON_EXPRESSION;
  public readonly erc20RewardWarnThreshold = this.normalizeNumber(
    process.env.ERC20_REWARD_WARN_THRESHOLD,
  );
  public readonly slackToken = process.env.SLACK_TOKEN;
  public readonly sendWalletReportToConnect =
    process.env.SEND_WALLET_REPORT_TO_CONNECT;
  public readonly sendWalletReportToConnectArcade =
    process.env.SEND_WALLET_REPORT_TO_CONNECTARCADE;
  public readonly sendWalletReportToArcade =
    process.env.SEND_WALLET_REPORT_TO_ARCADE;
  public readonly sendWalletReportToCodex =
    process.env.SEND_WALLET_REPORT_TO_CODEX;
  public readonly sendWalletReportToGreen =
    process.env.SEND_WALLET_REPORT_TO_GREEN;
  public readonly sendWalletReportToLocalhost =
    process.env.SEND_WALLET_REPORT_TO_LOCALHOST;
  public readonly gameItemServiceUrl = process.env.GAME_ITEM_SERVICE_URL;
  public readonly galaGamingApiUrl = process.env.GALA_GAMING_API_URL;

  public readonly s3Bucket = process.env.S3_BUCKET;
  public readonly awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
  public readonly awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  public readonly s3Region = process.env.S3_REGION;

  public readonly costPerLootBox = this.normalizeNumber(
    process.env.COST_PER_LOOT_BOX,
  );

  public readonly supportsDisplayNames =
    process.env.SUPPORTS_DISPLAY_NAMES === 'true';

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
      'GALA_ADDRESS',
      'GALA_TOKEN_ID',
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
      'COMPANY_FEE_BTC_ADDRESS_GALA',
      'ZENDESK_API_KEY',
      'ERC20_REWARD_DISTRIBUTER_PKEY',
      'SENDGRID_API_KEY',
      'SENDGRID_EMAIL_FROM',
      'BASE_NUMBER_OF_SHARES',
      'WALLET_STATS_CRON_EXPRESSION',
      'ERC20_REWARD_WARN_THRESHOLD',
      'SLACK_TOKEN',
      'SEND_WALLET_REPORT_TO_CONNECT',
      'SEND_WALLET_REPORT_TO_CONNECTARCADE',
      'SEND_WALLET_REPORT_TO_ARCADE',
      'SEND_WALLET_REPORT_TO_CODEX',
      'SEND_WALLET_REPORT_TO_GREEN',
      'SEND_WALLET_REPORT_TO_LOCALHOST',
      'CART_URL',
      'GAME_ITEM_SERVICE_URL',
      'GALA_GAMING_API_URL',
      'S3_BUCKET',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'S3_REGION',
      'COST_PER_LOOT_BOX',
      'SUPPORTS_DISPLAY_NAMES',
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
    if (hostName.includes('arcade') || hostName.includes('gala')) {
      return 'gala';
    }
    if (hostName.includes('blue')) {
      return 'blue';
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
    const symbolToName = new Map();

    supportedFavoriteOptions.forEach(({ name, symbol }) => {
      symbolToName.set(symbol, name);
    });

    return symbolToName;
  }
}

const config = new Config();
export default config;
