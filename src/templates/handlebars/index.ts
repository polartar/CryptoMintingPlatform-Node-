import * as fs from 'fs';
import * as path from 'path';

function readTemplate(templateFileName: string) {
  return fs.readFileSync(path.join(__dirname, `./${templateFileName}`), 'utf8');
}

export const shareAccepted = {
  html: readTemplate('shareAccepted.handlebars'),
  subject: 'You referred a new wallet user.',
};
