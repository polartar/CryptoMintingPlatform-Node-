import * as mongoose from 'mongoose';

export async function getNextWalletNumber(symbol: string) {
    const result = await mongoose.connection.db
      .collection<{ sequence: number }>('sequences')
      .findOne(
        {
          name: symbol,
        },
        {
          projection: {
            sequence: 1,
          },
          maxTimeMS: 5000,
        },
      );
    if(!result){
      return undefined;
    }
    const id = +result.sequence + 1;
    await mongoose.connection.db
      .collection<{ sequence: number }>('sequences')
      .updateOne(
        {
          name: symbol,
        },
        {
          sequence: id
        },
      );
    return id;
  };

  
