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
    return {
      html: Handlebars.compile(sendSoftNodeDiscount.html)({
        user,
        brand,
      }),
      subject: sendSoftNodeDiscount.subject,
    };
  }
}

export default new TemplateBuilder();
