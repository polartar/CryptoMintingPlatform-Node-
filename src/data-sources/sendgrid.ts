import { RESTDataSource } from 'apollo-datasource-rest';
import { config } from '../common';
import * as sgMail from '@sendgrid/mail';
import * as sgClient from '@sendgrid/client';

export class SendGrid extends RESTDataSource {
  constructor(
    private isOkToSendEmail: boolean,
    private isOkToAddContacts: boolean,
  ) {
    super();
    sgMail.setApiKey(config.sendGridApiKey);
    sgClient.setApiKey(config.sendGridApiKey);
  }

  protected sendEmail = async (
    sendToEmailAddress: string,
    emailVerified: boolean,
    templateId: string,
    unsubscribeGroupId: number,
    templateVariables?: { [key: string]: string },
  ) => {
    if (this.isOkToSendEmail && emailVerified) {
      sgMail.send({
        from: {
          email: config.sendGridEmailFrom,
          name: 'Gala Support',
        },
        to: sendToEmailAddress,
        templateId,
        asm: {
          groupId: unsubscribeGroupId,
        },
        dynamicTemplateData: templateVariables,
      });
    }
  };

  public addContact = (
    firstName: string,
    lastName: string,
    email: string,
    emailVerified: boolean,
    lists: string[],
  ) => {
    if (!this.isOkToAddContacts || !emailVerified) {
      return Promise.resolve();
    }
    return sgClient.request({
      method: 'PUT',
      url: '/v3/marketing/contacts',
      body: {
        list_ids: lists,
        contacts: [
          {
            first_name: firstName,
            last_name: lastName,
            email,
          },
        ],
      },
    });
  };
}
