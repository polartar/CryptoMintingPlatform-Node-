import * as express from 'express';
import { ApolloServer, gql } from 'apollo-server-express';
import { DocumentNode } from 'graphql';
import schemas from './schemas';
import resolvers from './resolvers';
import { UserApi, CryptoFavorites } from './data-sources';
import { WalletApi } from './wallet-api'
import { config, logger, auth } from './common';
import autoBind = require('auto-bind');
import { connect, set, connection } from 'mongoose';

class Server {
  public app: express.Application = express();
  public walletApi: WalletApi
  constructor() {
    autoBind(this);
    const { isDev, hostname } = config
    const typeDefs: DocumentNode = gql(schemas);
    this.walletApi = new WalletApi(hostname)
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: this.buildContext,
      dataSources: this.buildDataSources,
      introspection: isDev,
      playground: isDev,
    });

    server.applyMiddleware({
      app: this.app,
      cors: isDev,
    });
  }

  private buildContext({
    req,
    res,
  }: {
    req: express.Request;
    res: express.Response;
  }) {
    const { hostname } = config;
    const token = req.headers.authorization
      ? req.headers.authorization.replace('Bearer ', '')
      : '';
    logger.debug(`server.buildContext.token: ${token}`)
    let user = null;
    if (token) {
      try {
        const { claims } = auth.verifyAndDecodeToken(token, hostname)
        logger.debug(`server.buildContext.claims: ${claims}`)
        user = new UserApi(claims);
      } catch (error) {
        logger.warn(`server.buildContext.catch: ${error}`)
        user = null;
      }
    }

    return { req, res, user, wallet: this.walletApi };
  }

  private buildDataSources() {
    return {
      cryptoFavorites: new CryptoFavorites(),
    };
  }

  private listen() {
    this.app.listen({ port: config.port }, () =>
      logger.info(`🚀 Server ready at http://localhost:${config.port}`),
    );
  }

  public async initialize() {
    try {
      await this.connectToMongodb()
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
      connection.once('open', () => {
        logger.info(`Connected to mongoDb`);
        resolve();
      });
      connection.on('error', error => {
        reject(error);
      });
    });
  }
}

export default new Server();
