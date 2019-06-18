import * as express from 'express';
import { ApolloServer, gql } from 'apollo-server-express';
import { DocumentNode } from 'graphql';
import schemas from './schemas';
import resolvers from './resolvers';
import { Wallet, UserApi, CryptoFavorites } from './data-sources';
import { config, logger, auth } from './common';

class Server {
  public app: express.Application = express();

  constructor() {
    const isDev = process.env.NODE_ENV === 'development';
    const typeDefs: DocumentNode = gql(schemas);

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
    const token = req.headers.authorization
      ? req.headers.authorization.replace('Bearer ', '')
      : '';
    const origin = req.get('origin');
    const domain = origin
      ? origin.replace(/https?:\/\//, '').replace(/:\d+/, '')
      : 'localhost';
    let user = null;
    if (token) {
      try {
        const decodedToken = auth.verifyAndDecodeToken(token, domain);
        user = new UserApi(domain, decodedToken.claims);
      } catch (error) {
        user = null;
      }
    }

    return { req, res, user, domain };
  }

  private buildDataSources() {
    return {
      wallet: new Wallet(),
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
      this.listen();
    } catch (error) {
      throw error;
    }
  }
}

export default new Server();
