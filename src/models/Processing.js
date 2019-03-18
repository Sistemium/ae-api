import ModelSchema from 'sistemium-mongo/lib/schema';

export default new ModelSchema({
  collection: 'Processing',
  schema: {
    name: String,
    lastTimestamp: Date,
  },
  mergeBy: ['name'],
}).model();
