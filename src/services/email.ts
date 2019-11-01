const sgTransport = require('nodemailer-sendgrid-transport');
import * as nodemailer from 'nodemailer';
import { config } from '../common';
import templateBuilder from '../templates/templateBuilder';
import { IUser } from '../types';

class Email {
  // transport = nodemailer.createTransport(
  //   sgTransport({
  //     auth: {
  //       api_key: config.sendGridApiKey,
  //       domain: config.hostname,
  //     },
  //   }),
  // );
  // private get sendFromEmailAddress() {
  //   switch (config.brand) {
  //     case 'connect': {
  //       return 'support@connectblockchain.net';
  //     }
  //     case 'codex': {
  //       return 'support@codexunited.com';
  //     }
  //     case 'arcade': {
  //       return 'support@arcadeblockchain.com';
  //     }
  //     case 'green': {
  //       return 'support@share.green';
  //     }
  //     case 'localhost': {
  //       return 'support@connectblockchain.net';
  //     }
  //     default: {
  //       throw new Error(`No email support for brand: ${config.brand}`);
  //     }
  //   }
  // }
  // public async sendEmail(subject: string, sendTo: string, html: string) {
  //   try {
  //     const mailOptions = {
  //       to: sendTo,
  //       from: this.sendFromEmailAddress,
  //       subject: subject,
  //       html: html,
  //     };
  //     const { message } = await this.transport.sendMail(mailOptions);
  //     return message === 'success';
  //   } catch (error) {
  //     return false;
  //   }
  // }
  // public async sendShareAccepted(user: IUser, referredUser: IUser) {
  //   const capitalizedBrand =
  //     config.brand.charAt(0).toUpperCase() + config.brand.substr(1);
  //   const { html, subject } = templateBuilder.buildShareAcceptedHtml(
  //     user,
  //     referredUser,
  //     capitalizedBrand,
  //   );
  //   const emailSent = await this.sendEmail(subject, user.email, html);
  //   return emailSent;
  // }
}

export default new Email();
