import { RESTDataSource, RequestOptions } from 'apollo-datasource-rest';
import { config, logger } from '../common';
import { IUser } from '../models/user';

class Bitly extends RESTDataSource {
  baseURL = 'https://api-ssl.bitly.com/v4';

  willSendRequest(request: RequestOptions) {
    request.headers.set('Authorization', `Bearer ${config.bitlyToken}`);
    request.headers.set('Content-Type', 'application/json');
  }

  private async getGroupId() {
    const response = await this.get<{
      groups: Array<{ guid: string }>;
    }>('/groups');

    return response.groups[0].guid;
  }

  private async shortenLongUrl(longUrl: string, guid: string) {
    const response = await this.post<{ link: string }>('/shorten', {
      group_guid: guid,
      long_url: longUrl,
    });

    return response.link;
  }

  public async getLink(user: IUser) {
    try {
      if (!user) throw new Error('No user');
      logger.debug(
        `data-sources.bitly.getLink.affiliateId: ${user.affiliateId}`,
      );
      const encodedAffiliateId = encodeURIComponent(user.affiliateId);
      logger.debug(
        `data-sources.bitly.getLink.encodedAffiliateId: ${encodedAffiliateId}`,
      );
      const longUrl = `${config.walletClientDomain}/register?r=${encodedAffiliateId}&utm_source=galaappshare&utm_medium=${user.id}&utm_campaign=5e79504ffd8a5636a2c86ed2&utm_term=gala_own_your_game`;

      const guid = await this.getGroupId();
      const shortUrl = await this.shortenLongUrl(longUrl, guid);

      return shortUrl;
    } catch (error) {
      logger.warn(`data-sources.bitly.getLink.catch: ${error}`);
      throw error;
    }
  }
}

export default Bitly;
