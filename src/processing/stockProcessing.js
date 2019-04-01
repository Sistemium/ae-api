import map from 'lodash/map';
import log from 'sistemium-telegram/services/log';
import { serverDateFormat } from 'sistemium-telegram/services/moments';
import { eachSeriesAsync } from 'sistemium-telegram/services/async';

import Anywhere from 'sistemium-sqlanywhere';

import articleProcessing from './articleProcessing';

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

  busy = false;

  await conn.disconnect().catch(error);

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
    { $addFields: { isProcessed: { $cmp: ['$timestamp', '$processing.lastTimestamp'] } } },
    { $match: { isProcessed: 1 } },
    { $limit: 1 },
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

  const declare = `declare local temporary table #stock (
    warehouseId STRING,
    articleId STRING, 
    volume INT
  )`;

  const insert = `insert into #stock (
    warehouseId, articleId, volume
  ) values (?, ?, ?)`;

  const merge = `merge into ae.WarehouseStock as d using with auto name (
    select
      ? as [date],
      w.id as warehouse,
      a.id as article,
      s.volume
    from #stock s
      join ae.Article a on a.xid = s.articleId
      join ae.Warehouse w on w.xid = s.warehouseId
  ) as t on t.warehouse = d.warehouse
    and t.article = d.article 
    and t.[date] = d.[date]
  when not matched then insert
  when matched and d.volume <> t.volume then update
  `;

  const nullify = `update ae.WarehouseStock as s
    set volume = 0
    from ae.Article a, ae.Warehouse w
    where a.id = s.article
      and w.id = s.warehouse
      and w.xid = ?
      and s.[date] = ?
      and s.volume <> 0 
      and a.xid not in (
        select articleId from #stock
      )
  `;

  const cols = ['warehouseId', 'articleId', 'qty'];
  const values = stockData.map(s => map(cols, col => s[col]));

  try {

    await conn.execImmediate(declare);

    const inserted = await conn.execImmediate(insert, values);
    debug('inserted', inserted || 0);

    const merged = await conn.execImmediate(merge, [date]);
    debug('merged', merged || 0);

    const nullified = await conn.execImmediate(nullify, [warehouseId, date]);
    debug('nullified', nullified || 0);

    await conn.commit();

  } catch (e) {
    await conn.rollback();
    throw e;
  }

}
