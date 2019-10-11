import * as http from 'http';
import * as express from 'express';
import { ApolloServer, gql } from 'apollo-server-express';
import { DocumentNode } from 'graphql';
import autoBind = require('auto-bind');
import { connect, set, connection as mongooseConnection } from 'mongoose';
import { ExecutionParams } from 'subscriptions-transport-ws';
import schemas from './schemas';
import resolvers from './resolvers';
import {
  UserApi,
  CryptoFavorites,
  Environment,
  Bitly,
  Zendesk,
} from './data-sources';
import { WalletApi } from './wallet-api';
import { config, logger } from './common';
import { removeListeners } from './blockchain-listeners';

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
      token = req.headers.authorization
        ? req.headers.authorization.replace('Bearer ', '')
        : '';
    }

    logger.debug(`server.buildContext.token.length: ${token && token.length}`);
    let user = null;
    if (token) {
      try {
        user = new UserApi(token);
      } catch (error) {
        logger.warn(`server.buildContext.catch: ${error}`);
        user = null;
      }
    }
    return { req, res, user, wallet: this.walletApi };
  }

  private buildDataSources() {
    return {
      cryptoFavorites: new CryptoFavorites(),
      environment: new Environment(),
      bitly: new Bitly(),
      zendesk: new Zendesk(),
    };
  }

  private listen() {
    this.httpServer.listen(config.port, () =>
      logger.info(`🚀 Server ready on port ${config.port}`),
    );
  }

  public async initialize() {
    try {
      await this.connectToMongodb();
      this.listen();
    } catch (error) {
      throw error;
    }
  }

  private async connectToMongodb() {
    return new Promise((resolve, reject) => {
      set('useCreateIndex', true);
      connect(
        config.mongodbUri,
        { useNewUrlParser: true },
      );
      mongooseConnection.once('open', () => {
        logger.info(`Connected to mongoDb`);
        resolve();
      });
      mongooseConnection.on('error', error => {
        reject(error);
      });
    });
  }
}

export default new Server();
