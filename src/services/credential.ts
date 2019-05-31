import config from '../common/config';
const jwt = require('jsonwebtoken');
import axios from 'axios';
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

  constructor() {
    autoBind(this);
  }

  private sign(
    payload: string | Buffer | object,
    options: SignOptions = {},
  ): string {
    const combinedOptions = Object.assign(options, this.jwtOptions);
    const token = jwt.sign(payload, config.jwtPrivateKey, combinedOptions);
    return token;
  }

  public getAxios(payload: string | Buffer | object, options?: SignOptions) {
    const token = this.sign(payload, options);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.headers.post['Content-Type'] = 'application/json';
    axios.defaults.headers.put['Content-Type'] = 'application/json';
    return axios;
  }

  public async create(
    userId: string,
    coin: string,
    resource: string,
    payload: string,
  ) {
    const resourceKey = `${coin}-${resource}`;
    const apiKeyUrl = `${config.apiKeyServiceUrl}/`;
    const jwtAxios = this.getAxios({
      userId,
      accountId: resourceKey,
    });
    const createResponse = await jwtAxios.post(apiKeyUrl, {
      userId: userId,
      accountId: resourceKey,
      apiKey: payload,
    });
    return createResponse;
  }

  public async get(userId: string, coin: string, resource: string) {
    const resourceKey = `${coin}-${resource}`;
    const apiKeyUrl = `${config.apiKeyServiceUrl}/${userId}/${resourceKey}`;
    const jwtAxios = this.getAxios({
      userId,
      accountId: resourceKey,
    });
    const response = await jwtAxios.get(apiKeyUrl, {
      params: {
        userId: userId,
      },
    });
    return response.data;
  }
}

export default new CredentialService();
