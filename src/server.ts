import * as express from 'express';
import { ApolloServer, gql } from 'apollo-server-express';
import { DocumentNode } from 'graphql';
import schemas from './schemas';
import resolvers from './resolvers';
import { Wallet, UserApi, CryptoFavorites } from './data-sources';
import { config, logger, auth } from './common';
import autoBind = require('auto-bind');

class Server {
  public app: express.Application = express();

  constructor() {
    autoBind(this);
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

  private parseOrigin(origin: string) {
    const {
      supportedOrigins: { dev, prod },
    } = config;
    // Prod origins
    if (origin === undefined || origin.includes(dev.local)) return dev.local;
    // Stage and dev origins
    if (origin.includes(dev.green)) return dev.green;
    if (origin.includes(dev.connect)) return dev.connect;
    if (origin.includes(dev.codex)) return dev.codex;
    if (origin.includes(prod.green)) return prod.green;
    if (origin.includes(prod.connect)) return prod.connect;
    if (origin.includes(prod.codex)) return prod.codex;
    throw new Error(`Origin:${origin} not supported`);
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
    const domain = this.parseOrigin(req.get('origin'));
    let user = null;
    if (token) {
      try {
        const decodedToken = auth.verifyAndDecodeToken(token, domain);
        user = new UserApi(domain, decodedToken.claims);
      } catch (error) {
        user = null;
      }
    }
    const wallet = new Wallet(domain);

    return { req, res, user, domain, wallet };
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
      this.listen();
    } catch (error) {
      throw error;
    }
  }
}

export default new Server();
