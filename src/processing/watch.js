import log from 'sistemium-telegram/services/log';
import * as mongoose from 'sistemium-mongo/lib/mongoose';
import debounce from 'lodash/debounce';

import { schema as stockSchema } from '../models/Stock';
import { articleSchema } from '../models/Article';
import { processingSchema } from '../models/Processing';

import stockProcessing from './stockProcessing';

const { debug, error } = log('watch');

const WATCH_DEBOUNCE = parseInt(process.env.WATCH_DEBOUNCE, 0) || 5000;

main().catch(error);

async function main() {

  const mongo = await mongoose.connection();

  debug('connected');

  await mongoose.connect();

  const Stock = mongo.model('Stock', stockSchema);
  const Article = mongo.model('Article', articleSchema);
  const Processing = mongo.model('Processing', processingSchema);

  const debouncedProcessing = debounce(stockProcessing, WATCH_DEBOUNCE);

  Processing.watch()
    .on('change', ({ operationType }) => {
      if (operationType === 'delete') {
        debouncedProcessing();
      }
    });

  Stock.watch()
    .on('change', debouncedProcessing);

  Article.watch()
    .on('change', debouncedProcessing);

  await stockProcessing();

}

process.on('SIGINT', async () => {

  error('SIGINT');

  await mongoose.disconnect()
    .then(() => debug('disconnected main'))
    .catch(error);

  process.exit();

});
