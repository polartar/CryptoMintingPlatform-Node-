import { config } from '../common';
import axios from 'axios';

class SlackAPI {
  private baseURL = 'https://slack.com/api';

  private post(
    urlEnd: string,
    body: { [key: string]: any },
    reqConfig: { [key: string]: any },
  ) {
    const fullUrl = this.baseURL + urlEnd;
    return axios.post(fullUrl, body, reqConfig);
  }

  public async postMessage(message: string) {
    const res = await this.post(
      '/chat.postMessage',
      {
        channel: 'CQW1BK6CF',
        text: message,
        username: 'Wallet Alerts',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.slackToken}`,
        },
      },
    );

    return res.data.ok;
  }
}

export default new SlackAPI();
