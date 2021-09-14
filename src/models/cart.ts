import * as mongoose from 'mongoose';

export async function getNextWalletNumber(symbol: string) {
  const result = await mongoose.connection.db
    .collection<{ sequence: number }>('sequences')
    .findOneAndUpdate(
      {
        name: symbol,
      },
      {
        $inc: {
          sequence: 1,
        },
      },
      {
        projection: {
          sequence: 1,
        },
        maxTimeMS: 5000,
        upsert: true,
        returnOriginal: false,
      },
    );
  const id = result.value.sequence;
  return id;
}
