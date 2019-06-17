import { keys, config } from '../common';
const ServerAuth = require('@blockbrothers/firebasebb/dist/src/Server').default;
const dbs = Array.from(config.authDbConnectionMap.entries()).map(
  ([domain, db]) => ({ db, domain }),
);
export default new ServerAuth({
  serviceAccounts: keys.serviceAccounts,
  dbs,
});
