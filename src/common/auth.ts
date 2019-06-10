import { keys, config } from '../common';
const ServerAuth = require('@blockbrothers/firebasebb/dist/src/Server').default;

export default new ServerAuth({
  serviceAccounts: keys.serviceAccounts,
  dbs: config.authDbConnections,
});
