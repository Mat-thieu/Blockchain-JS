const rp = require('request-promise');

const Blockchain = require('./../modules/Blockchain');
const networkBroadcast = require('./../util/network-broadcast');

/*
*
* Local operations
*
*/

module.exports = (app, opts, next) => {
  const { Chain, nodeAddress } = opts;

  app.get('/mine', async () => {
    const { lastBlock } = Chain;
    const previousBlockHash = lastBlock.hash;
    const currentBlockData = {
      transactions: Chain.pendingTransactions,
      index: lastBlock.index + 1,
    };
    const nonce = Chain.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = Blockchain.hashBlock(previousBlockHash, currentBlockData, nonce);

    const newBlock = Chain.createNewBlock(nonce, previousBlockHash, blockHash);

    try {
      await networkBroadcast(Chain.networkNodes, {
        path: '/callback/new-block',
        method: 'POST',
        body: newBlock,
      });
    } catch (error) {
      return {
        data: 'Broadcast failed',
        error,
      };
    }

    const rewardTransaction = {
      amount: 12.5, // Mine reward should be validated as well?
      sender: 'MINE-REWARD',
      recipient: nodeAddress,
    };

    const rewardTransactionRequestOptions = {
      uri: `${Chain.currentNodeUrl}/public/create-transaction`,
      method: 'post',
      body: rewardTransaction,
      json: true,
    };

    try {
      await rp(rewardTransactionRequestOptions);
    } catch (error) {
      return {
        data: 'Reward transaction failed',
        error,
      };
    }

    return {
      data: newBlock,
    };
  });

  app.get('/consensus', async () => {
    let networkBlockchains;
    try {
      networkBlockchains = await networkBroadcast(Chain.networkNodes, {
        path: '/blockchain',
        method: 'GET',
      });
    } catch (error) {
      return {
        data: 'Network request failed',
        error,
      };
    }

    const currentChainLength = Chain.chain.length;
    let maxChainLength = currentChainLength;
    let newLongestChain;
    let newPendingTransactions;
    networkBlockchains.forEach((blockchain) => {
      const bcData = blockchain.data;
      if (bcData.chain.length > maxChainLength) {
        maxChainLength = bcData.chain.length;
        newLongestChain = bcData.chain;
        newPendingTransactions = bcData.pendingTransactions;
      }
    });

    // Add additional check for chain validity
    if (
      !newLongestChain ||
      (newLongestChain && !Chain.chainIsValid(newLongestChain))
    ) {
      return {
        data: 'Current chain seems up-to-date',
      };
    }

    Chain.chain = newLongestChain;
    Chain.pendingTransactions = newPendingTransactions;

    return {
      data: 'Local chain has been updated',
    };
  });

  next();
};

