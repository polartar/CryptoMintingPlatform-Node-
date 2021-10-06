import { logger } from '../common';
import licenseTypeMappingModel from 'src/models/licenseTypeMapping';
import licenseModel from 'src/models/license';
import userModel from 'src/models/user';
import { ILicense } from '../models/license';

export class UserService {
  async assignUserLicense(wordPressMembershipId: string, email: string) {
    try {
      const user = await userModel.findOne({ email: email }, { _id: 1 }).exec();
      if (!user) throw new Error('User did not find');
      const userId = user._id;
      const licensesTypesMapped = await licenseTypeMappingModel
        .find(
          { wordPressMembershipId: wordPressMembershipId },
          { licenseTypeId: 1 },
        )
        .exec();
      const toInsert: Array<Partial<ILicense>> = [];
      licensesTypesMapped.forEach(licenseTypeMapped => {
        toInsert.push({
          licenseTypeId: licenseTypeMapped.licenseTypeId,
          userId: userId,
          created: new Date(),
          inUse: true,
          ownershipHistory: [],
        });
      });
      if (toInsert.length === 0)
        throw new Error('membership has no licenseType mapped');
      await licenseModel.insertMany(toInsert);
    } catch (error) {
      logger.warn(`services.user.assignUserLicense.catch: ${error}`);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;
