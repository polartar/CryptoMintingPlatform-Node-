import ResolverBase from '../common/Resolver-Base';
import { config } from '../common';
const autoBind = require('auto-bind');
const aws = require('aws-sdk');

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  public async signs3(fileName: string, fileType: string) {
    aws.config = {
      region: 'us-west-1',
      accessKeyId: config.awsAccessKey,
      secretAccessKey: config.awsSecretAccessKey,
    };

    const s3 = new aws.S3();
    const s3Params = {
      Bucket: config.s3Bucket,
      Key: fileName,
      Expires: 60,
      ContentType: fileType,
      ACL: 'public-read',
    };

    s3.getSignedUrl('putObject', s3Params, (err: any, data: any) => {
      if (err) {
        console.log(err);
        throw err;
      }
      const returnData = {
        signedRequest: data,
        url: `https://${config.s3Bucket}.s3.amazonaws.com/${fileName}`,
      };

      return returnData;
    });
  }
}

const resolvers = new Resolvers();

export default {
  Mutation: {
    signs3: resolvers.signs3,
  },
};
