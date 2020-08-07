const sgTransport = require('nodemailer-sendgrid-transport');
import * as nodemailer from 'nodemailer';
import { config, logger } from '../common';
import templateBuilder from '../templates/templateBuilder';
import { IUser } from '../types';
import { capitalize } from '../utils';
import { DataSource } from 'apollo-datasource';
import { Attachment, Options } from 'nodemailer/lib/mailer';

class SendEmail extends DataSource {
  capitalizedBrand = capitalize(config.brand);
  sendFromEmailAddress = config.sendGridEmailFrom;
  transport = nodemailer.createTransport(
    sgTransport({
      auth: {
        api_key: config.sendGridApiKey,
        domain: config.hostname,
      },
    }),
  );

  public async sendMail(
    subject: string,
    sendTo: string,
    html: string,
    attachments?: Attachment[],
  ) {
    logger.debug(`data-sources.SendEmail.sendMail.subject: ${subject}`);
    logger.debug(`data-sources.SendEmail.sendMail.sendTo: ${sendTo}`);
    try {
      const mailOptions: Options = {
        to: sendTo,
        from: this.sendFromEmailAddress,
        subject: subject,
        html: html,
      };
      if (attachments) {
        mailOptions.attachments = attachments;
      }

      const { message } = await this.transport.sendMail(mailOptions);
      logger.debug(
        `data-sources.SendEmail.sendMail.message === success: ${message ===
          'success'}`,
      );
      return message === 'success';
    } catch (error) {
      logger.debug(`data-sources.SendEmail.sendMail.html: ${html}`);
      logger.debug(
        `data-sources.SendEmail.sendMail.attachments: ${JSON.stringify(
          attachments,
        )}`,
      );
      logger.error(error);
      return false;
    }
  }

  public async shareAccepted(user: IUser, referredUser: IUser) {
    logger.debug(
      `data-sources.SendEmail.shareAccepted.user: ${user && user.id}`,
    );
    logger.debug(
      `data-sources.SendEmail.shareAccepted.referredUser: ${referredUser &&
        referredUser.id}`,
    );
    if (!user || !referredUser) {
      return false;
    }
    const { html, subject } = templateBuilder.buildShareAcceptedHtml(
      user,
      referredUser,
      this.capitalizedBrand,
    );
    const userConsentsToEmailCommunication = this.checkUserConsent(user);
    if (userConsentsToEmailCommunication) {
      const emailSent = await this.sendMail(subject, user.email, html);
      logger.debug(
        `data-sources.SendEmail.shareAccepted.emailSent: ${emailSent}`,
      );
      return emailSent;
    } else {
      return false;
    }
  }

  public async sendSoftNodeDiscount(
    user: IUser,
    upgradeAccountName: string,
    photo: string,
    softnodeType: string,
  ) {
    logger.debug(
      `data-sources.SendEmail.sendSoftNodeDiscount.user: ${user && user.id}`,
    );
    if (!user) {
      return false;
    }
    const {
      html,
      subject,
      attachments,
    } = templateBuilder.buildSendSoftNodeDiscountHtml(
      user,
      upgradeAccountName,
      photo,
      softnodeType,
    );
    try {
      const emailSent = await this.sendMail(
        subject,
        user.email,
        html,
        attachments,
      );
      logger.debug(
        `data-sources.SendEmail.sendSoftNodeDiscount.emailSent: ${emailSent}`,
      );
      return emailSent;
    } catch (err) {
      logger.error(err);
    }
  }

  public async referrerActivated(user: IUser, referredUser: IUser) {
    logger.debug(
      `data-sources.SendEmail.referrerActivated.user: ${user && user.id}`,
    );
    logger.debug(
      `data-sources.SendEmail.referrerActivated.referredUser: ${referredUser &&
        referredUser.id}`,
    );
    if (!user || !referredUser) {
      return false;
    }
    const { html, subject } = templateBuilder.buildReferrerActivatedHtml(
      referredUser,
      this.capitalizedBrand,
    );
    const userConsentsToEmailCommunication = this.checkUserConsent(user);
    if (userConsentsToEmailCommunication) {
      const emailSent = await this.sendMail(subject, user.email, html);
      logger.debug(
        `data-sources.SendEmail.referrerActivated.emailSent: ${emailSent}`,
      );

      return emailSent;
    } else {
      return false;
    }
  }

  public async nudgeFriend(
    referrer: string,
    friend: { email: string; firstName: string; referralLink: string },
    unsubscribeLink: string,
  ) {
    logger.debug(`data-sources.SendEmail.nudgeFriend.friend: ${friend.email}`);

    if (!referrer || !friend) {
      return false;
    }

    const { html, subject } = templateBuilder.buildNudgeFriendHtml(
      referrer,
      friend.firstName,
      friend.referralLink,
      unsubscribeLink,
    );
    const emailSent = await this.sendMail(subject, friend.email, html);

    logger.debug(`data-sources.SendEmail.nudgeFriend.emailSent: ${emailSent}`);

    return emailSent;
  }

  public checkUserConsent(user: IUser) {
    if (user.communicationConsent && user.communicationConsent.length) {
      const mostRecentConsentEntry = user.communicationConsent.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )[0];
      return mostRecentConsentEntry.consentGiven;
    } else {
      // In the past, the user either could not create an account without explicitly consenting to communications, or implicitly consented by creating an account.
      // Therefore, if this property does not exist on the user document, they consented
      return true;
    }
  }
}

export default SendEmail;

export const emailService = new SendEmail();
