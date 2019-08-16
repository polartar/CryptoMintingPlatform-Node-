import * as fs from 'fs';
import * as path from 'path'
import * as dotenv from 'dotenv';
import * as autoBind from 'auto-bind';
import keys from './keys';

dotenv.config({ path: '.env' });

class Config {
  public readonly nodeEnv = process.env.NODE_ENV;
  public readonly logLevel = process.env.LOG_LEVEL;
  public readonly port = this.normalizePort(process.env.PORT);
  public readonly hostname = process.env.HOSTNAME;
  public readonly mongodbUri = process.env.MONGODB_URI;
  public readonly jwtPrivateKey = keys.privateKey;
  public readonly jwtPublicKey = keys.publicKey;
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
    process.env.CLIENT_SECRET_KEY_REQUIRED === 'true'
  public readonly erc20FeeCalcAddress = process.env.ETH_ADD_FOR_ERC20_FEE_CALC;
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

  public readonly etherscanNetwork =
    process.env.ETH_NETWORK === 'testnet' ? 'ropsten' : 'homestead';

  public readonly btcTxLink =
    process.env.BCOIN_NETWORK === 'testnet'
      ? 'https://live.blockcypher.com/btc-testnet/tx'
      : 'https://live.blockcypher.com/btc/tx';

  public readonly ethTxLink =
    process.env.ETH_NETWORK === 'testnet'
      ? 'https://ropsten.etherscan.io/tx'
      : 'https://etherscan.io/tx';

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
    console.log('process', process.env.CLIENT_SECRET_KEY_REQUIRED);
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
