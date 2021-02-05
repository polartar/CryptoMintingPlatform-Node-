import * as aws from 'aws-sdk';
import { config } from '../common';
import { v4 as randomString } from 'uuid';

class S3Service {
  s3: aws.S3;
  private baseParams = {
    Bucket: config.s3Bucket,
    Expires: 900,
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

  public getUrlFromFilename = (filename: string) => {
    const url = `https://s3.amazonaws.com/${config.s3Bucket}/${filename}`;

    return url;
  };

  private getParams = (fileName: string, fileType: string) => {
    return {
      ...this.baseParams,
      Key: fileName,
      ContentType: fileType,
    };
  };

  getSignedUrl = (fileName: string, fileType: string) => {
    const randomizedFileName = `${randomString()}-${fileName.replace(
      /\s/g,
      '-',
    )}`;
    const params = this.getParams(randomizedFileName, fileType);
    return new Promise((resolve, reject) => {
      this.s3.getSignedUrl('putObject', params, (err: any, data: any) => {
        if (err) {
          reject(err);
        } else {
          const returnData = {
            signedRequest: data,
            filename: randomizedFileName,
            url: this.getUrlFromFilename(randomizedFileName),
          };
          resolve(returnData);
        }
      });
    });
  };
}

export default new S3Service();
