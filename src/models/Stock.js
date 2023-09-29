import ModelSchema from 'sistemium-mongo/lib/schema';

const stockSchema = new ModelSchema({
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
    { articleId: 1, timestamp: -1 },
  ],
  mergeBy: ['warehouseId', 'articleId', 'stockBatch'],
});

export default stockSchema.model();
export const schema = stockSchema.mongooseSchema();

export async function postStockController(ctx, next) {
  const { body } = ctx.request;
  const isArray = Array.isArray(body);
  const array = isArray ? body : [body];
  const timestamp = new Date();
  array.forEach(item => {
    Object.assign(item, { timestamp });
  });
  await next();
}
