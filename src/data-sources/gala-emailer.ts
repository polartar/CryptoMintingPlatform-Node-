import { config } from '../common';
import { SendGrid } from './sendgrid';

export class GalaEmailer extends SendGrid {
  domain = config.walletClientDomain.replace(/\/\w*$/g, '');
  encodedDomain = this.domain.replace(
    /:\/\/|\./g,
    (match: string) => `${match}&#8203;`,
  );
  constructor() {
    super(config.brand === 'gala', config.brand === 'gala' && config.isProd);
  }

  sendNewUserEmailConfirmation = (
    emailAddress: string,
    firstName: string,
    token: string,
  ) => {
    const confirmLink = `${this.domain}/verify-email?token=${token}&newuser=true`;
    const linkText = `${this.encodedDomain}/verify-email?token=${token}&newuser=true`;
    return this.sendEmail(
      emailAddress,
      true,
      config.sendgridTemplateIds.verifyEmailNewUser,
      config.sendgridUnsubscribeGroupIds.general,
      { firstName, confirmLink, linkText },
    );
  };

  sendExistingUserEmailConfirmation = (
    emailAddress: string,
    firstName: string,
    token: string,
  ) => {
    const confirmLink = `${this.domain}/verify-email?token=${token}`;
    const linkText = `${this.encodedDomain}/verify-email?token=${token}`;
    return this.sendEmail(
      emailAddress,
      true,
      config.sendgridTemplateIds.verifyEmailExistingUser,
      config.sendgridUnsubscribeGroupIds.general,
      { firstName, confirmLink, linkText },
    );
  };

  sendReferredNewUserEmail = (
    emailAddress: string,
    emailVerified: boolean,
    firstName: string,
    referredUserFirstName: string,
    referralLink: string,
  ) => {
    return this.sendEmail(
      emailAddress,
      emailVerified,
      config.sendgridTemplateIds.referredNewUser,
      config.sendgridUnsubscribeGroupIds.general,
      { firstName, referredUserFirstName, referralLink },
    );
  };

  sendNudgeFriendEmail = (
    emailAddress: string,
    emailVerified: boolean,
    firstName: string,
    referrer: string,
    referralLink: string,
  ) => {
    return this.sendEmail(
      emailAddress,
      emailVerified,
      config.sendgridTemplateIds.nudgeFriend,
      config.sendgridUnsubscribeGroupIds.general,
      { firstName, referrer, referralLink },
    );
  };

  sendReferredUpgradeEmail = (
    emailAddress: string,
    emailVerified: boolean,
    referredUserFirstName: string,
  ) => {
    return this.sendEmail(
      emailAddress,
      emailVerified,
      config.sendgridTemplateIds.referredUpgrade,
      config.sendgridUnsubscribeGroupIds.general,
      { referredUserFirstName },
    );
  };
}
