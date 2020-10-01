import * as autoBind from 'auto-bind';
import * as supportedFavoriteOptions from '../data/supportedFavoriteOptions.json';
import { PubSub } from 'apollo-server-express';
import keys from './keys';
import { Connection, createConnection } from 'mongoose';
import { ItemTokenName } from '../types/ItemTokenName';
import { systemLogger } from './logger';
import { env } from './env';

const {
  ALFA_FOUNTAIN_GOOD,
  BETA_KEY,
  ALFA_FOUNTAIN_GREAT,
  ALFA_FOUNTAIN_MAJESTIC,
  ALFA_FOUNTAIN_OK,
  EXPRESS_DEPOT,
} = ItemTokenName;

class Config {
  public readonly nodeEnv = env.NODE_ENV;
  public readonly brand = this.getBrandFromHost();
  public readonly logLevel = env.LOG_LEVEL;
  public readonly port = this.normalizeNumber(env.PORT);
  public readonly hostname = env.HOSTNAME;
  public readonly mongodbUri = env.MONGODB_URI;
  public readonly cartUrl = env.CART_URL;
  public connectMongoConnection: Connection;
  public readonly jwtPrivateKey = keys.privateKey;
  public readonly jwtPublicKey = keys.publicKey;
  public readonly bitlyToken = env.BITLY_API_KEY;
  public readonly serviceAccounts = keys.serviceAccounts;
  public readonly defaultCryptoFavorites = ['BTC', 'ETH', 'LTC', 'XRP'];
  public readonly nudgeTimeoutHours = 18;
  public readonly nudgeCode = 'play_townstar';
  public readonly bypassTwoFaInDev =
    env.BYPASS_TWOFA_IN_DEV && env.BYPASS_TWOFA_IN_DEV.toLowerCase() === 'true';
  public readonly apiKeyServiceUrl = env.API_KEY_SERVICE_URL;
  public readonly blockfunnelsUrl = env.BLOCKFUNNELS_URL;
  public readonly blockfunnelsBasicAuthPassword =
    env.BLOCKFUNNELS_BASIC_AUTH_PASSWORD;
  public readonly isDev = env.NODE_ENV !== 'production';
  public readonly isStage = env.IS_STAGE === 'true';
  public readonly etherScanApiKey = env.ETHERSCAN_API_KEY;
  public readonly clientSecretKeyRequired: boolean =
    env.CLIENT_SECRET_KEY_REQUIRED !== undefined &&
    env.CLIENT_SECRET_KEY_REQUIRED === 'true';
  public readonly erc20FeeCalcAddress = env.ETH_ADD_FOR_ERC20_FEE_CALC;
  public readonly erc20GasValue = +env.ERC20_GAS_VALUE;
  public readonly rewardDistributerPkey = env.REWARD_DISTRIBUTOR_ETH_PKEY;
  public readonly companyFeeBtcAddresses: { [key: string]: string } = {
    green: env.COMPANY_FEE_BTC_ADDRESS_GREEN,
    winx: env.COMPANY_FEE_BTC_ADDRESS_WINX,
    gala: env.COMPANY_FEE_BTC_ADDRESS_GALA,
  };
  public readonly companyFeeEthAddress = env.COMPANY_FEE_ETH_ADDRESS;
  public readonly cryptoNetwork = env.CRYPTO_NETWORK;
  public readonly walletClientDomain = env.WALLET_CLIENT_DOMAIN;
  public readonly referralLinkDomain = env.REFERRAL_LINK_DOMAIN;
  public readonly zendeskApiKey = env.ZENDESK_API_KEY;
  public readonly zendeskUrl = env.ZENDESK_URL;
  public readonly cryptoSymbolToNameMap: Map<
    string,
    string
  > = this.mapSymbolToName();
  public readonly bcoinWallet = {
    host: env.BCOIN_WALLET_HOST,
    ssl: env.BCOIN_WALLET_SSL && env.BCOIN_WALLET_SSL.toLowerCase() === 'true',
    uri: env.CRYPTO_NETWORK,
    walletAuth: true,
    network: env.CRYPTO_NETWORK,
    port: +env.BCOIN_WALLET_PORT,
    apiKey: env.BCOIN_WALLET_API_KEY,
  };
  public readonly bcoinRpc = {
    ...this.bcoinWallet,
    port: env.BCOIN_NODE_PORT ? +env.BCOIN_NODE_PORT : 0,
    apiKey: env.BCOIN_NODE_API_KEY,
  };

  public readonly ethNodeUrl = env.ETH_NODE_URL;

  public readonly btcTxLink = env.BTC_TX_LINK_BASE;
  public readonly ethTxLink = env.ETH_TX_LINK_BASE;

  public readonly contractAddresses = {
    green: env.GREEN_ADDRESS,
    gala: env.GALA_ADDRESS,
    galaItem: env.GALA_ITEM_CONTRACT_ADDRESS,
  };
  public readonly tokenIds: { [key: string]: string } = {
    gala: env.GALA_TOKEN_ID,
    [BETA_KEY]: env.BETA_KEY_TOKEN_ID,
    [ALFA_FOUNTAIN_OK]: env.ALFA_OK_TOKEN_ID,
    [ALFA_FOUNTAIN_GOOD]: env.ALFA_GOOD_TOKEN_ID,
    [ALFA_FOUNTAIN_GREAT]: env.ALFA_GREAT_TOKEN_ID,
    [ALFA_FOUNTAIN_MAJESTIC]: env.ALFA_MAJESTIC_TOKEN_ID,
    [EXPRESS_DEPOT]: env.EXPRESS_DEPOT_TOKEN_ID,
  };

  public pubsub = new PubSub();
  public readonly newTransaction = 'NEW_TRANSACTION';
  public readonly newBalance = 'NEW_BALANCE';
  public readonly sendGridApiKey = env.SENDGRID_API_KEY;
  public readonly sendGridEmailFrom = env.SENDGRID_EMAIL_FROM;
  public readonly baseNumberOfShares = this.normalizeNumber(
    env.BASE_NUMBER_OF_SHARES,
  );
  public readonly rewardWarnThreshold = this.normalizeNumber(
    env.REWARD_WARN_THRESHOLD,
  );
  public readonly gameItemServiceUrl = env.GAME_ITEM_SERVICE_URL;
  public readonly galaGamingApiUrl = env.GALA_GAMING_API_URL;

  public readonly simplexEventsServiceUrl = env.SIMPLEX_EVENTS_SERVICE_URL;
  public readonly simplexJwtServiceUrl = env.SIMPLEX_JWT_SERVICE_URL;
  public readonly simplexJwtServiceSecret = env.SIMPLEX_JWT_SERVICE_SECRET;
  public readonly simplexPartnerName = env.SIMPLEX_PARTNER_NAME;

  public readonly nodeSelectorUrl = env.NODE_SELECTOR_URL;
  public readonly exchangeUrl = env.EXCHANGE_URL;
  public readonly actionRewardsApiUrl = env.ACTION_REWARDS_API_URL;

  public readonly s3Bucket = env.S3_BUCKET;
  public readonly awsAccessKey = env.AWS_ACCESS_KEY_ID;
  public readonly awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  public readonly s3Region = env.S3_REGION;

  public readonly costPerLootBox = this.normalizeNumber(env.COST_PER_LOOT_BOX);

  public readonly supportsDisplayNames = env.SUPPORTS_DISPLAY_NAMES === 'true';
  public readonly alertApiUrls: string[] = JSON.parse(env.ALERT_API_URLS);

  public readonly supportsBtcPubsub = env.SUPPORTS_BTC_PUBSUB === 'true';

  public readonly displayedWallets = env.DISPLAYED_WALLETS.split(
    ',',
  ).map(symbol => symbol.toLowerCase());
  public readonly indexedTransactions = env.INDEXED_TRANSACTIONS === 'true';
  public readonly etherscanNetwork =
    env.CRYPTO_NETWORK === 'testnet' ? 'ropsten' : 'homestead';

  public readonly galaMasterNodeWalletAddress =
    process.env.GALA_MASTER_NODE_WALLET_ADDRESS;
  public readonly defaultReferredBy = process.env.DEFAULT_REFERRED_BY || '';
  public readonly sentryDsn = env.SENTRY_DSN;

  public readonly linkShortenerUrl =
    env.LINK_SHORTENER_URL.length > 1 ? env.LINK_SHORTENER_URL : '';

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
      'COMPANY_FEE_ETH_ADDRESS',
      'ZENDESK_API_KEY',
      'REWARD_DISTRIBUTOR_ETH_PKEY',
      'SENDGRID_API_KEY',
      'SENDGRID_EMAIL_FROM',
      'BASE_NUMBER_OF_SHARES',
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
      'SUPPORTS_BTC_PUBSUB',
      'DISPLAYED_WALLETS',
      'REFERRAL_LINK_DOMAIN',
      'ACTION_REWARDS_API_URL',
      'ZENDESK_URL',
      'SENTRY_DSN',
      'LINK_SHORTENER_URL',
      'GALA_ITEM_CONTRACT_ADDRESS',
      'ERC20_GAS_VALUE',
    ].filter(name => !env[name]);
    if (missingEnvVariables.length > 0) {
      throw new Error(
        `Required environment variable(s) ${missingEnvVariables.join(
          ', ',
        )} undefined.`,
      );
    }
  }

  public logConfigAtStartup = () => {
    [
      ['ETH_NODE', this.ethNodeUrl],
      ['DISPLAYED_WALLETS', this.displayedWallets.join(',')],
      ['INDEXED_TRANSACTIONS', this.indexedTransactions],
      ['LINK_SHORTENER_URL', this.linkShortenerUrl],
      ['GALA_MASTER_NODE_WALLET_ADDRESS', this.galaMasterNodeWalletAddress],
    ].forEach(([label, value]) => {
      systemLogger.info(`CONFIG: ${label}=${value}`);
    });
  };

  private getBrandFromHost() {
    const hostName = env.HOSTNAME.toLowerCase();
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
      return env.BRAND || 'localhost';
    }
  }

  public async setConnectMongoConnection() {
    const connectMongoUrl = env.CONNECT_MONGODB_URI;
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
