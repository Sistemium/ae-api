import ModelSchema from 'sistemium-mongo/lib/schema';

export default new ModelSchema({
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
}).model();
