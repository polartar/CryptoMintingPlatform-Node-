import * as http from 'http';
import * as express from 'express';
import { ApolloServer, gql } from 'apollo-server-express';
import { DocumentNode } from 'graphql';
import autoBind = require('auto-bind');
import { connect, set, connection as mongooseConnection } from 'mongoose';
import { ExecutionParams } from 'subscriptions-transport-ws';
import schemas from './schemas';
import resolvers from './resolvers';
import { config } from './common';
import {
  UserApi,
  CryptoFavorites,
  WalletConfig,
  Bitly,
  Zendesk,
  Blockfunnels,
  SendEmail,
  LinkShortener,
  GalaEmailer,
} from './data-sources';
import { walletApi } from './wallet-api';
import { removeListeners } from './blockchain-listeners';
import { Logger, winstonLogger, systemLogger, logMessage } from './common/logger';
import { Wallet } from 'ethers';
import restApi from './rest/routes';
import * as cors from 'cors';

class Server {
  public app: express.Application = express();
  public httpServer: http.Server;
  public walletApi = walletApi;

  constructor() {
    autoBind(this);
    const { isDev, isStage } = config;

    const typeDefs: DocumentNode = gql(schemas);
    const isGqlDev = isDev || isStage;

    const corsOptions = {
      origin: function(origin: string, callback: any) {
        if (config.corsWhitelist.indexOf(origin) !== -1 || !origin) {
          callback(null, true);
        } else if (isDev || isStage) {
          callback(null, true);
        } else {
          callback(systemLogger.warn(`Bad CORS origin: ${origin}`));
        }
      },
    };

    this.app.use(cors(corsOptions));
    this.app.use('/', restApi);

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: this.buildContext,
      dataSources: this.buildDataSources,
      introspection: isGqlDev,
      playground: isGqlDev
        ? { settings: { 'request.credentials': 'include' } }
        : false,
      subscriptions: {
        onDisconnect: async (socket, context) => {
          const { token } = await context.initPromise;
          if (token) {
            const user = await UserApi.fromIdToken(token);
            await removeListeners(user.userId);
          }
        },
      },
    });

    server.applyMiddleware({
      app: this.app,
      cors: corsOptions,
    });

    this.httpServer = http.createServer(this.app);
    server.installSubscriptionHandlers(this.httpServer);
  }

  private getToken(connection: ExecutionParams, req: express.Request): string | null {
    if (connection?.context.token) {
      return connection.context.token;
    } else if (req?.headers.authorization) {
      return req.headers.authorization.replace(/bearer /gi, '');
    }

    return null;
  }

  private async buildContext({
    req,
    res,
    connection,
  }: {
    req: express.Request;
    res: express.Response;
    connection: ExecutionParams;
  }) {
    const logger = new Logger(winstonLogger);
    let user = null;
    const token = this.getToken(connection, req);

    if (token) {
      try {
        user = await UserApi.fromIdToken(token);
        logger.startSession(user.userId);
      } catch (error) {
        logger.startSession();
        logger.warn(`server.buildContext.catch: ${error}`);
        user = null;
      }
    }

    return { req, res, user, wallet: this.walletApi, logger };
  }

  private buildDataSources() {
    return {
      cryptoFavorites: new CryptoFavorites(),
      environment: new WalletConfig(),
      bitly: new Bitly(),
      linkShortener:
        config.linkShortenerUrl.length > 1 ? new LinkShortener() : new Bitly(),
      zendesk: new Zendesk(),
      sendEmail: new SendEmail(),
      blockfunnels: new Blockfunnels(),
      galaEmailer: new GalaEmailer(),
    };
  }

  private listen() {
    this.httpServer.listen(config.port, () =>
      systemLogger.info(
        `🚀 ${config.brand.toUpperCase()} Wallet-Server ready on port ${
          config.port
        }`,
      ),
    );
  }

  public async initialize() {
    try {
      this.logRewardDistributerAddress();
      await this.connectToMongodb();
      this.listen();
      logMessage.logConfigAtStartup();
    } catch (error) {
      throw error;
    }
  }

  private logRewardDistributerAddress = () => {
    systemLogger.info(
      `Reward distributer address: ${
        new Wallet(config.rewardDistributerPkey).address
      }`,
    );
  };

  private async connectToMongodb() {
    return new Promise(resolve => {
      set('useCreateIndex', true);
      set('useNewUrlParser', true);

      connect(config.mongodbUri, { useNewUrlParser: true, useUnifiedTopology: true });

      mongooseConnection.once('open', () => {
        systemLogger.info(`Connected to mongoDb`);
        resolve();
      });
      mongooseConnection.on('error', error => {
        console.warn(error);
      });
    });
  }
}

export default new Server();
