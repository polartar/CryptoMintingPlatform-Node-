import * as dotenv from 'dotenv';
import * as autoBind from 'auto-bind';
import * as supportedFavoriteOptions from '../data/supportedFavoriteOptions.json';
import { PubSub } from 'apollo-server-express';
import keys from './keys';
import { Connection, createConnection } from 'mongoose';
import { ItemTokenName } from '../types/ItemTokenName';

dotenv.config({ path: '.env' });

const {
  ALFA_FOUNTAIN_GOOD,
  BETA_KEY,
  ALFA_FOUNTAIN_GREAT,
  ALFA_FOUNTAIN_MAJESTIC,
  ALFA_FOUNTAIN_OK,
  EXPRESS_DEPOT,
} = ItemTokenName;

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
  public readonly blockfunnelsUrl = process.env.BLOCKFUNNELS_URL;
  public readonly blockfunnelsBasicAuthPassword =
    process.env.BLOCKFUNNELS_BASIC_AUTH_PASSWORD;
  public readonly isDev = process.env.NODE_ENV !== 'production';
  public readonly isStage = process.env.IS_STAGE === 'true';
  public readonly etherScanApiKey = process.env.ETHERSCAN_API_KEY;
  public readonly clientSecretKeyRequired: boolean =
    process.env.CLIENT_SECRET_KEY_REQUIRED !== undefined &&
    process.env.CLIENT_SECRET_KEY_REQUIRED === 'true';
  public readonly erc20FeeCalcAddress = process.env.ETH_ADD_FOR_ERC20_FEE_CALC;
  public readonly rewardDistributerPkey =
    process.env.REWARD_DISTRIBUTOR_ETH_PKEY;
  public readonly companyFeeBtcAddresses: { [key: string]: string } = {
    green: process.env.COMPANY_FEE_BTC_ADDRESS_GREEN,
    winx: process.env.COMPANY_FEE_BTC_ADDRESS_WINX,
    gala: process.env.COMPANY_FEE_BTC_ADDRESS_GALA,
  };
  public readonly companyFeeGalaAddress = process.env.COMPANY_FEE_GALA_ADDRESS;
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

  public readonly ethNodeUrl = process.env.ETH_NODE_URL;

  public readonly btcTxLink = process.env.BTC_TX_LINK_BASE;
  public readonly ethTxLink = process.env.ETH_TX_LINK_BASE;

  public readonly contractAddresses = {
    green: process.env.GREEN_ADDRESS,
    gala: process.env.GALA_ADDRESS,
  };
  public readonly tokenIds: { [key: string]: string } = {
    gala: process.env.GALA_TOKEN_ID,
    [BETA_KEY]: process.env.BETA_KEY_TOKEN_ID,
    [ALFA_FOUNTAIN_OK]: process.env.ALFA_OK_TOKEN_ID,
    [ALFA_FOUNTAIN_GOOD]: process.env.ALFA_GOOD_TOKEN_ID,
    [ALFA_FOUNTAIN_GREAT]: process.env.ALFA_GREAT_TOKEN_ID,
    [ALFA_FOUNTAIN_MAJESTIC]: process.env.ALFA_MAJESTIC_TOKEN_ID,
    [EXPRESS_DEPOT]: process.env.EXPRESS_DEPOT_TOKEN_ID,
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
  public readonly rewardWarnThreshold = this.normalizeNumber(
    process.env.REWARD_WARN_THRESHOLD,
  );
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
  public readonly nodeSelectorUrl = process.env.NODE_SELECTOR_URL;
  public readonly exchangeUrl = process.env.EXCHANGE_URL;

  public readonly s3Bucket = process.env.S3_BUCKET;
  public readonly awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
  public readonly awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  public readonly s3Region = process.env.S3_REGION;

  public readonly costPerLootBox = this.normalizeNumber(
    process.env.COST_PER_LOOT_BOX,
  );

  public readonly supportsDisplayNames =
    process.env.SUPPORTS_DISPLAY_NAMES === 'true';

  public readonly alertApiUrls: string[] = JSON.parse(
    process.env.ALERT_API_URLS,
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
      'COMPANY_FEE_GALA_ADDRESS',
      'ZENDESK_API_KEY',
      'REWARD_DISTRIBUTOR_ETH_PKEY',
      'SENDGRID_API_KEY',
      'SENDGRID_EMAIL_FROM',
      'BASE_NUMBER_OF_SHARES',
      'WALLET_STATS_CRON_EXPRESSION',
      'REWARD_WARN_THRESHOLD',
      'SEND_WALLET_REPORT_TO_CONNECT',
      'SEND_WALLET_REPORT_TO_CONNECTARCADE',
      'SEND_WALLET_REPORT_TO_ARCADE',
      'SEND_WALLET_REPORT_TO_CODEX',
      'SEND_WALLET_REPORT_TO_GREEN',
      'SEND_WALLET_REPORT_TO_LOCALHOST',
      'CART_URL',
      'GAME_ITEM_SERVICE_URL',
      'GALA_GAMING_API_URL',
      'EXCHANGE_URL',
      'S3_BUCKET',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'S3_REGION',
      'COST_PER_LOOT_BOX',
      'SUPPORTS_DISPLAY_NAMES',
      'ALERT_API_URLS',
      'NODE_SELECTOR_URL',
      'GALA_TOKEN_ID',
      'BETA_KEY_TOKEN_ID',
      'ALFA_OK_TOKEN_ID',
      'ALFA_GOOD_TOKEN_ID',
      'ALFA_GREAT_TOKEN_ID',
      'ALFA_MAJESTIC_TOKEN_ID',
      'EXPRESS_DEPOT_TOKEN_ID',
      'ETH_NODE_URL',
      'BTC_TX_LINK_BASE',
      'ETH_TX_LINK_BASE',
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
