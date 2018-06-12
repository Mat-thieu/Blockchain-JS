const Joi = require('joi');

/*
*
* Network event listeners
*
*/

module.exports = (app, opts, next) => {
  const { blockchain, network } = opts;

  // A new transaction has been created in the network
  app.post('/new-transaction', {
    schema: {
      body: Joi.object().keys({
        amount: Joi.number().min(0),
        sender: Joi.string(),
        recipient: Joi.string(),
        transactionId: Joi.string(),
      }).required(),
    },
  }, async request => ({
    data: blockchain.addTransactionToPending(request.body),
  }));

  // A new block has been created in the network
  app.post('/new-block', {
    schema: {
      body: Joi.object().keys({
        index: Joi.number().min(1),
        timestamp: Joi.number().min(Date.now()),
        transactions: Joi.array(),
        nonce: Joi.number().min(1),
        hash: Joi.string(),
        previousBlockHash: Joi.string(),
      }).required(),
    },
  }, async request => ({
    data: blockchain.addNewBlockToChain(request.body) || {
      data: request.body,
      error: 'Invalid block',
    },
  }));

  // All existing network nodes will receive new nodes via this route
  app.post('/new-node', {
    schema: {
      body: Joi.object().keys({
        newNodeUrl: Joi.string().uri(),
      }).required(),
    },
  }, async request => ({
    data: network.addNewNode(request.body.newNodeUrl) ? 'Node not added' : 'New node added',
  }));

  // This is the callback to registering, containing the entire network
  app.post('/receive-network-nodes', {
    schema: {
      body: Joi.object().keys({
        networkNodes: Joi.array().items(Joi.string().uri().required()),
      }).required(),
    },
  }, async request => ({
    data: network.addNewNodesBulk(request.body.networkNodes),
  }));

  next();
};
