import log from 'sistemium-telegram/services/log';
import * as mongoose from 'sistemium-mongo/lib/mongoose';
import debounce from 'lodash/debounce';

import { schema } from '../models/Stock';

import stockProcessing from './stockProcessing';

const { debug, error } = log('watch');

main().catch(error);

async function main() {

  const mongo = await mongoose.connection();

  debug('connected');

  await mongoose.connect();

  const Stock = mongo.model('Stock', schema);

  Stock.watch()
    .on('change', debounce(stockProcessing, 5000));

  await stockProcessing();


}

process.on('SIGINT', async () => {

  error('SIGINT');

  await mongoose.disconnect()
    .then(() => debug('disconnected main'))
    .catch(error);

  process.exit();

});
