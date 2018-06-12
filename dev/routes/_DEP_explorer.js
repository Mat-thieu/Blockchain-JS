/*
*
* Query various parts of the chain
*
*/
module.exports = (app, opts, next) => {
  const { Chain } = opts;

  app.get('/block/:blockHash', async (request) => {
    const { blockHash } = request.params;
    const foundBlock = Chain.findBlock(blockHash);

    return {
      data: foundBlock || null,
    };
  });

  app.get('/transaction/:transactionId', async (request) => {
    const { transactionId } = request.params;
    const foundTransaction = Chain.findTransaction(transactionId);

    return {
      data: foundTransaction || null,
    };
  });

  app.get('/address/:address', async (request) => {
    const { address } = request.params;
    const foundAddressData = Chain.findAddressData(address);

    return {
      data: foundAddressData,
    };
  });

  next();
};
