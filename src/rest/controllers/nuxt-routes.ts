import { Request, Response } from 'express';
import { DistributionResult } from '../../models/distribution-result';

class Controller {
  public async getDistributionRoutes(req: Request, res: Response) {
    const distributionDays = await DistributionResult.aggregate([
      {
        $project: {
          date: {
            $dateToString: {
              date: '$created',
              format: '%m-%d-%Y',
            },
          },
        },
      },
      {
        $group: {
          _id: '$date',
        },
      },
    ]);

    const dates = distributionDays.map(day => day._id);

    return res.json(dates);
  }
}

export default new Controller();
