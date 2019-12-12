import {
  shareAccepted,
  referralActivated,
  sendSoftNodeDiscount,
} from './handlebars';
import { IUser } from '../types';
import config from '../common/config';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';

class TemplateBuilder {
  buildShareAcceptedHtml(user: IUser, referredUser: IUser, brand: string) {
    return {
      html: Handlebars.compile(shareAccepted.html)({
        user,
        referredUser,
        brand,
      }),
      subject: shareAccepted.subject,
    };
  }

  buildReferrerActivatedHtml(referredUser: IUser, brand: string) {
    return {
      html: Handlebars.compile(referralActivated.html)({
        referredUser,
        brand,
      }),
      subject: referralActivated.subject,
    };
  }
  buildSendSoftNodeDiscountHtml(user: IUser, brand: string) {
    let path = __dirname + '/../assets/';
    const cid = 'logo';
    let filename;

    switch (brand) {
      case 'connect':
        filename = 'instant-credit-codex-soft-node.jpg';
        break;
      case 'codex':
        filename = 'instant-credit-codex-soft-node.jpg';
        break;
      case 'green':
        filename = 'instant-credit-green-soft-node.jpg';
        break;
      default:
        filename = 'instant-credit-arcade-soft-node.jpg';
        break;
    }
    path += filename;

    return {
      html: Handlebars.compile(sendSoftNodeDiscount.html)({
        user,
        brand,
        href: config.cartUrl,
      }),
      subject: sendSoftNodeDiscount.subject(brand),
      attachments: [
        {
          filename,
          path,
          cid,
        },
      ],
    };
  }
}

export default new TemplateBuilder();
