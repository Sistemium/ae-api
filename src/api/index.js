import Router from 'koa-router';
import KoaApi from 'sistemium-mongo/lib/koa';
import { defaultRoutes } from 'sistemium-mongo/lib/api';
import auth from 'sistemium-auth/lib/middleware';

import Article from '../models/Article';
import Stock, { postStockController } from '../models/Stock';
import Warehouse from '../models/Warehouse';

const api = new Router()
  .prefix('/api')
  .use(auth({ requiredRole: 'ae.1c' }));

api.post('/Stock', postStockController);
api.put('/Stock', postStockController);

defaultRoutes(api, [
  Article, Stock, Warehouse,
]);

export default new KoaApi({ api });
