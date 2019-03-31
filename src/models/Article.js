import ModelSchema from 'sistemium-mongo/lib/schema';

const schema = new ModelSchema({
  collection: 'Article',
  schema: {
    name: String,
    code: String,
    barcodes: Array,
    pieceVolume: Number,
    packageRel: Number,
  },
  indexes: [
    { barcodes: 1 },
  ],
});

export default schema.model();
export const articleSchema = schema.mongooseSchema();
