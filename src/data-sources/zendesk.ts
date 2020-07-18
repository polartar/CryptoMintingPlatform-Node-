import { RESTDataSource, RequestOptions } from 'apollo-datasource-rest';
import { config, logger } from '../common';
import { IZendeskRequest, IZendeskTicket } from '../types';
import { SupportTicket } from '../models/support-ticket';

class Zendesk extends RESTDataSource {
  baseURL = 'https://robotsupport.zendesk.com/api/v2';
  brandId = this.getBrandId(config.brand);

  willSendRequest(request: RequestOptions) {
    request.headers.set('Authorization', `Basic ${config.zendeskApiKey}`);
  }

  private getBrandId(brand: string) {
    switch (brand.toLowerCase()) {
      case 'gala': {
        return 360002080993;
      }
      case 'codex': {
        return 360001823754;
      }
      case 'connect': {
        return 360001823734;
      }
      case 'green': {
        return 360001823714;
      }
      default: {
        return 360001823734;
      }
    }
  }

  public async createTicket(ticket: IZendeskRequest) {
    logger.debug(
      `data-sources.zendesk.createTicket.ticket.userId: ${ticket.userId}`,
    );
    // const { audit } = await this.post('/tickets.json', {
    //   ticket: {
    //     subject: ticket.subject,
    //     comment: { body: ticket.comment },
    //     requester: ticket.requester,
    //     external_id: ticket.userId,
    //     additional_tags: ['wallet'],
    //     brand_id: this.brandId,
    //   },
    // });
    // return audit.ticket_id;
    const createdTicket = await SupportTicket.create({
      subject: ticket.subject,
      comment: ticket.comment,
      requester: `${ticket.requester.email}: ${ticket.requester.name}`,
      externalId: ticket.userId,
      additionalTags: ['wallet'],
      brandId: this.brandId,
      status: 'pending',
    });

    return createdTicket._id.toString();
  }

  public async getUserTickets(
    userId: string,
    page: number,
  ): Promise<IZendeskTicket[]> {
    logger.debug(`data-sources.zendesk.getUserTickets: ${userId}`);
    // const { results } = (await this.get('/search.json', {
    //   query: `type:ticket external_id:${userId}`,
    //   page: page,
    // })) as { results: any[] };
    // return results.map((result: any) => {
    //   const {
    //     created_at: createdAt,
    //     updated_at: updatedAt,
    //     status,
    //     raw_subject: subject,
    //     id,
    //     description,
    //   } = result;
    //   return {
    //     createdAt: new Date(createdAt),
    //     updatedAt: new Date(updatedAt),
    //     status,
    //     subject,
    //     id,
    //     description,
    //   };
    // });
    const tickets = await SupportTicket.find({ externalId: userId })
      .sort('-created')
      .skip(page * 10)
      .limit(10);

    return tickets.map(ticket => ({
      createdAt: ticket.created,
      updatedAt: ticket.updated,
      status: ticket.status,
      subject: ticket.subject,
      id: ticket._id.toString(),
      description: ticket.comment,
    }));
  }
}

export default Zendesk;
