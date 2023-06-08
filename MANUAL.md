### Publish


### Run Tests
```npm run test```

Run specific test: ```npx mocha -g "name of test" --timeout 600000```


### Random
Important to have a dependency alias on ethers v6: 
```
    "ethers": "npm:ethers@^6.0.3",
```

alternative: peer dependency or bundled dependency:
  // "bundledDependencies": ["ethers"],


### TODO
- [ ] move live tests to optimism-goerli
- [ ] move to TypeScript
