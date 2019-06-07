import { keys, config } from '../common';
import { createConnection } from 'mongoose';
const ServerAuth = require('@blockbrothers/firebasebb/dist/src/Server').default;

export default new ServerAuth({
  serviceAccounts: keys.serviceAccounts,
  dbs: [
    {
      domain: 'share.green',
      db: createConnection(config.mongodbUri.green),
    },
    {
      domain: 'localhost',
      db: createConnection(config.mongodbUri.connect),
    },
    {
      domain: 'codexunited.com',
      db: createConnection(config.mongodbUri.codex),
    },
  ],
});
