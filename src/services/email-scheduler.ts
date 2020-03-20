import axios from 'axios';
import { addHours, addSeconds, differenceInHours } from 'date-fns';
import templateBuilder from '../templates/templateBuilder';
import config from '../common/config';
import { IScheduleEmailOptions } from '../types/IScheduleEmailOptions';
import { IUser } from '../models/user';

class EmailScheduler {
  private readonly sendFrom = config.sendGridEmailFrom;
  private axiosInstance = axios.create({
    baseURL: 'https://api.sendgrid.com/v3',
    headers: {
      Authorization: `Bearer ${config.sendGridApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  private scheduleEmail = async ({
    sendTo,
    sendAt,
    template,
  }: IScheduleEmailOptions) => {
    const hoursUntilSend = differenceInHours(sendAt, new Date());
    if (hoursUntilSend > 72) {
      throw new Error('Can only schedule emails 72 hours in advance');
    }

    const sendAtInSeconds = Math.floor(sendAt.getTime() / 1000);

    await this.axiosInstance.post('/mail/send', {
      personalizations: [{ to: [{ email: sendTo }] }],
      from: { email: this.sendFrom },
      subject: template.subject,
      send_at: sendAtInSeconds,
      content: [
        {
          type: 'text/html',
          value: template.html,
        },
      ],
      attachments: template.attachments,
    });

    return true;
  };

  public scheduleGalaWelcomeEmails = async (user: IUser) => {
    const now = new Date();

    const emails = [
      {
        template: templateBuilder.buildGalaWelcome1Html(),
        sendAt: addSeconds(now, 30),
      },
      {
        template: templateBuilder.buildGalaWelcome2Html(),
        sendAt: addHours(now, 12),
      },
      {
        template: templateBuilder.buildGalaWelcome3Html(),
        sendAt: addHours(now, 24),
      },
      {
        template: templateBuilder.buildGalaWelcome4Html(),
        sendAt: addHours(now, 48),
      },
      {
        template: templateBuilder.buildGalaWelcome5Html(),
        sendAt: addHours(now, 72),
      },
    ];

    await Promise.all(
      emails.map(({ template, sendAt }) =>
        this.scheduleEmail({
          template,
          sendAt,
          sendTo: user.email,
        }),
      ),
    );
  };
}

export const emailScheduler = new EmailScheduler();
