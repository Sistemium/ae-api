import map from 'lodash/map';
import log from 'sistemium-telegram/services/log';
import { serverDateFormat } from 'sistemium-telegram/services/moments';
import { eachSeriesAsync } from 'sistemium-telegram/services/async';

import Anywhere from 'sistemium-sqlanywhere';

import articleProcessing from './articleProcessing';

import * as sql from './sql/stock';

import Stock from '../models/Stock';
import Processing from '../models/Processing';

const { debug, error } = log('processing:stock');

let busy = false;

export default async function () {

  debug('start');

  if (busy) {
    debug('busy');
    return;
  }

  busy = true;

  const jobs = await stockTimestamps();

  debug('jobs:', jobs.length);

  const conn = new Anywhere();

  try {

    await conn.connect();

    await articleProcessing(conn);

    if (!jobs.length) {
      debug('nothing to process');
      busy = false;
      return;
    }

    await conn.execImmediate(sql.declare);

    await eachSeriesAsync(jobs, async ({ _id: warehouseId, timestamp }) => {
      debug(warehouseId, timestamp);
      await processWarehouseStock(warehouseId, timestamp, conn);
      await Processing.merge([{
        name: warehouseId,
        lastTimestamp: new Date(),
        group: 'Stock',
      }]);
    });

  } catch (e) {
    error(e.message || e);
  }

  await conn.disconnect().catch(error);

  busy = false;

}


async function stockByArticle(warehouseId, timestamp) {

  return Stock.aggregate([
    {
      $match: { warehouseId, timestamp },
    },
    {
      $group: {
        _id: '$articleId',
        qty: { $sum: '$qty' },
        count: { $sum: 1 },
      },
    },
    { $addFields: { articleId: '$_id', warehouseId } },
  ]);

}

async function stockTimestamps() {

  return Stock.aggregate([
    {
      $match: {
        timestamp: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$warehouseId',
        timestamp: { $max: '$timestamp' },
      },
    },
    {
      $lookup: {
        from: 'Processing',
        let: { warehouseId: '$_id' },
        pipeline: [{
          $match: {
            $expr: { $eq: ['$name', '$$warehouseId'] },
          },
        }],
        as: 'processing',
      },
    },
    {
      $unwind: { path: '$processing', preserveNullAndEmptyArrays: true },
    },
    { $addFields: { notProcessed: { $cmp: ['$timestamp', '$processing.lastTimestamp'] } } },
    { $match: { notProcessed: 1 } },
    // { $limit: 1 },
  ]);

}

/**
 *
 * @param {String} warehouseId
 * @param {Date} timestamp
 * @param {Anywhere} conn
 * @returns {Promise<void>}
 */

async function processWarehouseStock(warehouseId, timestamp, conn) {

  const date = serverDateFormat(timestamp);
  const data = await stockByArticle(warehouseId, timestamp);

  debug('processWarehouseStock:', warehouseId, date, data.length);

  await exportStock(date, warehouseId, conn, data);

}


async function exportStock(date, warehouseId, conn, stockData) {

  const cols = ['warehouseId', 'articleId', 'qty'];
  const values = stockData.map(s => map(cols, col => s[col]));

  try {

    const inserted = await conn.execImmediate(sql.insert, values);
    debug('inserted', inserted || 0);

    const merged = await conn.execImmediate(sql.merge, [date]);
    debug('merged', merged || 0);

    const nullified = await conn.execImmediate(sql.nullify, [warehouseId, date]);
    debug('nullified', nullified || 0);

    await conn.commit();

  } catch (e) {
    await conn.rollback();
    throw e;
  }

}
