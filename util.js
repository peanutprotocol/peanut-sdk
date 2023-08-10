console.log('hello');
// // convertSignerToV6
// // await convertSignerToV6
// async function convertSignerToV6(signer) {
//     // Check if it's already a v6 signer, just return it
//     if (signer.provider.broadcastTransaction) {
//         console.log("signer is already v6");
//         return signer;
//     }
//     console.log("%c You are passing an ethers v5 signer, attempting conversion to v6. THIS IS AN EXPERIMENTAL FEATURE", "color: yellow");
//     console.log("%c To avoid any issues, please migrate to ethers v6", "color: yellow");

//     // New approach: creating a new ethers v6 wallet
//     // if EOA wallet, just get the private key and provider and instantiate a new ethers v6 wallet
//     if (signer.privateKey) {
//         const provider = signer.provider;
//         const privateKey = signer.privateKey;
//         const wallet = new ethers.Wallet(privateKey, provider);
//         return wallet;
//     }
//     // if it is wallet whose key we cannot access (e.g. BrowserWallet), we connect ourselves to the provider
//     else { // this will not work with walletconnect or non-meta mask wallets
//         const provider = new ethers.BrowserProvider(window.ethereum, "any");
//         const signer = await provider.getSigner();
//         return signer;
//     }

//     // // Old approach: wrapping the signer and provider. Too many issues with this approach
//     // const providerV6 = {
//     //   ...signer.provider,
//     //   call: (tx) => signer.provider.call(tx),
//     //   destroy: () => signer.provider.destroy(),
//     //   estimateGas: (tx) => signer.provider.estimateGas(tx),
//     //   getBalance: (address, blockTag) => signer.provider.getBalance(address, blockTag),
//     //   getBlock: (blockHashOrBlockTag, prefetchTxs) => signer.provider.getBlock(blockHashOrBlockTag, prefetchTxs),
//     //   getBlockNumber: () => signer.provider.getBlockNumber(),
//     //   getCode: (address, blockTag) => signer.provider.getCode(address, blockTag),
//     //   getFeeData: () => signer.provider.getFeeData(),
//     //   getLogs: (filter) => signer.provider.getLogs(filter),
//     //   getNetwork: () => signer.provider.getNetwork(),
//     //   getStorage: (address, position, blockTag) => signer.provider.getStorage(address, position, blockTag),
//     //   getTransaction: (hash) => signer.provider.getTransaction(hash),
//     //   getTransactionCount: (address, blockTag) => signer.provider.getTransactionCount(address, blockTag),
//     //   getTransactionReceipt: (hash) => signer.provider.getTransactionReceipt(hash),
//     //   getTransactionResult: (hash) => signer.provider.getTransactionResult(hash),
//     //   lookupAddress: (address) => signer.provider.lookupAddress(address),
//     //   resolveName: (ensName) => signer.provider.resolveName(ensName),
//     //   waitForBlock: (blockTag) => signer.provider.waitForBlock(blockTag),
//     //   waitForTransaction: (hash, confirms, timeout) => signer.provider.waitForTransaction(hash, confirms, timeout),
//     //   on: (eventName, listener) => signer.provider.on(eventName, listener),

//     //   // v6 methods
//     //   broadcastTransaction: (signedTx) => signer.provider.sendTransaction(signedTx),
//     // };

//     // const signerV6 = {
//     //   ...signer,
//     //   provider: providerV6,
//     //   call: (tx) => signer.call(tx),
//     //   connect: (provider) => signer.connect(provider),
//     //   estimateGas: (tx) => signer.estimateGas(tx),
//     //   getAddress: () => signer.getAddress(),
//     //   getNonce: (blockTag) => signer.getTransactionCount(blockTag),
//     //   populateCall: (tx) => signer.populateTransaction(tx),
//     //   populateTransaction: (tx) => signer.populateTransaction(tx),
//     //   resolveName: (name) => signer.resolveName(name),
//     //   sendTransaction: (tx) => signer.sendTransaction(tx),
//     //   signMessage: (message) => signer.signMessage(message),
//     //   signTransaction: (tx) => signer.signTransaction(tx),
//     //   signTypedData: (domain, types, value) => signer._signTypedData(domain, types, value), // underscore in the original method, assuming it's a typo in the doc
//     // };

//     // window.signerV6 = signerV6;
//     // return signerV6;
// }

// export async function createLinks({
//     signer, // ethers signer object
//     chainId, // chain id of the network (only EVM for now)
//     tokenAmount, // tokenAmount to put in each link
//     numberOfLinks = null, // number of links to create
//     tokenAmounts = [], // array of token amounts, if different amounts are needed for links
//     tokenAddress = "0x0000000000000000000000000000000000000000",
//     tokenType = 0, // 0: ETH, 1: ERC20, 2: ERC721, 3: ERC1155
//     tokenId = 0, // only used for ERC721 and ERC1155
//     tokenDecimals = null, // only used for ERC20 and ERC1155
//     passwords = [], // passwords that each link should have
//     baseUrl = "https://peanut.to/claim",
//     trackId = "sdk", // optional tracker id to track the link source
//     maxFeePerGas = ethers.parseUnits("1000", "gwei"), // maximum fee per gas
//     maxPriorityFeePerGas = ethers.parseUnits("5", "gwei"), // maximum priority fee per gas
//     gasLimit = 1000000, // gas limit
//     eip1559 = true, // whether to use eip1559 or not
//     verbose = false,
//     contractVersion = "v4",
// }) {
//     // if tokenAmounts is provided, throw a not implemented error
//     if (tokenAmounts.length > 0) {
//         throw new Error("variable tokenAmounts support is not implemented yet");
//     }

//     assert(signer, "signer arg is required");
//     assert(chainId, "chainId arg is required");
//     assert(tokenAmount, "amount arg is required");
//     assert(
//         tokenAmounts.length > 0 || numberOfLinks > 0,
//         "either numberOfLinks or tokenAmounts must be provided",
//     );
//     numberOfLinks = numberOfLinks || tokenAmounts.length;
//     assert(
//         tokenAmounts.length == 0 || tokenAmounts.length == numberOfLinks,
//         "length of tokenAmounts must be equal to numberOfLinks",
//     );
//     assert(
//         tokenType == 0 || tokenType == 1,
//         "ERC721 and ERC1155 are not supported yet",
//     );
//     assert(
//         tokenType == 0 || tokenAddress != "0x0000000000000000000000000000000000000000",
//         "tokenAddress must be provided for non-ETH tokens",
//     );
//     // tokendecimals must be provided for erc20 and erc1155 tokens
//     assert(
//         !(tokenType == 1 || tokenType == 3) || tokenDecimals != null,
//         "tokenDecimals must be provided for ERC20 and ERC1155 tokens",
//     );
//     if (tokenDecimals == null) {
//         tokenDecimals = 18;
//     }

//     if (verbose) {
//         console.log("Asserts passed");
//     }

//     console.log('checking allowance...')
//     if (tokenType == 1) {
//         // if token is erc20, check allowance
//         const allowance = await approveSpendERC20(
//             signer,
//             chainId,
//             tokenAddress,
//             tokenAmount * numberOfLinks,
//             tokenDecimals,
//             contractVersion,
//         );
//         if (allowance < tokenAmount) {
//             throw new Error("Allowance not enough");
//         }
//     }
//     if (verbose) {
//         console.log("Generating links...");
//     }
//     // return { links: [], txReceipt: {} };

//     signer = await convertSignerToV6(signer);

//     var { keys, passwords } = generateKeysAndPasswords(passwords, numberOfLinks);
//     const depositIdxs = await makeDeposits(signer, chainId, contractVersion, numberOfLinks, tokenType, tokenAmount, tokenAddress, tokenDecimals, keys);
//     const links = generateLinks(chainId, contractVersion, depositIdxs, passwords, baseUrl, trackId);

//     return { links, txReceipt: depositIdxs }; // Assuming depositIdxs is a list of receipts.

//     // let txOptions = {};
//     // // For base tokens, we need to send the amount as value
//     // if (tokenType == 0) {
//     //   const TOTAL_PAYABLE_ETHER_AMOUNT = ethers.parseUnits( // could add fee here
//     //     (tokenAmount * numberOfLinks).toString(),
//     //     "ether",
//     //   );
//     //   // tokenAmount = ethers.parseUnits(tokenAmount.toString(), "ether");
//     //   txOptions = { value: TOTAL_PAYABLE_ETHER_AMOUNT };
//     // }
//     // // for erc20 and erc1155, we need to convert tokenAmount to appropriate decimals
//     // else if (tokenType == 1) {
//     //   tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals);
//     // }

//     // // if no passwords are provided, generate random ones
//     // if (passwords.length == 0) {
//     //   // password = getRandomString(16);
//     //   passwords = Array(numberOfLinks).fill(getRandomString(16));
//     // }

//     // const keys = generateKeysFromString(password); // deterministically generate keys from password
//     // const contract = await getContract(chainId, signer);

//     // const feeData = await signer.provider.getFeeData();
//     // const gasPrice = BigInt(feeData.gasPrice.toString());

//     // let multiplier = 1.5;
//     // multiplier = Math.round(multiplier * 10);
//     // const proposedGasPrice = (gasPrice * BigInt(multiplier)) / BigInt(10);

//     // if (eip1559) {
//     //   // if (chainId == 137) {
//     //   //   // warn that polygon doesn't support eip1559 yet
//     //   //   console.log("WARNING: Polygon doesn't support EIP1559 yet. Using legacy tx");
//     //   // }
//     //   txOptions = {
//     //     ...txOptions,
//     //     maxFeePerGas: maxFeePerGas,
//     //     maxPriorityFeePerGas: maxPriorityFeePerGas,
//     //     gasLimit: gasLimit,
//     //   };
//     // } else {
//     //   txOptions = {
//     //     ...txOptions,
//     //     gasPrice: proposedGasPrice,
//     //     gasLimit: gasLimit,
//     //   };
//     // }

//     // var tx = await contract.makeDeposit(
//     //   tokenAddress,
//     //   tokenType,
//     //   BigInt(tokenAmount),
//     //   tokenId,
//     //   keys.address,
//     //   txOptions,
//     // );

//     // if (verbose) {
//     //   console.log("submitted tx: ", tx.hash);
//     // }

//     // // now we need the deposit index from the tx receipt
//     // var txReceipt = await tx.wait();
//     // var depositIdx = getDepositIdx(txReceipt, chainId);

//     // // now we can create the link
//     // const link = getLinkFromParams(
//     //   chainId,
//     //   CONTRACT_VERSION,
//     //   depositIdx,
//     //   password,
//     //   baseUrl,
//     //   trackId,
//     // );
//     // if (verbose) {
//     //   console.log("created link: ", link);
//     // }
//     // // return the link and the tx receipt
//     // return { link, txReceipt };
// }

// async function makeDeposits(signer, chainId, contractVersion, numberOfLinks, tokenType, tokenAmount, tokenAddress, tokenDecimals, keys) {
//     const contract = await getContract(chainId, signer, contractVersion);
//     let tx;

//     // convert tokenAmount depending on tokenDecimals
//     tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals);
//     const amounts = Array(numberOfLinks).fill(tokenAmount);

//     const pubKeys20 = keys.map(key => key.address);

//     // Set maxFeePerGas and maxPriorityFeePerGas (in Gwei)
//     const maxFeePerGas = ethers.parseUnits('900', 'gwei'); // 100 Gwei
//     const maxPriorityFeePerGas = ethers.parseUnits('50', 'gwei'); // 2 Gwei

//     // Transaction options (eip1559)
//     // let txOptions = {
//     //   maxFeePerGas,
//     //   maxPriorityFeePerGas
//     // };

//     let txOptions = await setTxOptions({}, true, chainId, signer);

//     if (tokenType == 0) { // ETH
//         txOptions = {
//             ...txOptions,
//             value: amounts.reduce((a, b) => BigInt(a) + BigInt(b), BigInt(0))  // set total Ether value
//         };

//         tx = await contract.batchMakeDepositEther(amounts, pubKeys20, txOptions);

//     } else if (tokenType == 1) { // ERC20
//         // TODO: The user must have approved the contract to spend tokens on their behalf before this
//         tx = await contract.batchMakeDepositERC20(tokenAddress, amounts, pubKeys20, txOptions);
//     }
//     console.log("submitted tx: ", tx.hash, " for ", numberOfLinks, " deposits. Now waiting for receipt...");
//     // print the submitted tx fee and gas price
//     // console.log(tx)
//     const txReceipt = await tx.wait();
//     return getDepositIdxs(txReceipt, chainId, contract.target);
// }

// export async function createLinks({
//     signer, // ethers signer object
//     chainId, // chain id of the network (only EVM for now)
//     tokenAmount, // tokenAmount to put in each link
//     numberOfLinks = null, // number of links to create
//     tokenAmounts = [], // array of token amounts, if different amounts are needed for links
//     tokenAddress = "0x0000000000000000000000000000000000000000",
//     tokenType = 0, // 0: ETH, 1: ERC20, 2: ERC721, 3: ERC1155
//     tokenId = 0, // only used for ERC721 and ERC1155
//     tokenDecimals = null, // only used for ERC20 and ERC1155
//     passwords = [], // passwords that each link should have
//     baseUrl = "https://peanut.to/claim",
//     trackId = "sdk", // optional tracker id to track the link source
//     maxFeePerGas = ethers.parseUnits("1000", "gwei"), // maximum fee per gas
//     maxPriorityFeePerGas = ethers.parseUnits("5", "gwei"), // maximum priority fee per gas
//     gasLimit = 1000000, // gas limit
//     eip1559 = true, // whether to use eip1559 or not
//     verbose = false,
//     contractVersion = "v4",
// }) {
//     // TODO: has to be fixed with V4
//     // if tokenAmounts is provided, throw a not implemented error
//     if (tokenAmounts.length > 0) {
//         throw new Error("variable tokenAmounts support is not implemented yet");
//     }

//     assert(signer, "signer arg is required");
//     assert(chainId, "chainId arg is required");
//     assert(tokenAmount, "amount arg is required");
//     assert(
//         tokenAmounts.length > 0 || numberOfLinks > 0,
//         "either numberOfLinks or tokenAmounts must be provided",
//     );
//     numberOfLinks = numberOfLinks || tokenAmounts.length;
//     assert(
//         tokenAmounts.length == 0 || tokenAmounts.length == numberOfLinks,
//         "length of tokenAmounts must be equal to numberOfLinks",
//     );
//     assert(
//         tokenType == 0 || tokenType == 1,
//         "ERC721 and ERC1155 are not supported yet",
//     );
//     assert(
//         tokenType == 0 || tokenAddress != "0x0000000000000000000000000000000000000000",
//         "tokenAddress must be provided for non-ETH tokens",
//     );
//     // tokendecimals must be provided for erc20 and erc1155 tokens
//     assert(
//         !(tokenType == 1 || tokenType == 3) || tokenDecimals != null,
//         "tokenDecimals must be provided for ERC20 and ERC1155 tokens",
//     );
//     if (tokenDecimals == null) {
//         tokenDecimals = 18;
//     }

//     if (verbose) {
//         console.log("Asserts passed");
//     }

//     console.log('checking allowance...')
//     if (tokenType == 1) {
//         // if token is erc20, check allowance
//         const allowance = await approveSpendERC20(
//             signer,
//             chainId,
//             tokenAddress,
//             tokenAmount * numberOfLinks,
//             tokenDecimals,
//             contractVersion,
//         );
//         if (allowance < tokenAmount) {
//             throw new Error("Allowance not enough");
//         }
//     }
//     if (verbose) {
//         console.log("Generating links...");
//     }
//     // return { links: [], txReceipt: {} };

//     signer = await convertSignerToV6(signer);

//     var { keys, passwords } = generateKeysAndPasswords(passwords, numberOfLinks);
//     const depositIdxs = await makeDeposits(signer, chainId, contractVersion, numberOfLinks, tokenType, tokenAmount, tokenAddress, tokenDecimals, keys);
//     const links = generateLinks(chainId, contractVersion, depositIdxs, passwords, baseUrl, trackId);

//     return { links, txReceipt: depositIdxs }; // Assuming depositIdxs is a list of receipts.
// }
