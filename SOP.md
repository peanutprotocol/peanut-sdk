# [DEPRECATED] Statement Of Procedures (SOP)

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
-   update with new peanut ABIs (can we reuse structure and save on package size?)
-   update contracts.json (copied from peanut-contracts repo)
-   update data.ts consts (also arrays)

## Adding a custom token

1. Fill out `src/data/manualTokenDetails.json` with the token details
2. run `fillTokenDetails.py`
3. release
