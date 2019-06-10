import * as express from 'express';
import { ApolloServer, gql } from 'apollo-server-express';
import { DocumentNode } from 'graphql';
import * as mongoose from 'mongoose';
import schemas from './schemas';
import resolvers from './resolvers';
import { Wallet, Account } from './data-sources';
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
        user = decodedToken.claims;
      } catch (error) {
        user = null;
      }
    }

    return { req, res, user, domain };
  }

  private buildDataSources() {
    return {
      wallet: new Wallet(),
      accounts: new Account(),
    };
  }

  private listen() {
    this.app.listen({ port: config.port }, () =>
      logger.info(`🚀 Server ready at http://localhost:${config.port}`),
    );
  }

  private connectToMongo() {
    return new Promise((resolve, reject) => {
      // Suppress deprecation warning
      mongoose.set('useCreateIndex', true);
      mongoose.set('useFindAndModify', false);
      mongoose.connect(config.walletMongo, { useNewUrlParser: true });

      mongoose.connection.once('open', () => {
        logger.info(`Connected to mongoDb`);
        resolve();
      });

      mongoose.connection.on('error', error => {
        logger.info('mongo error');
        reject(error);
      });
    });
  }

  public async initialize() {
    try {
      await this.connectToMongo();
      this.listen();
    } catch (error) {
      throw error;
    }
  }
}

export default new Server();
