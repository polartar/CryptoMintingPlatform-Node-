import ResolverBase from '../common/Resolver-Base';
import { logger } from '../common';
import { Context } from '../types';
const autoBind = require('auto-bind');
import { s3Service } from '../services';

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  public async signs3(
    parent: any,
    args: { pictureInfo: { fileName: string; fileType: string } },
    { user }: Context,
  ) {
    this.requireAuth(user);
    const { fileName, fileType } = args.pictureInfo;
    try {
      const s3Response = await s3Service.getSignedUrl(fileName, fileType);
      return s3Response;
    } catch (error) {
      logger.warn(error);
    }
  }
}

const resolvers = new Resolvers();

export default {
  Mutation: {
    signs3: resolvers.signs3,
  },
};
