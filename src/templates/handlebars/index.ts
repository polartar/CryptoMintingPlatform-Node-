import * as fs from 'fs';
import * as path from 'path';
import { config } from '../../common';

function readTemplate(templateFileName: string) {
  return fs.readFileSync(path.join(__dirname, `./${templateFileName}`), 'utf8');
}

export const shareAccepted = {
  html:
    config.brand === 'gala'
      ? readTemplate('galaShareAccepted.hbs')
      : readTemplate('shareAccepted.hbs'),
  subject: 'You referred a new App user.',
};

export const referralActivated = {
  html: readTemplate('referralActivated.hbs'),
  subject: 'You referred an activation.',
};

export const sendSoftNodeDiscount = {
  html: readTemplate('sendSoftNodeDiscount.hbs'),
  subject: (brand: string) => `Your $100 Instant Credit for ${brand} Upgrade.`,
};

export const galaWelcomeBetaKey = {
  html: readTemplate('galaWelcomeBetaKey.hbs'),
  subject: 'Welcome to Gala!',
};

export const galaWelcomeNoBetaKey = {
  html: readTemplate('galaWelcomeNoBetaKey.hbs'),
  subject: 'Welcome to Gala!',
};

export const galaWelcome2 = {
  html: readTemplate('galaWelcome2.hbs'),
  subject: 'Get to know Gala.',
};

export const galaWelcome3 = {
  html: readTemplate('galaWelcome3.hbs'),
  subject: 'Play the Game Before the Game',
};

export const galaWelcome4 = {
  html: readTemplate('galaWelcome4.hbs'),
  subject: 'How to buy a Loot Box (step by step w/pics)',
};

export const galaWelcome5 = {
  html: readTemplate('galaWelcome5.hbs'),
  subject: 'How to share for fun and reward',
};

export const nudgeFriend = () => ({
  html: readTemplate('nudgeFriend.hbs'),
  subject: `📜📜📜 Gala Games Planning Meeting Minutes`,
});
