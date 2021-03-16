import { Router } from 'express';
import nuxtRoutesController from './controllers/nuxt-routes';

export default Router()
  .get('/routes/distribution', nuxtRoutesController.getDistributionRoutes)
  .get('/routes/ip', nuxtRoutesController.getIpAddress);
