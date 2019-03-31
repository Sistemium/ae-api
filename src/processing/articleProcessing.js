import log from 'sistemium-telegram/services/log';
import { serverDateTimeFormat } from 'sistemium-telegram/services/moments';
import { eachSeriesAsync } from 'sistemium-telegram/services/async';

import maxBy from 'lodash/maxBy';

import Processing from '../models/Processing';
import Article from '../models/Article';

const { debug, error } = log('processing:articles');

export default async function (conn) {

  const group = 'Article';

  let processing = await Processing.findOne({ name: group, group });

  if (!processing) {
    processing = new Processing({ name: group, group, lastTimestamp: new Date() });
  }

  const { lastTimestamp } = processing;

  const sinceLast = { $gt: lastTimestamp };

  const articles = await Article.find({ ts: sinceLast });

  if (!articles.length) {
    debug('nothing to process since', lastTimestamp);
    return;
  }

  const merge = `merge into ae.Article t using with auto name (
    select
        ? as name,
        ? as code,
        ? as barcodes,
        isNull(?,0) as packageRel,
        isNull(?, 0) as pieceVolume,
        ? as deviceCts,
        ? as xid
  ) as d on d.xid = t.xid
  
  when not matched
    then insert

  when matched
    and xmlForest (
        d.name,
        d.code,
        d.barcodes,
        d.packageRel,
        d.deviceCts,
        cast(d.pieceVolume as DECIMAL3) as pieceVolume
    ) <> xmlForest(
        t.name,
        t.code,
        t.barcodes,
        t.packageRel,
        t.deviceCts,
        cast(t.pieceVolume as DECIMAL3) as pieceVolume
    )
    then update
  `;

  const prepared = await conn.prepare(merge);

  await eachSeriesAsync(articles, async a => {

    const barcodes = JSON.stringify(a.barcodes);

    const params = [
      a.name,
      a.code,
      barcodes.length > 10 ? barcodes : null,
      a.packageRel,
      a.pieceVolume,
      serverDateTimeFormat(a.cts),
      a.id,
    ];

    const merged = await conn.exec(prepared, params);

    debug('merged', a.code, merged);

  });

  await conn.dropPrepared(merge);

  processing.lastTimestamp = maxBy(articles, 'ts').ts;

  if (!processing.lastTimestamp) {
    error('empty timestamp');
    return;
  }

  await processing.save();

}
