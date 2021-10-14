import * as mongoose from 'mongoose';

export async function getNextWalletNumber(symbol: string) {
  return new Promise((resolve, reject) => {
    mongoose.connection.db.collection('sequences').findOneAndUpdate(
      {
        name: symbol,
      },
      {
        $inc: {
          sequence: 1,
        },
      },
      {
        returnDocument: 'after',
        maxTimeMS: 5000,
      },
      (err: any, doc: any) => {
        if (err) {
          reject('undefined');
        }

        resolve(doc.value.sequence);
      },
    );
  });
}
