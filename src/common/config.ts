import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as autoBind from 'auto-bind';
import keys from './keys';
const ServerAuth = require('@blockbrothers/firebasebb/dist/src/Server').default;
import * as supportedCoins from './supportedCoins.json';

dotenv.config({ path: '.env' });

class Config {
  public readonly nodeEnv = process.env.NODE_ENV;
  public readonly logLevel = process.env.LOG_LEVEL;
  public readonly port = this.normalizePort(process.env.PORT);
  public readonly hostname = process.env.HOSTNAME;
  public readonly mongodbUri = process.env.MONGODB_URI;
  public readonly supportedCoins = supportedCoins;
  public readonly jwtPrivateKey = keys.privateKey;
  public readonly jwtPublicKey = keys.publicKey;
  public readonly apiKeyServiceUrl = process.env.API_KEY_SERVICE_URL;
  public readonly bcoinWallet = {
    network: process.env.BCOIN_NETWORK,
    port: +process.env.BCOIN_WALLET_PORT,
    apiKey: process.env.BCOIN_WALLET_API_KEY,
  };
  public readonly ethNodeUrl =
    process.env.ETH_NETWORK === 'testnet'
      ? 'https://ropsten.infura.io/'
      : 'https://eth.share.green';

  public auth = new ServerAuth({
    serviceAccounts: this.getServiceAccounts(),
    mongoDbInfo: {
      connectionString: this.mongodbUri,
      domain: this.hostname,
    },
  });

  constructor() {
    autoBind(this);
    this.ensureRequiredVariables();
  }

  private ensureRequiredVariables() {
    // required environment variables
    [
      'NODE_ENV',
      'LOG_LEVEL',
      'PORT',
      'HOSTNAME',
      'MONGODB_URI',
      'BCOIN_NETWORK',
      'BCOIN_WALLET_PORT',
      'BCOIN_API_KEY',
      'API_KEY_SERVICE_URL',
    ].forEach(name => {
      if (!process.env[name]) {
        throw new Error(`Environment variable ${name} is missing`);
      }
    });
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

  private getServiceAccounts() {
    const rawServiceAccounts = JSON.parse(
      fs.readFileSync('service-accounts.json').toString(),
    );

    const serviceAccounts = Object.entries(rawServiceAccounts).map(entry => {
      const [domain, serviceAccount]: any[] = entry;
      serviceAccount.domain = domain;
      return serviceAccount;
    });

    return serviceAccounts;
  }
}

const config = new Config();

export default config;
