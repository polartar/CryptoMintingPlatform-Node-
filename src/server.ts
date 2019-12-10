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
  SendEmail,
} from './data-sources';
import { WalletApi } from './wallet-api';
import { removeListeners } from './blockchain-listeners';
import { Logger, winstonLogger, systemLogger } from './common/logger';
import { dailyWalletStatsCron } from './cron';

class Server {
  public app: express.Application = express();
  public httpServer: http.Server;
  public walletApi: WalletApi;

  constructor() {
    autoBind(this);
    const { isDev, hostname } = config;

    const typeDefs: DocumentNode = gql(schemas);
    this.walletApi = new WalletApi(hostname);

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: this.buildContext,
      dataSources: this.buildDataSources,
      introspection: isDev,
      playground: isDev
        ? { settings: { 'request.credentials': 'include' } }
        : false,
      subscriptions: {
        onDisconnect: async (socket, context) => {
          const { token } = await context.initPromise;
          if (token) {
            const user = new UserApi(token);
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

  private buildContext({
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
        user = new UserApi(token);
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
      zendesk: new Zendesk(),
      sendEmail: new SendEmail(),
    };
  }

  private listen() {
    this.httpServer.listen(config.port, () =>
      systemLogger.info(`🚀 Server ready on port ${config.port}`),
    );
  }

  public async initialize() {
    try {
      await this.connectToMongodb();
      // dailyWalletStatsCron.schedule(config.dailyWalletStatsCronExpression);
      this.listen();
    } catch (error) {
      throw error;
    }
  }

  private async connectToMongodb() {
    return new Promise((resolve, reject) => {
      set('useCreateIndex', true);
      set('useNewUrlParser', true);
      set('useFindAndModify', false);
      connect(config.mongodbUri);
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
