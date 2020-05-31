import { IUser } from '../types';
import { User } from '../models';

export class UserWithReferrer {
  self: IUser;
  private referrer: IUser;

  constructor(user: IUser) {
    this.self = user;
  }

  getReferrer = async () => {
    if (this.referrer) return this.referrer;
    if (!this.self.referredBy || this.referrer === null) {
      this.referrer = null;
      return null;
    }
    this.referrer = await User.findOne({ affiliateId: this.self.referredBy });
    return this.referrer;
  };
}
