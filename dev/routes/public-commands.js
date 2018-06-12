const Joi = require('joi');
const rp = require('request-promise');

const Blockchain = require('./../modules/Blockchain');

/*
*
* Commands others can execture on this node
*
*/

module.exports = (app, opts, next) => {
  const { blockchain, network } = opts;

  app.post('/create-transaction', {
    schema: {
      body: Joi.object().keys({
        amount: Joi.number().min(0),
        sender: Joi.string(),
        recipient: Joi.string(),
      }).required(),
    },
  }, async (request) => {
    const newTransaction = Blockchain.createNewTransaction(request.body);
    blockchain.addTransactionToPending(newTransaction);

    try {
      await network.broadcast({
        path: '/callback/new-transaction',
        method: 'POST',
        body: newTransaction,
      });
    } catch (error) {
      return {
        data: 'Broadcast failed',
        error,
      };
    }

    return {
      data: 'Successful broadcast transaction',
    };
  });


  // To register yourself, call this route on a network node to broadcast your existence
  // Other can use this to register theirselves to not only this node
  app.post('/join-network', {
    schema: {
      body: Joi.object().keys({
        newNodeUrl: Joi.string().uri(),
      }).required(),
    },
  }, async (request) => {
    const { newNodeUrl } = request.body;

    network.addNewNode(newNodeUrl);

    // Register new node with rest of network
    try {
      await network.broadcast({
        path: '/callback/new-node',
        method: 'POST',
        body: { newNodeUrl },
      });
    } catch (error) {
      return {
        data: 'Broadcast failed',
        error,
      };
    }

    // Send back entire network to new node
    const bulkRegistrationOptions = {
      uri: `${newNodeUrl}/callback/receive-network-nodes`,
      method: 'post',
      body: { networkNodes: [...network.networkNodes, network.currentNodeUrl] },
      json: true,
    };

    try {
      await rp(bulkRegistrationOptions);
    } catch (error) {
      return {
        data: 'Failed to send back network',
        error,
      };
    }

    return {
      data: 'Successfully registered new node',
    };
  });

  app.get('/ping', async () => ({
    data: true,
  }));

  next();
};
