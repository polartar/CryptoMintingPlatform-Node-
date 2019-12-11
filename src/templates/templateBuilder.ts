import {
  shareAccepted,
  referralActivated,
  sendSoftNodeDiscount,
} from './handlebars';
import { IUser } from '../types';
import * as Handlebars from 'handlebars';

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
    const path = '../assets/',
      cid = 'image';
    let filename;
    switch (brand) {
      case 'winx':
        filename = 'instant-credit-codex-soft-node.jpg';
        break;
      case 'green':
        filename = 'instant-credit-green-soft-node.jpg';
        break;
      default:
        filename = 'instant-credit-arcade-soft-node.jpg';
        break;
    }
    return {
      html: Handlebars.compile(sendSoftNodeDiscount.html)({
        user,
        brand,
      }),
      subject: sendSoftNodeDiscount.subject(brand),
      attachments: {
        filename,
        path,
        cid,
      },
    };
  }
}

export default new TemplateBuilder();
