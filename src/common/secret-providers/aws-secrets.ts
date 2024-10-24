import { SecretsManager } from 'aws-sdk';
import { Secrets } from '../../types/secret';

class AwsSecrets implements Secrets {
  private readonly client: SecretsManager;

  constructor() {
    this.client = new SecretsManager({
      region: process.env.AWS_REGION,
    });
  }

  public async getSecretValue(secretName: string) {
    const data = await this.client
      .getSecretValue({ SecretId: secretName })
      .promise();

    if (!data) {
      return undefined;
    }

    if ('SecretString' in data) {
      try {
        const secret = JSON.parse(data.SecretString);

        return secret;
      } catch {
        return data.SecretString;
      }
    }

    if ('SecretBinary' in data && data.SecretBinary) {
      const binary = data.SecretBinary.toString();
      const buff = Buffer.from(binary, 'base64');
      const decodedBinarySecret = buff.toString('ascii');

      return decodedBinarySecret;
    }

    return undefined;
  }
}

export const awsSecrets = new AwsSecrets();
