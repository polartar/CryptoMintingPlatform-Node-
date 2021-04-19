import { Router } from 'express';
import nuxtRoutesController from './controllers/nuxt-routes';
import healthController from './controllers/health';

export default Router()
  .get('/api/routes/distribution', nuxtRoutesController.getDistributionRoutes)
  .get('/api/routes/ip', nuxtRoutesController.getIpAddress)
  .get('/health', healthController.getHealth)
  .get('/health/serviceUrls', healthController.getServiceUrl);
