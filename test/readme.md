# Peanut Protocol SDK - testing suite

### Total cost of running live testing suite: highly dependant on gas price, but between 3-4 USD

### Total runtime of running live testing suite:

-   [ ] basic: 30-60 seconds
-   [ ] live: 5-10 minutes (this takes way longer because --runInBand is used and tests have to be run sequentially to avoid nonce collision)

### Test cases:

-   [ ] Create link
-   [ ] Batch create link
-   [ ] Create Raffle link
-   [ ] Claim link
-   [ ] Claim link gasless
-   [ ] Claim link xchain
-   [ ] claim link xchain gasless
-   [ ] claim raffle link
-   [ ] gasless deposit
-   [ ] gasless reclaim

### Notes:

-   [ ] Always reclaiming links after creation to test claiming functionality and to reduce locked funds
-   [ ] All chains that are being used are in test.consts.ts
