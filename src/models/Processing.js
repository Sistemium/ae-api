import ModelSchema from 'sistemium-mongo/lib/schema';

export default new ModelSchema({
  collection: 'Processing',
  schema: {
    name: String,
    group: String,
    lastTimestamp: Date,
  },
  mergeBy: ['name'],
}).model();
