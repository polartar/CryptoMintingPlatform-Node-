const sgTransport = require('nodemailer-sendgrid-transport');
import * as nodemailer from 'nodemailer';
import { config, logger } from '../common';
import templateBuilder from '../templates/templateBuilder';
import { IUser } from '../types';
import { capitalize } from '../utils';
import { DataSource } from 'apollo-datasource';

class SendEmail extends DataSource {
  capitalizedBrand = capitalize(config.brand);
  transport = nodemailer.createTransport(
    sgTransport({
      auth: {
        api_key: config.sendGridApiKey,
        domain: config.hostname,
      },
    }),
  );
  private get sendFromEmailAddress() {
    switch (config.brand) {
      case 'connect': {
        return 'support@connectblockchain.net';
      }
      case 'codex': {
        return 'support@codexunited.com';
      }
      case 'arcade': {
        return 'support@arcadeblockchain.com';
      }
      case 'green': {
        return 'support@share.green';
      }
      case 'localhost': {
        return 'support@connectblockchain.net';
      }
      default: {
        throw new Error(`No email support for brand: ${config.brand}`);
      }
    }
  }
  public async sendMail(subject: string, sendTo: string, html: string) {
    logger.debug(`data-sources.SendEmail.sendMail.subject: ${subject}`);
    logger.debug(`data-sources.SendEmail.sendMail.sendTo: ${sendTo}`);
    try {
      const mailOptions = {
        to: sendTo,
        from: this.sendFromEmailAddress,
        subject: subject,
        html: html,
      };
      const { message } = await this.transport.sendMail(mailOptions);
      logger.debug(
        `data-sources.SendEmail.sendMail.message === success: ${message ===
          'success'}`,
      );
      return message === 'success';
    } catch (error) {
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
    const emailSent = await this.sendMail(subject, user.email, html);
    logger.debug(
      `data-sources.SendEmail.shareAccepted.emailSent: ${emailSent}`,
    );
    return emailSent;
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
    const emailSent = await this.sendMail(subject, user.email, html);
    logger.debug(
      `data-sources.SendEmail.referrerActivated.emailSent: ${emailSent}`,
    );

    return emailSent;
  }
}

export default SendEmail;
