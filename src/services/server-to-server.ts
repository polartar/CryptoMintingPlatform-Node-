import axios from 'axios';
import { logger, config } from '../common';
import { IJwtSignOptions } from '../types';
const jwt = require('jsonwebtoken');

export class ServerToServerService {
  private readonly jwtOptions = {
    algorithm: 'RS256',
    expiresIn: '1m',
    issuer: 'urn:connectTrader',
    audience: 'urn:connectTrader',
    subject: 'connectTrader:subject',
  };

  public sign(
    payload: string | Buffer | object,
    options: IJwtSignOptions = {},
  ): string {
    try {
      const privatekey = [
        '-----BEGIN RSA PRIVATE KEY-----',
        'MIIEpQIBAAKCAQEAveQF0MvS7KvSOYh4LosTW/6cfMkEiJXE7ynkzDYN4xLRwBHU',
        '/mNE9eTrgCheOXY+b3jt0hEMc2DlOwkF+Z7VUbRPvR3NcHERCFG2Jn/naJnRIbqi',
        'Ttd/P34O/UTKFQdE8COypZdRpsnZG7v5ZpXFHpNAGbeSYHY+sPOs8eAtZgzi6m9k',
        'txmF5qCkYXLfxqIli2lz7fG6vL2yr6vywZj3kPcR0ywmX5FIfS8K7zPX99aRa0ua',
        'hypFtIQz1ZE9myrj9kSH3PPVY1uEe+mCXKwujaQdElnQW+iiWeEag1fDK6sAkCnD',
        'ZkSy1fEb5r+h25wjjQpz3L8dabb/2UTEq25JtwIDAQABAoIBAQCwY3iXfE4AtJaC',
        'BOeGbH/eK4OXUm7YpS6a7rJukyORM7ENFkNgzjuHok6z7EuiWtkiWRWo1VdYccBd',
        'd0NKnaUP0Utko6Nq+ExXCvgFiTge7Qrbpu8QB5NXGjS4RMbmg6sg2jgfI5GgOc1n',
        'utOv3B2QCj435VKeMhiH7MJQp+nj6Se4XODn5CzutOleu1t4eYkE2TW3Sso+xruT',
        '8Or8sBTQ4GK9yU5sKGEGRY9xlB2HOOfA9Hu/48xRl9Ewqc5uI1rh4v1b736peKo7',
        'JQVZOkDXvU3I4XsiCSxQSwNet+AgSp8zn5Sx1quqo7xkD4n9YPErx3FBPIxydGRI',
        'Pt8ltOKJAoGBAO2etrpxVaQtZO0MYOjJah403eqgt17eTkrs5mcFuLvVkYI+aWd+',
        'Sbw1+oBibkgfmbrro+MesuFNq7z9c3Wq+Svugg6/bpzWzSSS6cBoYiJoBUMfTzrn',
        'wsvpgpRmSOQWFWlwDjFJzN00cmoJefV4/SzPf3cn3POxdTvleKKqIWpLAoGBAMyU',
        'L+K5XrfMV6R+l+3Utt9MehLvjyeLn0v+yUSKn9MJCmtAa8f8i/203J69DJ3hVfwu',
        'mmVGVJj06dqI7Z9mfdqb0SCQAN477a/QYGUw0P32fO4VRlbzGxEQ3iUM2ae/VAza',
        'anNYHPZSHafLMtEqDYmKegGi7IJT2IXilblrV7rFAoGBAOBEMbYaDXhcl6rbSgOr',
        'RYqo3uH5OdhB/KbenD6Tud0eHq1MdnMFUFZgo8LUI73ShWdTy2Qqry3R/srqczSV',
        'X4LFIt8EckN4wDlKp2+/lQ9gGcdWH5M69jE6fNHPD/ClnyPabKq8Oqx0OaA2vXKe',
        '9GR8mpM9fl5KGJmlZIwyAkOtAoGBAMfospZhv83pL2d9kScFqqGv0MY6M/BXvpT7',
        'Z1/D+oO1HOpLLEdjYMTNfJzdbbvFm0lvnM4EGNzSzsYO8ezGsYryojuonECN3Sjl',
        'fZzERCU3PUNFpNOIgdV+XyVjVjlWfGKG+Gi4HK0S9wmlRYYhCtNxbuG0fFqqZjYG',
        'gXqMC1FlAoGAFLdYNtaZe4HZrjkyrLxBm8tG0XvUslWLMtVmwtCrvZY265jjze5Q',
        '1vfaFrxpqz0OrEsEZWecxS44fVSCvsbPVF1G/yh8smtUKbyvgX/kqOWXRwlWfYMv',
        '/wa6THaiwqwr8qsVk1scbWShfx879a+ew/nzzQ7sgpqa904iL5VA4Q8=',
        '-----END RSA PRIVATE KEY-----',
      ].join('\n');

      const combinedOptions = Object.assign(options, this.jwtOptions);
      const token = jwt.sign(payload, privatekey, combinedOptions);
      return token;
    } catch (error) {
      logger.warn(`services.credential.sign.catch: ${error}`);
      throw error;
    }
  }

  protected getAxios(
    payload: string | Buffer | object,
    options?: IJwtSignOptions,
  ) {
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
}
