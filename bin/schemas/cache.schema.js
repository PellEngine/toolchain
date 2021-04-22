const Ajv = require('ajv');
const ajv = new Ajv();

const cacheSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'androidSdk',
    'androidNdk',
    'androidBuildTools'
  ],
  properties: {
    androidSdk: { type: 'string' },
    androidNdk: { type: 'string' },
    androidBuildTools: { type: 'string' },
    androidKeyStore: { type: 'string' },
    androidKeyStorePass: { type: 'string' },
    androidKeyStoreAlias: { type: 'string' }
  }
};

const validate = ajv.compile(cacheSchema);

module.exports = {
  cacheSchema: cacheSchema,
  validateCache: validate
};