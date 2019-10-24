// import sgTransport = require('nodemailer-sendgrid-transport');
const sgTransport = require('nodemailer-sendgrid-transport');
import { config } from '../common';

class Email {
  transport = sgTransport({
    auth: {
      api_key: config.email.sendGridApiKey,
      domain: config.hostname,
    },
  });
}
