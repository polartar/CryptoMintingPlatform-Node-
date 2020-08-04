import { RESTDataSource, RequestOptions } from 'apollo-datasource-rest';
import { config, logger } from '../common';
import { IUser } from '../models/user';
import { ServerToServerService } from '../services/server-to-server';

const serverToServer = new ServerToServerService();

class LinkShortener extends RESTDataSource {
  baseURL = `${config.linkShortenerUrl}/api`;

  willSendRequest(request: RequestOptions) {
    const token = serverToServer.sign({ role: 'system' });
    request.headers.set('Authorization', `Bearer ${token}`);
    request.headers.set('Content-Type', 'application/json');
  }

  private shortenLongUrl = async (url: string) => {
    this.baseURL;
    const { shortUrl } = await this.post('/shorten', { url });
    return shortUrl;
  };

  public async getLink(user: IUser) {
    try {
      if (!user) throw new Error('No user');
      logger.debug(
        `data-sources.linkShortener.getLink.affiliateId: ${user.affiliateId}`,
      );

      const encodedAffiliateId = encodeURIComponent(user.affiliateId);
      logger.debug(
        `data-sources.link-shortener.getLink.encodedAffiliateId: ${encodedAffiliateId}`,
      );
      const longUrl = `${config.referralLinkDomain}?r=${encodedAffiliateId}&utm_source=galaappshare&utm_medium=${user.id}&utm_campaign=5e79504ffd8a5636a2c86ed2&utm_term=gala_own_your_game`;

      const shortUrl = await this.shortenLongUrl(longUrl);

      return shortUrl;
    } catch (error) {
      logger.warn(`data-sources.link-shortener.getLink.catch: ${error}`);
      throw error;
    }
  }
}

export default LinkShortener;
