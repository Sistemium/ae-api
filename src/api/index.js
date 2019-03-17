import Router from 'koa-router';
import KoaApi from 'sistemium-mongo/lib/koa';
import { defaultRoutes } from 'sistemium-mongo/lib/api';
import auth from 'sistemium-mongo/lib/auth';

import Article from '../models/Article';

const api = new Router()
  .prefix('/api')
  .use(auth({ requiredRole: 'ae.1c' }));

defaultRoutes(api, [Article]);

export default new KoaApi({ api });
