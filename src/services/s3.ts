import * as aws from 'aws-sdk';
import { config } from '../common';

class S3Service {
  s3: aws.S3;
  private baseParams = {
    Bucket: config.s3Bucket,
    Expires: 60,
    ACL: 'public-read',
  };

  constructor() {
    aws.config.update({
      region: config.s3Region,
      accessKeyId: config.awsAccessKey,
      secretAccessKey: config.awsSecretAccessKey,
    });
    this.s3 = new aws.S3();
  }

  private getParams = (fileName: string, fileType: string) => {
    return {
      ...this.baseParams,
      Key: fileName,
      ContentType: fileType,
    };
  };

  getSignedUrl = (fileName: string, fileType: string) => {
    const params = this.getParams(fileName, fileType);
    return new Promise((resolve, reject) => {
      this.s3.getSignedUrl('putObject', params, (err: any, data: any) => {
        if (err) {
          reject(err);
        } else {
          const returnData = {
            signedRequest: data,
            url: `https://${config.s3Bucket}.s3.amazonaws.com/${fileName}`,
          };
          resolve(returnData);
        }
      });
    });
  };
}

export default new S3Service();
