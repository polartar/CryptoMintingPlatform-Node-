import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as autoBind from 'auto-bind';
import keys from './keys';
import { createConnection, Connection } from 'mongoose';
import SupportedCoins from './CoinsSupported';
import * as path from 'path';

dotenv.config({ path: '.env' });

class Config {
  public readonly nodeEnv = process.env.NODE_ENV;
  public readonly logLevel = process.env.LOG_LEVEL;
  public readonly port = this.normalizePort(process.env.PORT);
  public readonly hostname = process.env.HOSTNAME;
  public readonly mongodbUri: undefined;
  public readonly supportedCoins = new SupportedCoins();

  public readonly supportedOrigins = {
    dev: {
      codex: 'stage0.wallet.codexunited.com',
      green: 'stage0.wallet.share.green',
      connect: 'stage0.wallet.connectblockchain.net',
      local: 'localhost',
    },
    prod: {
      codex: 'wallet.codexunited.com',
      green: 'wallet.share.green',
      connect: 'wallet.connectblockchain.net',
    },
  };
  public readonly jwtPrivateKey = keys.privateKey;
  public readonly jwtPublicKey = keys.publicKey;
  public readonly serviceAccounts = keys.serviceAccounts;
  public readonly defaultCryptoFavorites = ['BTC', 'ETH', 'LTC', 'XRP'];
  public readonly apiKeyServiceUrl = process.env.API_KEY_SERVICE_URL;
  public readonly etherScanApiKey = process.env.ETHERSCAN_API_KEY;
  public readonly erc20FeeCalcAddress = process.env.ETH_ADD_FOR_ERC20_FEE_CALC;
  public readonly authDbConnectionMap: Map<
    string,
    Connection
  > = this.mapAuthDbConnections();
  public readonly cryptoSymbolToNameMap: Map<
    string,
    string
  > = this.mapSymbolToName();
  public readonly bcoinWallet = {
    host: process.env.BCOIN_WALLET_HOST,
    ssl:
      process.env.BCOIN_WALLET_SSL &&
      process.env.BCOIN_WALLET_SSL.toLowerCase() === 'true',
    uri: process.env.BCOIN_NETWORK,
    walletAuth: true,

    network: process.env.BCOIN_NETWORK,
    port: +process.env.BCOIN_WALLET_PORT,
    apiKey: process.env.BCOIN_WALLET_API_KEY,
  };
  public readonly ethNodeUrl =
    process.env.ETH_NETWORK === 'testnet'
      ? 'https://ropsten.infura.io'
      : 'https://eth.share.green';

  public readonly btcTxLink =
    process.env.BCOIN_NETWORK === 'testnet'
      ? 'https://live.blockcypher.com/btc-testnet/tx'
      : 'https://live.blockcypher.com/btc/tx';

  public readonly ethTxLink =
    process.env.ETH_NETWORK === 'testnet'
      ? 'https://ropsten.etherscan.io/tx'
      : 'https://etherscan.io/tx';

  public readonly etherscanUrl =
    process.env.ETH_NETWORK === 'testnet'
      ? 'http://api-ropsten.etherscan.io/api'
      : 'http://api.etherscan.io/api';

  constructor() {
    autoBind(this);
    this.ensureRequiredVariables();
  }

  private ensureRequiredVariables() {
    // required environment variables
    const missingEnvVariables = [
      'NODE_ENV',
      'LOG_LEVEL',
      'PORT',
      'HOSTNAME',
      'BCOIN_NETWORK',
      'BCOIN_WALLET_PORT',
      'BCOIN_WALLET_API_KEY',
      'BCOIN_WALLET_HOST',
      'BCOIN_WALLET_SSL',
      'API_KEY_SERVICE_URL',
      'ETH_NETWORK',
      'ETHERSCAN_API_KEY',
      'ETH_ADD_FOR_ERC20_FEE_CALC',
    ].filter(name => !process.env[name]);

    if (missingEnvVariables.length > 0) {
      throw new Error(
        `Required environment variable(s) ${missingEnvVariables.join(
          ', ',
        )} undefined.`,
      );
    }
  }

  private normalizePort(val: string) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
      // named pipe
      throw new Error('port is not a number');
    }

    if (port >= 0) {
      // port number
      return port;
    }

    throw new Error('port is less than 0');
  }

  private mapAuthDbConnections() {
    const rawConnections = JSON.parse(
      fs.readFileSync('authDbConnections.json').toString(),
    );
    const domainDbMap = new Map();

    Object.entries(rawConnections).forEach(entry => {
      const [domain, dbConnectionString]: any[] = entry;
      domainDbMap.set(
        domain,
        createConnection(dbConnectionString, {
          useNewUrlParser: true,
          useFindAndModify: false,
        }),
      );
    });

    return domainDbMap;
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
