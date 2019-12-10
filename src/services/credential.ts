import { config, logger } from '../common';
const jwt = require('jsonwebtoken');
import axios, { AxiosError } from 'axios';
const autoBind = require('auto-bind');

interface SignOptions {
  /**
   * Signature algorithm. Could be one of these values :
   * - HS256:    HMAC using SHA-256 hash algorithm (default)
   * - HS384:    HMAC using SHA-384 hash algorithm
   * - HS512:    HMAC using SHA-512 hash algorithm
   * - RS256:    RSASSA using SHA-256 hash algorithm
   * - RS384:    RSASSA using SHA-384 hash algorithm
   * - RS512:    RSASSA using SHA-512 hash algorithm
   * - ES256:    ECDSA using P-256 curve and SHA-256 hash algorithm
   * - ES384:    ECDSA using P-384 curve and SHA-384 hash algorithm
   * - ES512:    ECDSA using P-521 curve and SHA-512 hash algorithm
   * - none:     No digital signature or MAC value included
   */
  algorithm?: string;
  keyid?: string;
  /** @member {string} - expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms.js).  Eg: 60, "2 days", "10h", "7d" */
  expiresIn?: string | number;
  /** @member {string} - expressed in seconds or a string describing a time span [zeit/ms](https://github.com/zeit/ms.js).  Eg: 60, "2 days", "10h", "7d" */
  notBefore?: string | number;
  audience?: string | string[];
  subject?: string;
  issuer?: string;
  jwtid?: string;
  noTimestamp?: boolean;
  header?: object;
  encoding?: string;
}

class CredentialService {
  private readonly jwtOptions = {
    algorithm: 'RS256',
    expiresIn: '1m',
    issuer: 'urn:connectTrader',
    audience: 'urn:connectTrader',
    subject: 'connectTrader:subject',
  };
  private apiKeyUrl = `${config.apiKeyServiceUrl}/api-keys`;
  private healthUrl = `${config.apiKeyServiceUrl}/health`;

  constructor() {
    autoBind(this);
  }

  private sign(
    payload: string | Buffer | object,
    options: SignOptions = {},
  ): string {
    try {
      logger.debug(`services.credential.sign`);
      const combinedOptions = Object.assign(options, this.jwtOptions);
      const token = jwt.sign(payload, config.jwtPrivateKey, combinedOptions);
      logger.debug(`services.credential.sign.token.length: ${token.length}`);
      return token;
    } catch (error) {
      logger.warn(`services.credential.sign.catch: ${error}`);
      throw error;
    }
  }

  public getAxios(payload: string | Buffer | object, options?: SignOptions) {
    try {
      const token = this.sign(payload, options);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.post['Content-Type'] = 'application/json';
      axios.defaults.headers.put['Content-Type'] = 'application/json';
      return axios;
    } catch (error) {
      logger.warn(`services.credential.getAxios.catch: ${error}`);
      throw error;
    }
  }

  public async create(
    userId: string,
    coin: string,
    resource: string,
    payload: string,
  ) {
    try {
      logger.debug(`services.credential.create.userId: ${userId}`);
      logger.debug(`services.credential.create.coin: ${coin}`);
      logger.debug(`services.credential.create.resource: ${resource}`);
      const resourceKey = `${coin}-${resource}`;
      const apiKeyUrl = `${this.apiKeyUrl}/`;
      const jwtAxios = this.getAxios({
        userId,
        accountId: resourceKey,
      });
      logger.debug(`services.credential.create:before`);
      const createResponse = await jwtAxios.post(apiKeyUrl, {
        userId: userId,
        accountId: resourceKey,
        apiKey: payload,
      });
      logger.debug(
        `services.credential.create.createResponse.status: ${
          createResponse.status
        }`,
      );
      return createResponse;
    } catch (error) {
      logger.warn(`services.credential.create.catch`, error);
      throw error;
    }
  }

  public async get(userId: string, coin: string, resource: string) {
    try {
      logger.debug(`services.credential.get.userId: ${userId}`);
      logger.debug(`services.credential.get.coin: ${coin}`);
      logger.debug(`services.credential.get.resource: ${resource}`);
      const resourceKey = `${coin}-${resource}`;
      const apiKeyUrl = `${this.apiKeyUrl}/${userId}/${resourceKey}`;
      const jwtAxios = this.getAxios({
        userId,
        accountId: resourceKey,
      });
      logger.debug(`services.credential.get:before`);
      const response = await jwtAxios.get(apiKeyUrl, {
        params: {
          userId: userId,
        },
      });
      logger.debug(
        `services.credential.get.response.status,statusText: ${
          response.status
        }, ${response.statusText}`,
      );
      return response.data;
    } catch (error) {
      logger.warn(`services.credential.get.catch: ${error}`);
      throw error;
    }
  }

  public handleErrResponse(error: AxiosError, messageIf404: string) {
    logger.warn(`services.credential.handleErrorResponse:${error}`);
    if (error.response && error.response.status === 404) {
      throw new Error(messageIf404);
    }
    throw error;
  }

  public async checkHealth(userId: string) {
    try {
      const jwtAxios = this.getAxios({
        userId,
      });

      const response = await jwtAxios.get(`${this.healthUrl}/`);
      return response.data.redis.ok === true;
    } catch (error) {
      logger.warn(`services.credential.checkHealth.catch: ${error}`);
      return false;
    }
  }
}

export default new CredentialService();
