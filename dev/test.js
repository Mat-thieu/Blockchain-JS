/* eslint-disable */

const cliSpinners = require('cli-spinners');
const ora = require('ora');

const loader = ora({
  text: 'Mining coin',
  spinner: cliSpinners.bouncingBar,
  // color: 'cyan',
});
loader.start();

setTimeout(() => loader.succeed('Mined new block!'), 3000);

// console.log();

// const sha256 = require('sha256');

// const crypto = require('crypto');

// const fakeBlock = {
//     "transactions": [],
//     "index": 1,
// };
// const prevBlock = 'asdasdadasd';
// const s = JSON.stringify(fakeBlock);

// console.time('pack');
// for (var i = 0; i < 50000; i++) {
//     sha256(`${prevBlock}${s}${i}`)
// }
// console.timeEnd('pack');

// console.time('native');
// for (var i = 0; i < 50000; i++) {
//     crypto.createHash('sha256').update(`${prevBlock}${s}${i}`).digest('hex')
// }
// console.timeEnd('native');

// console.log({ pack: sha256(`${prevBlock}${s}1`) })
// console.log({ native: crypto.createHash('sha256').update(`${prevBlock}${s}1`).digest('hex') })