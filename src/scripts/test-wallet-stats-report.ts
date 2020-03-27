import * as mongoose from 'mongoose';
import * as fs from 'fs';
import runner from '../cron/daily-wallet-stats';

void (async () => {
  await mongoose.connect('');
  const [email] = await runner.run(
    [
      {
        rowsToInclude: ['gala', 'connect', 'green', 'codex'],
        sendTo: 'test@blockchainjedi.com',
      },
    ],
    false,
  );
  fs.writeFileSync('report.html', email);
})();
