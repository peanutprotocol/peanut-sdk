# Peanut Protocol SDK

**Send tokens via cryptographically secure links**.

NPM package [here](https://www.npmjs.com/package/@squirrel-labs/peanut-sdk). This package makes use of ethers v5. If you're using ethers v6 or a different web3 library, please reach out on discord.

-   [Documentation available here](https://docs.peanut.to/sdk-documentation/building-with-the-sdk/getting-started-with-the-sdk/)

### Install

`npm i @squirrel-labs/peanut-sdk`

or via CDN:

`<script src="https://cdn.jsdelivr.net/npm/@squirrel-labs/peanut-sdk/dist/index.js"></script> `

### Documentation

-   [Usage and docs available here](https://docs.peanut.to/integrations/sdk-quick-start)

### Feedback

This is an early SDK, and we're very open to suggestions and improvements. Please feel free to ping on discord #dev channel, or open an issue (or PR) on the [Github repo](https://github.com/peanutprotocol/peanut-sdk/issues).

# Development

Section for the people that develop this sdk / want to contribute.

## Running devnet tests

1. Install tenderly cli
2. Type `tenderly login` in the terminal
3. Choose "Access key" option
4. Enter the key. Find it in the peanut's notion in the tools section or ask @nebolax.
5. Ready! Develop & run devnet tests the way you normally do it 🥜

# Statement Of Procedures (SOP)

## Adding a chain

EVM:

1. update `src/data/contracts.json`
2. `cd src/data && python3 fillChainDetails.py`
3. `python3 fillTokenDetails.py`
4. Add test case
5. QA / run test suite

## New Contract Version

(this process has to be optimized, it kinda sucks)

-   update getContract switch cases
-   update getLatesContractVersion.test.ts
-   update with new peanut ABIs (can we reuse structure and save on package size?)
-   update contracts.json (copied from peanut-contracts repo)
-   update data.ts exports, other imports
-   update LATEST_CONTRACT_VERSION ... in data ts.
-   update signWithdrawalMessage
-   update eip712domains.ts
-   update createClaimXChainPayload
-   update getLinkDetails
-   update prepareRaffleDepositTxs
-   just CTRL+F for 'v4.2' or 'v4.3'
-   change `const routerContractVersion = 'Rv4.2'`

## Adding a custom token

1. Fill out `src/data/manualTokenDetails.json` with the token details
2. run `fillTokenDetails.py`
3. release
