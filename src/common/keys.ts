import * as fs from 'fs';
import { env } from './env';

// Generate keys with
// KEYNAME=${1:-jwtrsa}
// openssl genrsa -out $KEYNAME-private.key 2048 && openssl rsa -in $KEYNAME-private.key -outform PEM -pubout -out $KEYNAME-public.pem
class Keys {
  public readonly privateKey = fs.readFileSync('jwtrsa-private.key');
  public readonly publicKey = fs.readFileSync('jwtrsa-public.pem');
  public serviceAccounts: any;
  public serviceAccountKeys: any;

  constructor() {
    const rawServiceAccounts = JSON.parse(
      fs.readFileSync('serviceAccountKey.json').toString(),
    );
    this.serviceAccounts = Object.entries(rawServiceAccounts).map(entry => {
      const [domain, serviceAccount]: any[] = entry;

      if (domain.includes(env.BRAND)) {
        serviceAccount.domain = env.APP_HOSTNAME;
      } else {
        serviceAccount.domain = domain;
      }

      return serviceAccount;
    });
    this.serviceAccountKeys = Object.entries(rawServiceAccounts).map(entry => {
      const [domain]: any[] = entry;
      return domain;
    });
  }
}

const keys = new Keys();
export default keys;
