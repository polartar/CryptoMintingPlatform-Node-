import * as mongoose from 'mongoose';
import axios from 'axios';
import { userSchema, IUser } from '../src/models/user';

(async () => {
  await mongoose.connect('');
  const User = mongoose.model<IUser>('users', userSchema);

  const users = await User.find({ 'wallet.shareLink': { $exists: true } });

  const groupIdResponse = await axios.get(
    'https://api-ssl.bitly.com/v4/groups',
    {
      headers: {
        Authorization: 'Bearer 3deafb7b7485c99ad5ecc42ced69fb70dd239419',
        'Content-Type': 'application/json',
      },
    },
  );

  const groupId = groupIdResponse.data.groups[0].guid;

  for (const user of users) {
    const promise = new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 250);
    });
    await promise;

    const affiliateId = encodeURIComponent(user.affiliateId);

    const longUrl = `https://go.gala-gaming.com/signup?r=${affiliateId}&utm_source=galaappshare&utm_medium=${user.id}&utm_campaign=5e79504ffd8a5636a2c86ed2&utm_term=gala_own_your_game`;

    const shortenRes = await axios.post(
      'https://api-ssl.bitly.com/v4/shorten',
      {
        group_guid: groupId,
        long_url: longUrl,
      },
      {
        headers: {
          Authorization: 'Bearer 3deafb7b7485c99ad5ecc42ced69fb70dd239419',
          'Content-Type': 'application/json',
        },
      },
    );

    user.set('wallet.shareLink', shortenRes.data.link);
    await user.save();
  }

  console.log('done');
})();
