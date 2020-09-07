import * as fs from 'fs';
import * as path from 'path';
import { config } from '../../common';

function readTemplate(templateFileName: string) {
  return fs.readFileSync(path.join(__dirname, `./${templateFileName}`), 'utf8');
}

export const shareAccepted =
  config.brand === 'gala'
    ? {
        html: readTemplate('galaShareAccepted.hbs'),
        subject:
          '👀 Woot! One of your friends decided to create an account at Gala Games!🤩',
      }
    : {
        html: readTemplate('shareAccepted.hbs'),
        subject: 'You referred a new App user.',
      };

export const referralActivated =
  config.brand === 'gala'
    ? {
        html: readTemplate('galaGoldReferral.hbs'),
        subject:
          '🥇 Do you know who is awesome? YOU!...and you get some BTC! 🏆',
      }
    : {
        html: readTemplate('referralActivated.hbs'),
        subject: 'You referred an activation.',
      };

export const sendSoftNodeDiscount = {
  html: readTemplate('sendSoftNodeDiscount.hbs'),
  subject: (brand: string) => `Your $100 Instant Credit for ${brand} Upgrade.`,
};

export const galaGoldReferral = {
  html: readTemplate('galaGoldReferral.hbs'),
  subject: '🥇 Do you know who is awesome? YOU!...and you get some BTC! 🏆',
};

export const galaWelcome1 = {
  html: readTemplate('galaWelcome1.hbs'),
  subject: '⭐⭐⭐ Welcome to the Gala Games Revolution! ⭐⭐⭐',
};

export const galaWelcome2 = {
  html: readTemplate('galaWelcome2.hbs'),
  subject:
    '🐄🚜🌻 Start Your Tractor Engines! There is Farmin’ to be Done! 🐄🚜🌻',
};

export const galaWelcome3 = {
  html: readTemplate('galaWelcome3.hbs'),
  subject: '👑 Going Gold with Gala Games! 👑',
};

export const galaWelcome4 = {
  html: readTemplate('galaWelcome4.hbs'),
  subject: '🐉⛵An Introduction to Blockchain Game Items⚔️🛡️',
};

export const nudgeFriend = () => ({
  html: readTemplate('nudgeFriend.hbs'),
  subject: `📜📜📜 Gala Games Planning Meeting Minutes`,
});
