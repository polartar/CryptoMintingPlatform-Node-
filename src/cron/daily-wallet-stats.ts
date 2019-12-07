import cron from 'node-cron';
import { User } from '../models';
import { buildDailyWalletReportPipeline } from '../pipelines';
import { config } from '../common';
const { Parser } = require('json2csv');
import { emailService as emailSender } from '../data-sources/send-email';

interface IWalletStats {
  accounts24: number;
  accountsAverage: number;
  accountsTotal: number;
  btcToCompany: number;
  btcToCompany24: number;
  btcToCompanyAverage: number;
  btcToReferrer: number;
  btcToReferrer24: number;
  btcToReferrerAverage: number;
  upgradeAverage: number;
  upgraded24: number;
  upgradedTotal: number;
}

interface IRawWalletReport {
  arcade: IWalletStats;
  green: IWalletStats;
  winx: IWalletStats;
}

class DailyWalletStats {
  parser = new Parser();

  reportsForBrand: { [key: string]: string[] } = {
    connect: ['winx', 'green', 'arcade'],
    arcade: ['arcade'],
    codex: ['winx'],
    green: ['green'],
    localhost: ['winx', 'green', 'arcade'],
  };

  schedule(cronString: string) {
    if (!config.sendWalletReportTo || !cronString) return;
    cron.schedule(cronString, this.run, { timezone: 'America/Denver' });
  }

  async run() {
    const pipeline = buildDailyWalletReportPipeline();
    const [rawResults] = await User.aggregate(pipeline);
    const formattedJson = this.selectAndFormat(rawResults);
    const csv = this.parseJsonToCsv(formattedJson);
    emailSender.sendMail(
      `${config.brand} Wallet Report`,
      config.sendWalletReportTo,
      '<p>Report Attached</p>',
      [{ filename: 'report.csv', content: csv }],
    );
  }

  private parseJsonToCsv(data: any) {
    return this.parser.parse(data);
  }

  private formatCrypto(value: number) {
    return +value.toFixed(8);
  }

  private formatToHundreths(value: number) {
    return +value.toFixed(2);
  }

  selectAndFormat(rawReport: IRawWalletReport) {
    return Object.entries(rawReport)
      .filter(([reportBrand]) => {
        const hostBrand = config.brand.toLowerCase();
        return this.reportsForBrand[hostBrand].includes(reportBrand);
      })
      .map(([brand, stats]: [string, IWalletStats]) => {
        const {
          accounts24,
          upgraded24,
          btcToCompany24,
          btcToReferrer24,
          accountsTotal,
          upgradedTotal,
          btcToCompany,
          btcToReferrer,
          accountsAverage,
          upgradeAverage,
          btcToCompanyAverage,
          btcToReferrerAverage,
        } = stats;
        return {
          Brand: brand,
          'Accounts Created (24hrs)': accounts24,
          'Accounts Upgraded (24hrs': upgraded24,
          'Upgrade Fees (24hrs)': this.formatCrypto(btcToCompany24),
          'Referrer Commissions (24hrs)': this.formatCrypto(btcToReferrer24),
          'Accounts Created (Total)': accountsTotal,
          'Accounts Upgraded (Total)': upgradedTotal,
          'Upgrade Fees (Total)': this.formatCrypto(btcToCompany),
          'Referrer Commissions (Total)': this.formatCrypto(btcToReferrer),
          'Accounts Created (Avg/Day)': this.formatToHundreths(accountsAverage),
          'Accounts Upgraded (Avg/Day)': this.formatToHundreths(upgradeAverage),
          'Upgrade Fees (Avg/Day)': this.formatCrypto(btcToCompanyAverage),
          'Referrer Commissions': this.formatCrypto(btcToReferrerAverage),
        };
      });
  }
}

export default new DailyWalletStats();
