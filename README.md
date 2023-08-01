# peanut-sdk

**Send tokens via cryptographically secure links**.

NPM package [here](https://www.npmjs.com/package/@squirrel-labs/peanut-sdk). This package makes use of ethers v6. If you're using ethers v5, please refer to [@squirrel-labs/peanut-sdk-ethersv5](https://www.npmjs.com/package/@squirrel-labs/peanut-sdk-ethersv5).

### Install

`npm i @squirrel-labs/peanut-sdk`

or via CDN:

`<script src="https://cdn.jsdelivr.net/npm/@squirrel-labs/peanut-sdk/dist/peanut-sdk.js"></script> `

### Usage

Usage is as easy as:

```
import peanut from '@squirrel-labs/peanut-sdk';

// setup signer with ethers v6 (ethersv5, web3js and viem support coming soon!)
const provider = new ethers.BrowserProvider(window.ethereum, 'any')
const signer = await provider.getSigner()

// create link
const { link, txReceipt } = await peanut.createLink({
  signer: signer,
  chainId: 5,
  tokenAmount: 0.001,
  tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
});

// get status of link
const status = await peanut.getLinkStatus({signer: wallet, link: link});
console.log(status);

// claim link
const claimTx = await peanut.claimLink({ signer: wallet, link: link });
```

If you want your users to be able to claim links without having to pay gas, you can use the `claimLinkGasless` function:

```
const response = await peanut.claimLinkGasless(link, wallet.address, process.env.PEANUT_DEV_API_KEY);
```

Please apply for an api key on telegram/discord for this.

If you're using a browser wallet, you will need to use ethersv6 and pass it in to the peanut sdk. ethersv5 compatibility coming soon.

### Feedback

This is an early SDK, and we're very open to suggestions and improvements. Please feel free to ping on discord #dev channel, or open an issue (or PR) on the [Github repo](https://github.com/ProphetFund/peanut-sdk/issues).

### Examples

Check the /examples folder.
