### Publish

### Run Tests

`npm run test`

Run specific test: `npx mocha -g "name of test" --timeout 600000`

### Random

Important to have a dependency alias on ethers v6:

```
    "ethers": "npm:ethers@^6.0.3",
```

alternative: peer dependency or bundled dependency:
// "bundledDependencies": ["ethers"],

### TODO

-   [x] move live tests to optimism-goerli
-   [ ] move to TypeScript
-   [ ] prefill priority fee based on chain conditions (e.g. important for polygon)
-   [ ] async bulk link creation function

### Notes

-   Packaged ethersv6 into the dependencies to avoid dependency issues with ethersv5. It increases bundle size by a lot, we need a better way of dealing with this. Potentially use Viem? https://viem.sh
