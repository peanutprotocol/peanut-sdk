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
-   getRaffleInfo +++++
-   just CTRL+F for 'v4.2' or 'v4.3'
-   change `const routerContractVersion = 'Rv4.2'`
