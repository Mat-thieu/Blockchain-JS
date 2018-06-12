/* eslint-disable */
const { spawn } = require('child_process');
const rp = require('request-promise');
const notifier = require('node-notifier');

const nodeStates = {
  3001: false,
  3002: false,
  3003: false,
  3004: false,
};

const portsArray = Object.keys(nodeStates);

// Spawn the nodes
console.log('Spawning nodes');
portsArray.forEach((port) => {
  const child = spawn('node', ['dev/node.js', port]);

  child.stdout.on('data', (data) => {
    if (!isNaN(data.toString())) {
      nodeStates[Number(data.toString())] = true;
      checkReady();
      return;
    };
    console.log(`LOG: ${data}`);
  });
  child.stderr.on('data', data => console.error(`NODE ERROR: \n${data}`));
});


// DEV: Change to actual success later
async function checkReady() {
  const ready = portsArray.every(port => nodeStates[port]);
  if (!ready) return;

  console.log('All instances running \n', nodeStates);

  // Connect the nodes
  const pings = portsArray.map((port, index) => {
    if (index === 0) return;
    const requestOptions = {
      uri: `http://localhost:${portsArray[0]}/public/join-network`,
      method: 'post',
      body: {
        newNodeUrl: `http://localhost:${port}`,
      },
      json: true,
    };

    return rp(requestOptions);
  });
  try {
    await Promise.all(pings);
  } catch (error) {
    console.log(error);
    return;
  }

  console.log('Network created');

  notifier.notify({
    title: 'Blockchain established!',
    sound: false,
    message: `${portsArray.length} nodes running on ports ${portsArray[0]} to ${portsArray.reverse()[0]}`,
  });
}