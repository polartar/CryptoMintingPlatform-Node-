import * as fs from 'fs';

// Generate keys with
// KEYNAME=${1:-jwtrsa}
// openssl genrsa -out $KEYNAME-private.key 2048 && openssl rsa -in $KEYNAME-private.key -outform PEM -pubout -out $KEYNAME-public.pem
class Keys {
  public readonly privateKey = fs.readFileSync('jwtrsa-private.key');
  public readonly publicKey = fs.readFileSync('jwtrsa-public.pem');
}

const keys = new Keys();
export default keys;
