import ModelSchema from 'sistemium-mongo/lib/schema';

export default new ModelSchema({
  collection: 'Warehouse',
  schema: {
    name: String,
    code: String,
  },
}).model();
