import { keys } from '../common';
import { ServerAuth } from '@blockbrothers/firebasebb'
import { config } from '../common/';
export default new ServerAuth({
  serviceAccounts: keys.serviceAccounts,
  mongoDbInfo: {
    connectionString: config.mongodbUri,
    domain: config.hostname
  },
});
