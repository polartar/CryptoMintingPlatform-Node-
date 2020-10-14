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
import { Logger, winstonLogger, systemLogger } from './common/logger';
import { Wallet } from 'ethers';
import restApi from './rest/routes';

class Server {
  public app: express.Application = express();
  public httpServer: http.Server;
  public walletApi = walletApi;

  constructor() {
    autoBind(this);
    const { isDev, isStage } = config;

    const typeDefs: DocumentNode = gql(schemas);
    const isGqlDev = isDev || isStage;

    this.app.use('/api', restApi);

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
      cors: isDev ? { credentials: true, origin: true } : false,
    });

    this.httpServer = http.createServer(this.app);
    server.installSubscriptionHandlers(this.httpServer);
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
    let token;
    if (connection && connection.context && connection.context.token) {
      token = connection.context.token;
    } else {
      token =
        req && req.headers && req.headers.authorization
          ? req.headers.authorization.replace('Bearer ', '')
          : '';
    }

    let user = null;
    const logger = new Logger(winstonLogger);
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
      config.logConfigAtStartup();
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
      set('useFindAndModify', false);
      connect(config.mongodbUri, { useNewUrlParser: true });
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
