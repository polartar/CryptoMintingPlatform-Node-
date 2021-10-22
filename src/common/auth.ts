import { ServerAuth } from '@blockbrothers/firebasebb';
import { keys, config } from 'src/common';

export default new ServerAuth(
  {
    serviceAccounts: keys.serviceAccounts,
    mongoDbInfo: {
      connectionString: config.mongodbUri,
      domain: config.hostname,
    },
    sentryDsn: config.sentryDsn,
  },
  config.brand === 'gala' ? 'id' : 'custom',
);
