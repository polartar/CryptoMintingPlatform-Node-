import * as mongoose from 'mongoose';
import connectToMongoDb from './connectToMongodb';
import * as authDbConnections from '../../authDbConnections.json';
import userSchema from '../models/user';
const connections = {
  local: authDbConnections.localhost,
};
void (async () => {
  await connectToMongoDb(connections.local);
  const User = mongoose.model('user', userSchema);
  const result = await User.updateMany(
    { wallet: { $exists: true } },
    { $set: { 'wallet.ethNonce': 0 } },
  );
  console.log(result);
})();
