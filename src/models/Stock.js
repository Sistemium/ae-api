import ModelSchema from 'sistemium-mongo/lib/schema';

export default new ModelSchema({
  collection: 'Stock',
  schema: {
    timestamp: Date,
    stockBatch: String,
    qty: Number,
    warehouseId: String,
    articleId: String,
  },
  indexes: [
    { warehouseId: 1, timestamp: -1 },
  ],
  mergeBy: ['warehouseId', 'articleId', 'stockBatch'],
}).model();
