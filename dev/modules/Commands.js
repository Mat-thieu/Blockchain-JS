/* eslint-disable no-console */

const rp = require('request-promise');

// CLI tools
const inquirer = require('inquirer');
const chalk = require('chalk');
const cliSpinners = require('cli-spinners');
const ora = require('ora');

const Blockchain = require('./Blockchain');

class Commands {
  constructor({ blockchain, network }) {
    this.blockchain = blockchain;
    this.network = network;

    this.loader = ora({
      spinner: cliSpinners.bouncingBar,
    });

    this.publicMethods = {
      Explore: [
        {
          name: 'View blockchain',
          handler: 'viewBlockchain',
        },
        {
          name: 'View last block',
          handler: 'viewLastBlock',
        },
        {
          name: 'View pending transactions',
          handler: 'viewPending',
        },
      ],
      Operations: [
        {
          name: 'Connect to network',
          loadingText: 'Pinging node',
          preExecute: [{
            type: 'input',
            name: 'nodeUrl',
            message: 'Enter a network node url to connect to',
          }],
          handler: 'connect',
        },
        {
          name: 'Mine',
          loadingText: 'Mining new block',
          handler: 'mine',
        },
        {
          name: 'Consensus',
          loadingText: 'Running consensus algorithm',
          handler: 'consensus',
        },
        {
          name: 'Create transaction',
          loadingText: 'Creating transaction',
          preExecute: [
            {
              type: 'input',
              name: 'amount',
              message: 'Set amount to send',
            },
            {
              type: 'input',
              name: 'recipient',
              message: 'Recipient node address',
            },
          ],
          handler: 'createTransaction',
        },
      ],
      Info: [
        {
          name: 'Node address',
          handler: 'listNodeAddress',
        },
        {
          name: 'Network nodes',
          handler: 'listNetwork',
        },
      ],
    };
  }

  listen() {
    const { choices, methods } = this.formatMethods();
    const createPrompt = async () => {
      const { chosenmethod } = await inquirer.prompt([
        {
          type: 'list',
          name: 'chosenmethod',
          message: 'BLOCKCHAIN: Choose a method',
          choices,
        },
      ]);

      const methodData = methods.find(method => method.name === chosenmethod);

      // Collect additional data necessary for the method
      let additionalData;
      if ('preExecute' in methodData) {
        additionalData = await inquirer.prompt(methodData.preExecute);
      }

      this.loader.text = methodData.loadingText || '';
      this.loader.start();

      const response = await this[methodData.handler](additionalData);
      if ('error' in response) {
        this.loader.fail(response.data);
        console.log(chalk.bgRed('ERROR', `${response.error} \n`));
      } else if (typeof response.data === 'object') {
        this.loader.succeed();
        console.log(response.data);
        console.log('\n');
      } else {
        this.loader.succeed(`${response.data} \n`);
      }

      createPrompt();
    };

    createPrompt();
  }

  formatMethods() {
    const separators = Object.keys(this.publicMethods);
    const choices = [];
    const methods = [];

    separators.forEach((separator) => {
      const separatorText = chalk.bold.underline.cyan(`${separator}`);
      choices.push(new inquirer.Separator(separatorText));
      this.publicMethods[separator].forEach((method) => {
        choices.push(method.name);
        methods.push(method);
      });
    });

    return {
      choices,
      methods,
    };
  }

  async mine() {
    const { lastBlock } = this.blockchain;
    const previousBlockHash = lastBlock.hash;
    const currentBlockData = {
      transactions: this.blockchain.pendingTransactions,
      index: lastBlock.index + 1,
    };
    const nonce = this.blockchain.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = Blockchain.hashBlock(previousBlockHash, currentBlockData, nonce);

    const newBlock = this.blockchain.createNewBlock(nonce, previousBlockHash, blockHash);

    try {
      await this.network.broadcast({
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
      recipient: this.nodeAddress,
    };

    const rewardTransactionRequestOptions = {
      uri: `${this.network.currentNodeUrl}/public/create-transaction`,
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
      data: `Successfully mined new block containing ${newBlock.transactions.length} new transactions`,
    };
  }

  async consensus() {
    let networkBlockchains;
    try {
      networkBlockchains = await this.network.broadcast({
        path: '/blockchain',
        method: 'GET',
      });
    } catch (error) {
      return {
        data: 'Network request failed',
        error,
      };
    }

    const currentChainLength = this.blockchain.chain.length;
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
      (newLongestChain && !this.blockchain.chainIsValid(newLongestChain))
    ) {
      return {
        data: 'Current chain seems up-to-date',
      };
    }

    this.blockchain.chain = newLongestChain;
    this.blockchain.pendingTransactions = newPendingTransactions;

    return {
      data: 'Local chain has been updated',
    };
  }

  async createTransaction({ amount, recipient }) {
    const transactionRequestOptions = {
      uri: `${this.network.currentNodeUrl}/public/create-transaction`,
      method: 'POST',
      body: {
        amount,
        sender: this.network.nodeAddress,
        recipient,
      },
      json: true,
    };

    try {
      await rp(transactionRequestOptions);
    } catch (error) {
      return {
        data: 'Request failed',
        error,
      };
    }

    return {
      data: 'Transaction created and broadcast',
    };
  }

  async connect({ nodeUrl }) {
    const connectRequestOptions = {
      uri: `${nodeUrl}/public/join-network`,
      method: 'post',
      body: {
        newNodeUrl: `http://localhost:${this.network.port}`,
      },
      json: true,
    };

    try {
      await rp(connectRequestOptions);
    } catch (error) {
      return {
        data: 'Network request failed',
        error,
      };
    }

    return {
      data: 'Succesfully connected to network',
      some: this,
    };
  }

  async listNodeAddress() {
    return {
      data: `Current node address: \n ${this.network.nodeAddress}`,
    };
  }

  async listNetwork() {
    return {
      data: `Total nodes: ${this.network.networkNodes.length}\n ${this.network.networkNodes.join('\n ')}`,
    };
  }

  async viewBlockchain() {
    return {
      data: this.blockchain.chain,
    };
  }

  async viewLastBlock() {
    return {
      data: this.blockchain.lastBlock,
    };
  }

  async viewPending() {
    return {
      data: this.blockchain.pendingTransactions,
    };
  }
}

module.exports = Commands;
