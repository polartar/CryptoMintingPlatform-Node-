import { RESTDataSource } from 'apollo-datasource-rest';
import { config, logger } from '../common';

class Bitly extends RESTDataSource {
  baseURL = 'https://api-ssl.bitly.com/v3/';

  public async getLink(affiliateId: string) {
    try {
      if (!affiliateId) throw new Error('No affiliateID');
      logger.debug(`data-sources.bitly.getLink.affiliateId: ${affiliateId}`);
      const encodedAffiliateId = encodeURIComponent(affiliateId);
      logger.debug(
        `data-sources.bitly.getLink.encodedAffiliateId: ${encodedAffiliateId}`,
      );
      const longUrl = `${
        config.walletClientDomain
      }/register?r=${encodedAffiliateId}`;
      const { data, status_code } = await this.get('shorten', {
        access_token: config.bitlyToken,
        longUrl,
      });
      logger.debug(`data-sources.bitly.getLink.data: ${JSON.stringify(data)}`);
      if (status_code === 403) {
        throw new Error('Rate limit hit');
      }
      return data.url;
    } catch (error) {
      logger.warn(`data-sources.bitly.getLink.catch: ${error}`);
      throw error;
    }
  }
}

export default Bitly;
