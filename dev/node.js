const app = require('fastify')();
const Joi = require('joi');

// Load utilities
const uuid = require('./util/uuid');

// Load modules
const Blockchain = require('./modules/Blockchain');
const Network = require('./modules/Network');
const Commands = require('./modules/Commands');

const network = new Network({
  port: process.argv[2] || '3000',
  nodeAddress: uuid(),
});

const blockchain = new Blockchain({
  POWcode: '00000',
});

const commands = new Commands({
  blockchain,
  network,
});

app.setSchemaCompiler(schema => data => Joi.validate(data, schema));

app.get('/blockchain', async () => ({
  data: blockchain,
}));

app.register(require('./routes/listeners'), {
  prefix: '/callback',
  blockchain,
  network,
});

app.register(require('./routes/public-commands'), {
  prefix: '/public',
  blockchain,
  network,
});

app.listen(network.port, '127.0.0.1', (err) => {
  if (err) throw err;
  console.log(app.server.address().port); // eslint-disable-line no-console

  // Only show commands for master instance
  if (network.port === '3000') commands.listen();
});
