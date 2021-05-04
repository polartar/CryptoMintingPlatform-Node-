import { Request, Response } from 'express';
import * as autoBind from 'auto-bind';
import { systemLogger } from '../../common/logger';
import { config } from '../../common';
import keys from '../../common/keys';
import {credentialService} from '../../services';

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
      const apiKeyService = await credentialService.checkHealthStatus('11111111');

      return res.json({ brand, hostname, serviceRecords, apiKeyService });

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
