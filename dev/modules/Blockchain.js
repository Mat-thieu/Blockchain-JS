const crypto = require('crypto');

const uuid = require('./../util/uuid');

class Blockchain {
  constructor({ POWcode }) {
    this.chain = [];
    this.pendingTransactions = [];

    this.POWcode = POWcode;

    this.genesis = {
      nonce: 0,
      previousBlockHash: '',
      hash: 'GENESIS',
    };
    this.createNewBlock(
      this.genesis.nonce,
      this.genesis.previousBlockHash,
      this.genesis.hash,
    );
  }

  createNewBlock(nonce, previousBlockHash, hash) {
    const newBlock = {
      index: this.chain.length + 1, // Perhaps not +1 because index @ 0
      timestamp: Date.now(),
      transactions: this.pendingTransactions,
      nonce,
      hash,
      previousBlockHash,
    };

    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  static createNewTransaction({ amount, sender, recipient }) {
    const newTransaction = {
      amount,
      sender,
      recipient,
      transactionId: uuid(),
    };

    return newTransaction;
  }

  addTransactionToPending(transaction) {
    this.pendingTransactions.push(transaction);

    return this.lastBlock.index + 1;
  }

  addNewBlockToChain(newBlock) {
    const { lastBlock } = this;

    if (
      newBlock.hash.substring(0, this.POWcode.length) !== this.POWcode ||
      newBlock.index !== (lastBlock.index + 1) ||
      newBlock.previousBlockHash !== lastBlock.hash
    ) {
      return false;
    }

    this.chain.push(newBlock);
    this.pendingTransactions = [];

    return newBlock;
  }

  // Currentblock is only transactions and index
  static hashBlock(previousBlockHash, currentBlockData, nonce) {
    const input = [previousBlockHash, JSON.stringify(currentBlockData), nonce];
    const hash = crypto.createHash('sha256').update(input.join()).digest('hex');

    return hash;
  }

  proofOfWork(previousBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = Blockchain.hashBlock(previousBlockHash, currentBlockData, nonce);
    while (hash.substring(0, this.POWcode.length) !== this.POWcode) {
      nonce += 1;
      hash = Blockchain.hashBlock(previousBlockHash, currentBlockData, nonce);
    }

    return nonce;
  }

  chainIsValid(blockchain) {
    let chainIsValid = blockchain.every((currentBlock, index, self) => {
      if (!index) return true; // skip genesis, as there's no previous block
      const previousBlock = self[index - 1];
      const blockHash = Blockchain.hashBlock(
        previousBlock.hash,
        {
          transactions: currentBlock.transactions,
          index: currentBlock.index,
        },
        currentBlock.nonce,
      );
      if (blockHash.substring(0, this.POWcode.length) !== this.POWcode) {
        return false;
      }
      if (currentBlock.previousBlockHash !== previousBlock.hash) {
        return false;
      }

      return true;
    });

    if (!chainIsValid) return chainIsValid;

    const chainGenesis = blockchain[0];
    const correctNonce = (chainGenesis.nonce === this.genesis.nonce);
    const correctPreviousBlockHash = (chainGenesis.previousBlockHash === this.genesis.previousBlockHash); // eslint-disable-line max-len
    const correctHash = (chainGenesis.hash === this.genesis.hash);
    const correctTransactions = (chainGenesis.transactions.length === 0);
    if (
      !correctNonce ||
      !correctPreviousBlockHash ||
      !correctHash ||
      !correctTransactions
    ) {
      chainIsValid = false;
    }

    return chainIsValid;
  }

  findBlock(blockHash) {
    return this.chain.find(block => block.hash === blockHash);
  }

  findTransaction(transactionId) {
    let foundTransaction;
    const parentBlock = this.chain.find((block) => {
      foundTransaction = block.transactions.find(transaction => (
        transaction.transactionId === transactionId
      ));

      return foundTransaction;
    });

    return {
      transaction: foundTransaction,
      block: parentBlock,
    };
  }

  findAddressData(address) {
    const addressTransactions = [];

    this.chain
      .forEach((block) => {
        const foundAssociatedTransactions = block.transactions
          .filter(transaction => (
            transaction.sender === address ||
            transaction.recipient === address
          ));

        addressTransactions.push(...foundAssociatedTransactions);
      });

    let balance = 0;
    addressTransactions.forEach((transaction) => {
      if (transaction.recipient === address) balance += transaction.amount;
      if (transaction.sender === address) balance -= transaction.amount;
    });

    return {
      addressTransactions,
      addressBalance: balance,
    };
  }
}

module.exports = Blockchain;
