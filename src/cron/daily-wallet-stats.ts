import * as cron from 'node-cron';
import { User } from '../models';
import { buildDailyWalletReportPipeline } from '../pipelines';
import { config, logger } from '../common';
import { systemLogger } from '../common/logger';
const { Parser } = require('json2csv');
import { emailService as emailSender } from '../data-sources/send-email';
import * as mongoose from 'mongoose';

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
  gala: IWalletStats;
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
        rowsToInclude: ['winx', 'green', 'gala'],
      },
      {
        sendTo: config.sendWalletReportToConnectArcade,
        rowsToInclude: ['gala'],
      },
    ],
    gala: [
      {
        sendTo: config.sendWalletReportToArcade,
        rowsToInclude: ['gala'],
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
        rowsToInclude: ['winx', 'green', 'gala'],
      },
    ],
  };

  schedule(cronString: string) {
    const sendConfig = this.getSendConfig();
    cron.schedule(
      cronString,
      () => {
        this.fixStringifiedDatesAndObjectIds().then(() => {
          this.run(sendConfig);
        });
      },
      {
        timezone: 'America/Denver',
      },
    );
  }

  private getSendConfig() {
    const hostBrand = config.brand.toLowerCase();
    const sendConfig = this.reportsForBrand[hostBrand];
    if (!sendConfig) {
      throw new Error(`No send config for brand: ${hostBrand}`);
    }
    return sendConfig;
  }

  async run(sendConfig: IReportSendConfig[], sendEmail = true) {
    await this.fixStringifiedDatesAndObjectIds();
    try {
      systemLogger.info('Running daily wallet report cron job');
      const pipeline = buildDailyWalletReportPipeline();
      const [rawResults] = await User.aggregate(pipeline);
      const results = await Promise.all(
        sendConfig.map(async ({ sendTo, rowsToInclude }) => {
          const formattedJson = this.selectAndFormat(rawResults, rowsToInclude);
          const csv = this.parseJsonToCsv(formattedJson);
          const inlineTable = this.buildInlineTable(csv);
          if (!sendEmail) {
            return inlineTable;
          }
          return emailSender.sendMail(
            `${config.brand} Wallet Report`,
            sendTo,
            inlineTable,
            [{ filename: 'report.csv', content: csv }],
          );
        }),
      );
      systemLogger.info(
        `Daily wallet report results: ${JSON.stringify(results)}`,
      );
      return results;
    } catch (error) {
      systemLogger.warn(`cron.daily-wallet-stats.catch: ${error}`);
    }
  }

  private buildInlineTable(csv: string) {
    const [headers, ...rows] = csv
      .split('\n')
      .map(line => line.replace(/"/g, '').split(','));
    const colStyles = 'style="border: 1px solid black;"';
    const tableStyles = 'cellpadding="5" cellspacing="0"';
    const tableHeaders =
      '<tr>' + headers.map(header => `<th>${header}</th>`).join('') + '</tr>';
    const tableRows = rows
      .map(
        row =>
          `<tr>${row
            .map(column => `<td ${colStyles}>${column}</td>`)
            .join('')}</tr>`,
      )
      .join('');
    return `<table ${tableStyles}>${tableHeaders}${tableRows}</table>`;
  }

  private async fixStringifiedDatesAndObjectIds() {
    const { ObjectId } = mongoose.Types;
    const collection = mongoose.connection.db.collection('users');
    const users = await collection
      .find({ wallet: { $exists: true } })
      .toArray();
    const results = await Promise.all(
      users.map(async user => {
        const { wallet, id } = user;
        const updateRecord: { [key: string]: any } = {};
        if (typeof wallet._id === 'string') {
          updateRecord['wallet._id'] = new ObjectId(wallet._id);
        }
        if (typeof wallet?.activations?._id === 'string') {
          updateRecord['wallet.activations._id'] = new ObjectId(
            wallet.activations._id,
          );
        }
        if (typeof wallet.createdAt === 'string') {
          updateRecord['wallet.createdAt'] = new Date(wallet.createdAt);
        }
        if (typeof wallet.updatedAt === 'string') {
          updateRecord['wallet.updatedAt'] = new Date(wallet.updatedAt);
        }
        if (typeof wallet?.shares?._id === 'string') {
          updateRecord['wallet.shares._id'] = new ObjectId(wallet.shares._id);
        }
        if (Object.keys(updateRecord).length > 0) {
          const updateResult = await collection.updateOne(
            { id },
            { $set: updateRecord },
          );
          logger.debug(`Bad daily-wallet-report data fixed: ${id}`);
          return updateResult;
        }
      }),
    );
    return results;
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
