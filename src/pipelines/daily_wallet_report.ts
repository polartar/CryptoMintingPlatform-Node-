export default function buildDailyWalletReportPipeline() {
  const today = new Date();
  const oneDayAgo = new Date().setDate(new Date().getDate() - 1);
  return [
    {
      $match: {
        wallet: {
          $exists: true,
        },
      },
    },
    {
      $addFields: {
        'wallet.userCreated': '$created',
      },
    },
    {
      $replaceRoot: {
        newRoot: '$wallet',
      },
    },
    {
      $addFields: {
        oneDayAgo: new Date(oneDayAgo),
        daysSinceWalletCreated: {
          $ifNull: [
            {
              $divide: [
                {
                  $subtract: [today, '$createdAt'],
                },
                86400000,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        daysSinceWalletCreated: {
          $ceil: '$daysSinceWalletCreated',
        },
        walletCreatedInLastDay: {
          $cond: [
            {
              $gt: ['$createdAt', '$oneDayAgo'],
            },
            1,
            0,
          ],
        },
        arcadeTimestamp: {
          $ifNull: ['$activations.arcade.timestamp', 0],
        },
        arcadeUpgraded: {
          $cond: ['$activations.arcade.activated', 1, 0],
        },
        arcadeUpgradedInLastDay: {
          $cond: [
            {
              $gt: ['$activations.arcade.timestamp', '$oneDayAgo'],
            },
            1,
            0,
          ],
        },
        arcadeBtcToReferrer: {
          $ifNull: ['$activations.arcade.btcToReferrer', 0],
        },
        arcadeBtcToCompany: {
          $ifNull: ['$activations.arcade.btcToCompany', 0],
        },
        arcadeBtcToReferrer24: {
          $cond: [
            {
              $gt: ['$activations.arcade.timestamp', '$oneDayAgo'],
            },
            '$activations.arcade.btcToReferrer',
            0,
          ],
        },
        arcadeBtcToCompany24: {
          $cond: [
            {
              $gt: ['$activations.arcade.timestamp', '$oneDayAgo'],
            },
            '$activations.arcade.btcToCompany',
            0,
          ],
        },
        greenTimestamp: {
          $ifNull: ['$activations.green.timestamp', 0],
        },
        greenUpgraded: {
          $cond: ['$activations.green.activated', 1, 0],
        },
        greenUpgradedInLastDay: {
          $cond: [
            {
              $gt: ['$activations.green.timestamp', '$oneDayAgo'],
            },
            1,
            0,
          ],
        },
        greenBtcToReferrer: {
          $ifNull: ['$activations.green.btcToReferrer', 0],
        },
        greenBtcToCompany: {
          $ifNull: ['$activations.green.btcToCompany', 0],
        },
        greenBtcToReferrer24: {
          $cond: [
            {
              $gt: ['$activations.green.timestamp', '$oneDayAgo'],
            },
            '$activations.green.btcToReferrer',
            0,
          ],
        },
        greenBtcToCompany24: {
          $cond: [
            {
              $gt: ['$activations.green.timestamp', '$oneDayAgo'],
            },
            '$activations.green.btcToCompany',
            0,
          ],
        },
        winxTimestamp: {
          $ifNull: ['$activations.winx.timestamp', 0],
        },
        winxUpgraded: {
          $cond: ['$activations.winx.activated', 1, 0],
        },
        winxUpgradedInLastDay: {
          $cond: [
            {
              $gt: ['$activations.winx.timestamp', '$oneDayAgo'],
            },
            1,
            0,
          ],
        },
        winxBtcToReferrer: {
          $ifNull: ['$activations.winx.btcToReferrer', 0],
        },
        winxBtcToCompany: {
          $ifNull: ['$activations.winx.btcToCompany', 0],
        },
        winxBtcToReferrer24: {
          $cond: [
            {
              $gt: ['$activations.winx.timestamp', '$oneDayAgo'],
            },
            '$activations.winx.btcToReferrer',
            0,
          ],
        },
        winxBtcToCompany24: {
          $cond: [
            {
              $gt: ['$activations.winx.timestamp', '$oneDayAgo'],
            },
            '$activations.winx.btcToCompany',
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: 1,
        arcadeAccounts24: {
          $sum: '$walletCreatedInLastDay',
        },
        arcadeUpgraded24: {
          $sum: '$arcadeUpgradedInLastDay',
        },
        arcadeBtcToReferrer24: {
          $sum: '$arcadeBtcToReferrer24',
        },
        arcadeBtcToCompany24: {
          $sum: '$arcadeBtcToCompany24',
        },
        arcadeAccountsTotal: {
          $sum: 1,
        },
        arcadeUpgradedTotal: {
          $sum: '$arcadeUpgraded',
        },
        arcadeBtcToReferrer: {
          $sum: '$arcadeBtcToReferrer',
        },
        arcadeBtcToCompany: {
          $sum: '$arcadeBtcToCompany',
        },
        maxDaysWalletCreated: {
          $max: '$daysSinceWalletCreated',
        },
        greenAccounts24: {
          $sum: '$walletCreatedInLastDay',
        },
        greenUpgraded24: {
          $sum: '$greenUpgradedInLastDay',
        },
        greenBtcToReferrer24: {
          $sum: '$greenBtcToReferrer24',
        },
        greenBtcToCompany24: {
          $sum: '$greenBtcToCompany24',
        },
        greenAccountsTotal: {
          $sum: 1,
        },
        greenUpgradedTotal: {
          $sum: '$greenUpgraded',
        },
        greenBtcToReferrer: {
          $sum: '$greenBtcToReferrer',
        },
        greenBtcToCompany: {
          $sum: '$greenBtcToCompany',
        },
        winxAccounts24: {
          $sum: '$walletCreatedInLastDay',
        },
        winxUpgraded24: {
          $sum: '$winxUpgradedInLastDay',
        },
        winxBtcToReferrer24: {
          $sum: '$winxBtcToReferrer24',
        },
        winxBtcToCompany24: {
          $sum: '$winxBtcToCompany24',
        },
        winxAccountsTotal: {
          $sum: 1,
        },
        winxUpgradedTotal: {
          $sum: '$winxUpgraded',
        },
        winxBtcToReferrer: {
          $sum: '$winxBtcToReferrer',
        },
        winxBtcToCompany: {
          $sum: '$winxBtcToCompany',
        },
      },
    },
    {
      $addFields: {
        arcadeAccountsAverage: {
          $divide: ['$arcadeAccountsTotal', '$maxDaysWalletCreated'],
        },
        arcadeUpgradeAverage: {
          $divide: ['$arcadeUpgradedTotal', '$maxDaysWalletCreated'],
        },
        arcadeBtcToReferrerAverage: {
          $divide: ['$arcadeBtcToReferrer', '$maxDaysWalletCreated'],
        },
        arcadeBtcToCompanyAverage: {
          $divide: ['$arcadeBtcToCompany', '$maxDaysWalletCreated'],
        },
        greenAccountsAverage: {
          $divide: ['$greenAccountsTotal', '$maxDaysWalletCreated'],
        },
        greenUpgradeAverage: {
          $divide: ['$greenUpgradedTotal', '$maxDaysWalletCreated'],
        },
        greenBtcToReferrerAverage: {
          $divide: ['$greenBtcToReferrer', '$maxDaysWalletCreated'],
        },
        greenBtcToCompanyAverage: {
          $divide: ['$greenBtcToCompany', '$maxDaysWalletCreated'],
        },
        winxAccountsAverage: {
          $divide: ['$winxAccountsTotal', '$maxDaysWalletCreated'],
        },
        winxUpgradeAverage: {
          $divide: ['$winxUpgradedTotal', '$maxDaysWalletCreated'],
        },
        winxBtcToReferrerAverage: {
          $divide: ['$winxBtcToReferrer', '$maxDaysWalletCreated'],
        },
        winxBtcToCompanyAverage: {
          $divide: ['$winxBtcToCompany', '$maxDaysWalletCreated'],
        },
      },
    },
    {
      $project: {
        arcade: {
          accounts24: '$arcadeAccounts24',
          upgraded24: '$arcadeUpgraded24',
          btcToReferrer24: '$arcadeBtcToReferrer24',
          btcToCompany24: '$arcadeBtcToCompany24',
          accountsTotal: '$arcadeAccountsTotal',
          upgradedTotal: '$arcadeUpgradedTotal',
          btcToReferrer: '$arcadeBtcToReferrer',
          btcToCompany: '$arcadeBtcToCompany',
          accountsAverage: '$arcadeAccountsAverage',
          upgradeAverage: '$arcadeUpgradeAverage',
          btcToReferrerAverage: '$arcadeBtcToReferrerAverage',
          btcToCompanyAverage: '$arcadeBtcToCompanyAverage',
        },
        green: {
          accounts24: '$greenAccounts24',
          upgraded24: '$greenUpgraded24',
          btcToReferrer24: '$greenBtcToReferrer24',
          btcToCompany24: '$greenBtcToCompany24',
          accountsTotal: '$greenAccountsTotal',
          upgradedTotal: '$greenUpgradedTotal',
          btcToReferrer: '$greenBtcToReferrer',
          btcToCompany: '$greenBtcToCompany',
          accountsAverage: '$greenAccountsAverage',
          upgradeAverage: '$greenUpgradeAverage',
          btcToReferrerAverage: '$greenBtcToReferrerAverage',
          btcToCompanyAverage: '$greenBtcToCompanyAverage',
        },
        winx: {
          accounts24: '$winxAccounts24',
          upgraded24: '$winxUpgraded24',
          btcToReferrer24: '$winxBtcToReferrer24',
          btcToCompany24: '$winxBtcToCompany24',
          accountsTotal: '$winxAccountsTotal',
          upgradedTotal: '$winxUpgradedTotal',
          btcToReferrer: '$winxBtcToReferrer',
          btcToCompany: '$winxBtcToCompany',
          accountsAverage: '$winxAccountsAverage',
          upgradeAverage: '$winxUpgradeAverage',
          btcToReferrerAverage: '$winxBtcToReferrerAverage',
          btcToCompanyAverage: '$winxBtcToCompanyAverage',
        },
      },
    },
  ];
}
