import { shareAccepted, referralActivated } from './handlebars';
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
}

export default new TemplateBuilder();
