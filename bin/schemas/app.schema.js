const Ajv = require('ajv');
const ajv = new Ajv();

const appConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: [ 'name', 'bundleId', 'androidVersion', 'src', 'androidSrc', 'iosSrc' ],
  properties: {
    name: { type: 'string' },
    bundleId: { type: 'string' },
    androidVersion: { type: 'number' },
    src: {
      type: 'array',
      items: { type: 'string' }
    },
    androidSrc: {
      type: 'array',
      items: { type: 'string' }
    },
    iosSrc: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

const validate = ajv.compile(appConfigSchema);

module.exports = {
  appConfigSchema: appConfigSchema,
  validateAppConfig: validate
};