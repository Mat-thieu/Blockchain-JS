const rp = require('request-promise');

class Network {
  constructor({ port, nodeAddress }) {
    this.port = port;
    this.networkNodes = [];
    this.currentNodeUrl = `http://localhost:${port}`;
    this.nodeAddress = nodeAddress;

    // Quarantined nodes had failed responses
    // These nodes will be pinged 3 times over 3 seconds, if all fails, remove the node
    this.quarantinedNodes = [];
  }

  addNewNode(node) {
    if (
      !this.networkNodes.includes(node) &&
      this.currentNodeUrl !== node
    ) {
      this.networkNodes.push(node);

      return true;
    }
    return false;
  }

  addNewNodesBulk(nodes) {
    nodes.forEach(node => this.addNewNode(node));

    return true;
  }

  broadcast(config) {
    return new Promise((resolve) => {
      const formattedConfig = config;
      const { path } = formattedConfig;
      delete formattedConfig.path;

      const totalNodes = this.networkNodes.length;
      const failed = [];
      const succeeded = [];

      function checkDone() {
        if ((failed.length + succeeded.length) === totalNodes) {
          resolve(succeeded);
        }
      }

      this.networkNodes.forEach((node) => {
        const requestOptions = Object.assign(
          { uri: `${node}${path}` },
          { json: true },
          config,
        );

        rp(requestOptions).then((data) => {
          succeeded.push(data);
        }).catch(() => {
          failed.push(node);
        }).finally(() => {
          checkDone();
        });
      });
    });
  }
}

module.exports = Network;
