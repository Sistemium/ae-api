export const declare = `declare local temporary table #stock (
    warehouseId STRING,
    articleId STRING, 
    volume INT
  )`;

export const insert = `insert into #stock (
    warehouseId, articleId, volume
  ) values (?, ?, ?)`;

export const merge = `merge into ae.WarehouseStock as d using with auto name (
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

export const nullify = `update ae.WarehouseStock as s
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

export const ifExistsWarehouse = 'select id from ae.Warehouse where xid = ?';

export const insertWarehouse = `insert into ae.Warehouse (
    xid, name, code
  ) values (?, ?, ?)`;
