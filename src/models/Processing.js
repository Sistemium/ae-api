import ModelSchema from 'sistemium-mongo/lib/schema';

const schema = new ModelSchema({
  collection: 'Processing',
  schema: {
    name: String,
    group: String,
    lastTimestamp: Date,
  },
  mergeBy: ['name'],
});

export default schema.model();
export const processingSchema = schema.mongooseSchema();
