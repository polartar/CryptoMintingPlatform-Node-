import { Request, Response } from 'express';
import * as autoBind from 'auto-bind';
import { systemLogger } from '../../common/logger';
import { config } from '../../common';
import keys from '../../common/keys';
import { credentialService } from '../../services';

const NodeRSA = require('node-rsa');
const pem2jwk = require('pem-jwk');

const jwksCache: { keys?: any[] } = {
  keys: null,
};

class Controller {
  constructor() {
    autoBind(this);
  }

  // This Healthcheck MUST respond to an unauthenticated GET request with
  // a 200 response. Any app-breaking errors should result in a 500 response.
  //
  // Ref: https://tools.ietf.org/html/draft-inadarei-api-health-check-05
  public async getHealth(req: Request, res: Response) {
    res.setHeader('Content-Type', 'application/health+json');

    try {
      // If everything is good then this is the expected output.

      return res.json({ status: 'pass' });

      // When something in the app is failing / taking too long etc, but the
      // application is still working for the most part you would return 200
      // with a status message of "warn" a good practice to display a
      // non-sensitive error describing the issue.
      //
      // res.json({ status: "warn", output: err.message });

      // When a test/check fails send 500 and status of failure. it is also
      // a good practice to display a non-sensitive error describing the issue.
      //
      // res.status(500).json({ status: "fail", output: err.message });
    } catch (err) {
      systemLogger.error(err.stack);
      return res.sendStatus(500);
    }
  }

  // TODO: move this to it's own controller
  public async getJwks(req: Request, res: Response) {
    res.setHeader('Content-Type', 'application/health+json');

    // ugly proof of concept
    if (!jwksCache.keys) {
      jwksCache.keys = keys.serviceAccounts
        // .filter( (k:any) => k.project_id === 'connectblockchain-stage')
        .map((k: any) => {
          const { project_id, private_key } = k;
          const pub = new NodeRSA(private_key).exportKey('pkcs8-public-pem');
          const jwk = pem2jwk.pem2jwk(pub);
          jwk.kid = project_id;
          return jwk;
        })
        .filter((jwk: any, idx: Number, jwks: any[]) => {
          return idx === jwks.findIndex(t => t.kid === jwk.kid);
        });
    }

    try {
      return res.json({ keys: jwksCache.keys });
    } catch (err) {
      systemLogger.error(err.stack);
      return res.sendStatus(500);
    }
  }

  // This Healthcheck MUST respond to an unauthenticated GET request with
  // a 200 response. Any app-breaking errors should result in a 500 response.
  //
  // Ref: https://tools.ietf.org/html/draft-inadarei-api-health-check-05
  public async getServiceUrl(req: Request, res: Response) {
    res.setHeader('Content-Type', 'application/health+json');

    try {
      // If everything is good then this is the expected output.

      const brand = config.brand;
      const hostname = config.hostname;
      const serviceRecords = keys.serviceAccountKeys;
      const apiKeyService = await credentialService.checkHealthStatus(
        '11111111',
      );
      const mongoDbHost = config.mongodbUriKey;

      return res.json({
        brand,
        hostname,
        serviceRecords,
        apiKeyService,
        mongoDbHost,
      });

      // When something in the app is failing / taking too long etc, but the
      // application is still working for the most part you would return 200
      // with a status message of "warn" a good practice to display a
      // non-sensitive error describing the issue.
      //
      // res.json({ status: "warn", output: err.message });

      // When a test/check fails send 500 and status of failure. it is also
      // a good practice to display a non-sensitive error describing the issue.
      //
      // res.status(500).json({ status: "fail", output: err.message });
    } catch (err) {
      systemLogger.error(err.stack);
      return res.sendStatus(500);
    }
  }

  // This Healthcheck MUST respond to an unauthenticated GET request with
  // a 200 response. Any app-breaking errors should result in a 500 response.
  //
  // Ref: https://tools.ietf.org/html/draft-inadarei-api-health-check-05
  public async getApiKeyServiceInfo(req: Request, res: Response) {
    res.setHeader('Content-Type', 'application/health+json');

    try {
      // If everything is good then this is the expected output.

      credentialService
        .checkHealthStatus('bde99eb43340ae81690c951a')
        .then(resp => {
          return res.json({ apiKeyService: resp });
        })
        .catch(err => {
          systemLogger.error(err.stack);
          return res.status(500).json({ error: err });
        });

      // When something in the app is failing / taking too long etc, but the
      // application is still working for the most part you would return 200
      // with a status message of "warn" a good practice to display a
      // non-sensitive error describing the issue.
      //
      // res.json({ status: "warn", output: err.message });

      // When a test/check fails send 500 and status of failure. it is also
      // a good practice to display a non-sensitive error describing the issue.
      //
      // res.status(500).json({ status: "fail", output: err.message });
    } catch (err) {
      systemLogger.error(err.stack);
      return res.sendStatus(500);
    }
  }
}

export default new Controller();
