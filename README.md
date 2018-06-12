# Blockchain CLI JS

Blockchain node that's fully controllable via CLI.

[Following this Udemy course](https://www.udemy.com/certificate/UC-KH8GJ5ZS/) I set out to further develop this into an actual workable and safe blockchain node/system.

The methodology is based on Bitcoins, but it's still in active development and __should not be used in production__.

There's no unit tests, but the code is entirely linted following the [AirBNB JavaScript style guide](https://github.com/airbnb/javascript).

## Installation

```
$ cd blockchain
$ yarn
```

## Running the app

To run the CLI (master node)
```
$ node dev/node.js
```

To run some nodes for your own local network
```
$ npm run dev-network
```

## Available CLI methods

#### Explore
- `View blockchain`
- `View last block`
- `View pending transactions`

#### Operations
- `Mine`
- `Connect to a network`
- `Consensus`
- `Create transaction`

#### Info
- `Node address`
- `Network nodes`

## HTTP API methods
- `Create transaction`
- `Join network`

## Todo

- Shouldn't be able to mine block without pending transactions
- Validate currency
- Increased difficulty/reward after X transactions
- Implement transaction feels
- Implement the HashCash POW algorithm
- Lots more!
