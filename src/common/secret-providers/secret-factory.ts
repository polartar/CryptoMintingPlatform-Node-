import { awsSecrets } from './aws-secrets';
import { localSecrets } from './local-secrets';
import { Secrets } from '../../types/secret';

class SecretsFactory {
  public getSecretInstance(): Secrets {
    if (process.env.AWS_EXECUTION_ENV) {
      return awsSecrets;
    }

    return localSecrets;
  }
}

export const secretsFactory = new SecretsFactory();
