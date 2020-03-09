import { RESTDataSource, RequestOptions } from 'apollo-datasource-rest';
import { config, logger } from '../common';

class Bitly extends RESTDataSource {
  baseURL = 'https://api-ssl.bitly.com/v4';

  willSendRequest(request: RequestOptions) {
    request.headers.set('Authorization', `Bearer ${config.bitlyToken}`);
    request.headers.set('Content-Type', 'application/json');
  }

  private validateResponse(response: { status_code: number; data: any }) {
    if (response.status_code === 403) {
      throw new Error('Rate Limit Hit.');
    }

    if (!response.data) {
      throw new Error('Invalid response.');
    }
  }

  private async getGroupId() {
    const response = await this.get<{
      data: { groups: Array<{ guid: string }> };
      status_code: number;
    }>('/groups');

    this.validateResponse(response);

    return response.data.groups[0].guid;
  }

  private async shortenLongUrl(longUrl: string, guid: string) {
    const response = await this.post<{
      data: { link: string };
      status_code: number;
    }>('/shorten', {
      group_guid: guid,
      long_url: longUrl,
    });

    this.validateResponse(response);

    return response.data.link;
  }

  public async getLink(affiliateId: string) {
    try {
      if (!affiliateId) throw new Error('No affiliateID');
      logger.debug(`data-sources.bitly.getLink.affiliateId: ${affiliateId}`);
      const encodedAffiliateId = encodeURIComponent(affiliateId);
      logger.debug(
        `data-sources.bitly.getLink.encodedAffiliateId: ${encodedAffiliateId}`,
      );
      const longUrl = `${config.walletClientDomain}?r=${encodedAffiliateId}`;

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
