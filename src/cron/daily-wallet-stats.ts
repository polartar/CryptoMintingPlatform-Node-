import * as cron from 'node-cron';
import { User } from '../models';
import { buildDailyWalletReportPipeline } from '../pipelines';
import { config } from '../common';
import { systemLogger } from '../common/logger';
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

interface IReportSendConfig {
  sendTo: string;
  rowsToInclude: string[];
}

class DailyWalletStats {
  parser = new Parser();
  reportsForBrand: { [key: string]: IReportSendConfig[] } = {
    connect: [
      {
        sendTo: config.sendWalletReportToConnect,
        rowsToInclude: ['winx', 'green', 'arcade'],
      },
      {
        sendTo: config.sendWalletReportToConnectArcade,
        rowsToInclude: ['arcade'],
      },
    ],
    arcade: [
      {
        sendTo: config.sendWalletReportToArcade,
        rowsToInclude: ['arcade'],
      },
    ],
    codex: [
      {
        sendTo: config.sendWalletReportToCodex,
        rowsToInclude: ['winx'],
      },
    ],
    green: [
      {
        sendTo: config.sendWalletReportToGreen,
        rowsToInclude: ['green'],
      },
    ],
    localhost: [
      {
        sendTo: config.sendWalletReportToLocalhost,
        rowsToInclude: ['winx', 'green', 'arcade'],
      },
    ],
  };

  schedule(cronString: string) {
    const sendConfig = this.getSendConfig();
    cron.schedule(cronString, () => this.run(sendConfig), {
      timezone: 'America/Denver',
    });
  }

  private getSendConfig() {
    const hostBrand = config.brand.toLowerCase();
    const sendConfig = this.reportsForBrand[hostBrand];
    if (!sendConfig) {
      throw new Error(`No send config for brand: ${hostBrand}`);
    }
    return sendConfig;
  }

  async run(sendConfig: IReportSendConfig[]) {
    const pipeline = buildDailyWalletReportPipeline();
    const [rawResults] = await User.aggregate(pipeline);
    const results = await Promise.all(
      sendConfig.map(async ({ sendTo, rowsToInclude }) => {
        const formattedJson = this.selectAndFormat(rawResults, rowsToInclude);
        const csv = this.parseJsonToCsv(formattedJson);
        return emailSender.sendMail(
          `${config.brand} Wallet Report`,
          sendTo,
          '<p>Report Attached</p>',
          [{ filename: 'report.csv', content: csv }],
        );
      }),
    );
    systemLogger.info(
      `Daily wallet report results: ${JSON.stringify(results)}`,
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

  selectAndFormat(rawReport: IRawWalletReport, rowsToInclude: string[]) {
    return Object.entries(rawReport)
      .filter(([reportBrand]) => {
        return rowsToInclude.includes(reportBrand);
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

const runner = new DailyWalletStats();
export default runner;
