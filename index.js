////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. This library is compatible with ethers v6, and
//  supports both node and browser environments. If you're using ethers v5,
//  use the peanut-sdk-ethers5 package instead.
//
/////////////////////////////////////////////////////////

import { ethers } from 'ethersv6';
import 'isomorphic-fetch'; // isomorphic-fetch is a library that implements fetch in node.js and the browser

// import assert from "assert";
function assert(condition, message) {
	if (!condition) {
		throw new Error(message || 'Assertion failed');
	}
}

// load data.js file from same directory (using import)
import {
	PEANUT_ABI_V3,
	PEANUT_ABI_V4,
	PEANUT_CONTRACTS,
	ERC20_ABI,
	ERC721_ABI,
	ERC1155_ABI,
	CHAIN_MAP,
	CHAIN_DETAILS,
	PROVIDERS,
	VERSION,
	DEFAULT_CONTRACT_VERSION,
	TOKEN_TYPES,
} from './data.js';

export function greeting() {
	console.log(
		'🥜 Hello & thanks for using the Peanut SDK! If you run into any issues, dm @hugomont on telegram or hop on the Peanut Protocol discord',
	);
}

export function generateKeysFromString(string) {
	/* generates a deterministic key pair from an arbitrary length string */
	var privateKey = ethers.keccak256(ethers.toUtf8Bytes(string));
	var wallet = new ethers.Wallet(privateKey);
	// var publicKey = wallet.publicKey; // deprecated in ethers v6

	return {
		address: wallet.address,
		privateKey: privateKey,
		// publicKey: publicKey,
	};
}

export function hash_string(str) {
	/*
	  1. convert to bytes, 2. right pad to 32 bytes, 3. hash
	  */
	let hash = ethers.toUtf8Bytes(str);
	hash = ethers.hexlify(hash);
	// hash = ethers.hexZeroPad(hash, 32);
	hash = ethers.zeroPadValue(hash, 32); // hexZeroPad is deprecated
	hash = ethers.keccak256(hash);
	return hash;
}

export async function signMessageWithPrivatekey(message, privateKey) {
	/* signs a message with a private key and returns the signature
		  THIS SHOULD BE AN UNHASHED, UNPREFIXED MESSAGE
	  */
	var signer = new ethers.Wallet(privateKey);
	return signer.signMessage(message); // this calls ethers.hashMessage and prefixes the hash
}

export function verifySignature(message, signature, address) {
	/* verifies a signature with a public key and returns true if valid */
	const messageSigner = ethers.verifyMessage(message, signature);
	return messageSigner == address;
}

export function solidityHashBytesEIP191(bytes) {
	/* adds the EIP191 prefix to a message and hashes it same as solidity*/
	// assert(bytes instanceof Uint8Array);
	return ethers.hashMessage(bytes);
}

export function solidityHashAddress(address) {
	/* hashes an address to a 32 byte hex string */
	// return ethers.solidityKeccak256(["address"], [address]); // no longer exists in ethers v6
	return ethers.solidityPackedKeccak256(['address'], [address]);
}

export async function signAddress(string, privateKey) {
	// 1. hash plain address
	const stringHash = ethers.solidityPackedKeccak256(['address'], [string]);
	const stringHashbinary = ethers.getBytes(stringHash);

	// 2. add eth msg prefix, then hash, then sign
	var signer = new ethers.Wallet(privateKey);
	var signature = await signer.signMessage(stringHashbinary); // this calls ethers.hashMessage and prefixes the hash
	return signature;
}

function getRandomString(length) {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result_str = '';
	for (let i = 0; i < length; i++) {
		result_str += chars[Math.floor(Math.random() * chars.length)];
	}
	return result_str;
}

async function convertSignerToV6(signer) {
	// Check if it's already a v6 signer, just return it
	if (signer.provider.broadcastTransaction) {
		// console.log("signer is already v6");
		return signer;
	}
	console.log(
		'%cYOU ARE PASSING IN AN ETHERS v5 SIGNER. PLEASE UPGRADE TO ETHERS v6 OR USE THE LEGACY PEANUT SDK',
		'color: red',
	);
	console.log(
		'%c You are passing an ethers v5 signer, attempting conversion to v6. THIS IS AN EXPERIMENTAL FEATURE',
		'color: yellow',
	);
	console.log('%c To avoid any issues, please migrate to ethers v6', 'color: yellow');

	// New approach: creating a new ethers v6 wallet
	// if EOA wallet, just get the private key and provider and instantiate a new ethers v6 wallet
	if (signer.privateKey) {
		const provider = signer.provider;
		const privateKey = signer.privateKey;
		const wallet = new ethers.Wallet(privateKey, provider);
		return wallet;
	}
	return signer;

	// New approach: creating a new ethers v6 wallet
	// if EOA wallet, just get the private key and provider and instantiate a new ethers v6 wallet
	if (signer.privateKey) {
		const provider = signer.provider;
		const privateKey = signer.privateKey;
		const wallet = new ethers.Wallet(privateKey, provider);
		return wallet;
	}
	// if it is wallet whose key we cannot access (e.g. BrowserWallet), we connect ourselves to the provider
	else {
		// this will not work with walletconnect or non-meta mask wallets
		const provider = new ethers.BrowserProvider(window.ethereum, 'any');
		const signer = await provider.getSigner();
		return signer;
	}

	// // Old approach: wrapping the signer and provider. Too many issues with this approach
	// const providerV6 = {
	//   ...signer.provider,
	//   call: (tx) => signer.provider.call(tx),
	//   destroy: () => signer.provider.destroy(),
	//   estimateGas: (tx) => signer.provider.estimateGas(tx),
	//   getBalance: (address, blockTag) => signer.provider.getBalance(address, blockTag),
	//   getBlock: (blockHashOrBlockTag, prefetchTxs) => signer.provider.getBlock(blockHashOrBlockTag, prefetchTxs),
	//   getBlockNumber: () => signer.provider.getBlockNumber(),
	//   getCode: (address, blockTag) => signer.provider.getCode(address, blockTag),
	//   getFeeData: () => signer.provider.getFeeData(),
	//   getLogs: (filter) => signer.provider.getLogs(filter),
	//   getNetwork: () => signer.provider.getNetwork(),
	//   getStorage: (address, position, blockTag) => signer.provider.getStorage(address, position, blockTag),
	//   getTransaction: (hash) => signer.provider.getTransaction(hash),
	//   getTransactionCount: (address, blockTag) => signer.provider.getTransactionCount(address, blockTag),
	//   getTransactionReceipt: (hash) => signer.provider.getTransactionReceipt(hash),
	//   getTransactionResult: (hash) => signer.provider.getTransactionResult(hash),
	//   lookupAddress: (address) => signer.provider.lookupAddress(address),
	//   resolveName: (ensName) => signer.provider.resolveName(ensName),
	//   waitForBlock: (blockTag) => signer.provider.waitForBlock(blockTag),
	//   waitForTransaction: (hash, confirms, timeout) => signer.provider.waitForTransaction(hash, confirms, timeout),
	//   on: (eventName, listener) => signer.provider.on(eventName, listener),

	//   // v6 methods
	//   broadcastTransaction: (signedTx) => signer.provider.sendTransaction(signedTx),
	// };

	// const signerV6 = {
	//   ...signer,
	//   provider: providerV6,
	//   call: (tx) => signer.call(tx),
	//   connect: (provider) => signer.connect(provider),
	//   estimateGas: (tx) => signer.estimateGas(tx),
	//   getAddress: () => signer.getAddress(),
	//   getNonce: (blockTag) => signer.getTransactionCount(blockTag),
	//   populateCall: (tx) => signer.populateTransaction(tx),
	//   populateTransaction: (tx) => signer.populateTransaction(tx),
	//   resolveName: (name) => signer.resolveName(name),
	//   sendTransaction: (tx) => signer.sendTransaction(tx),
	//   signMessage: (message) => signer.signMessage(message),
	//   signTransaction: (tx) => signer.signTransaction(tx),
	//   signTypedData: (domain, types, value) => signer._signTypedData(domain, types, value), // underscore in the original method, assuming it's a typo in the doc
	// };

	// window.signerV6 = signerV6;
	// return signerV6;
}

export async function getContract(chainId, signer, version = CONTRACT_VERSION) {
	/* returns a contract object for the given chainId and signer */
	signer = await convertSignerToV6(signer);

	if (typeof chainId == 'string' || chainId instanceof String) {
		// just move to TS ffs
		// do smae with bigint
		// if chainId is a string, convert to int
		chainId = parseInt(chainId);
	}
	chainId = parseInt(chainId);

	// TODO: fix this for new versions
	// if version is v3, load PEANUT_ABI_V3. if it is v4, load PEANUT_ABI_V4
	var PEANUT_ABI;
	if (version == 'v3') {
		PEANUT_ABI = PEANUT_ABI_V3;
	} else if (version == 'v4') {
		PEANUT_ABI = PEANUT_ABI_V4;
	} else {
		throw new Error('Invalid version');
	}

	const contractAddress = PEANUT_CONTRACTS[chainId][version];
	const contract = new ethers.Contract(contractAddress, PEANUT_ABI, signer);
	// connected to contracv
	console.log('Connected to contract ', version, ' on chain ', chainId, ' at ', contractAddress);
	return contract;
	// TODO: return class
}

export function getParamsFromLink(link) {
	/* returns the parameters from a link */
	const url = new URL(link);
	const params = new URLSearchParams(url.search);
	var chainId = params.get('c'); // can be chain name or chain id
	// if can be casted to int, then it's a chain id
	if (parseInt(chainId)) {
		chainId = parseInt(chainId);
	} else {
		// otherwise it's a chain name
		chainId = CHAIN_MAP[String(chainId)];
	}

	const contractVersion = params.get('v');
	var depositIdx = params.get('i');
	depositIdx = parseInt(depositIdx);
	const password = params.get('p');
	let trackId = ''; // optional
	if (params.get('t')) {
		trackId = params.get('t');
	}
	return { chainId, contractVersion, depositIdx, password, trackId };
}

export function getParamsFromPageURL() {
	/* returns the parameters from the current page url */
	const params = new URLSearchParams(window.location.search);
	var chainId = params.get('c'); // can be chain name or chain id
	chainId = CHAIN_MAP[String(chainId)];
	const contractVersion = params.get('v');
	var depositIdx = params.get('i');
	depositIdx = parseInt(depositIdx);
	const password = params.get('p');

	return { chainId, contractVersion, depositIdx, password };
}

export function getLinkFromParams(
	chainId,
	contractVersion,
	depositIdx,
	password,
	baseUrl = 'https://peanut.to/claim',
	trackId = '',
) {
	/* returns a link from the given parameters */

	const link = baseUrl + '?c=' + chainId + '&v=' + contractVersion + '&i=' + depositIdx + '&p=' + password;

	if (trackId != '') {
		return link + '&t=' + trackId;
	}
	return link;
}

export function getDepositIdx(txReceipt, chainId) {
	/* returns the deposit index from a tx receipt */
	const logs = txReceipt.logs;
	// const chainId = txReceipt.chainId;
	var depositIdx;
	var logIndex;
	if (chainId == 137) {
		logIndex = logs.length - 2;
	} else {
		logIndex = logs.length - 1; // last log is the deposit event
	}
	// only works if EventLog. If Log, then need to look at data, and first uint256 is depositIdx.
	try {
		depositIdx = logs[logIndex].args[0];
	} catch (error) {
		// get uint256 from data (first 32 bytes)
		const data = logs[logIndex].data;
		const depositIdxHex = data.slice(0, 66);
		depositIdx = parseInt(BigInt(depositIdxHex)); // should this be int or bigint? decide wen TS.
	}
	return depositIdx;
}

export function getDepositIdxs(txReceipt, chainId, contractAddress) {
	/* returns an array of deposit indices from a batch transaction receipt */
	const logs = txReceipt.logs;
	var depositIdxs = [];
	// loop through all the logs and extract the deposit index from each
	for (var i = 0; i < logs.length; i++) {
		// check if the log was emitted by our contract
		if (logs[i].address.toLowerCase() === contractAddress.toLowerCase()) {
			if (chainId == 137) {
				depositIdxs.push(logs[i].args[0]);
			} else {
				depositIdxs.push(logs[i].args[0]);
			}
		}
	}
	return depositIdxs;
}

async function getAllowance(signer, chainId, tokenContract, spender) {
	let allowance;
	try {
		allowance = await tokenContract.allowance(signer.address, spender);
	} catch (error) {
		console.error('Error fetching allowance:', error);
	}
	return allowance;
}

export async function approveSpendERC20(
	signer,
	chainId,
	tokenAddress,
	amount,
	tokenDecimals,
	contractVersion = DEFAULT_CONTRACT_VERSION,
	verbose = true,
) {
	/*  Approves the contract to spend the specified amount of tokens   */
	signer = await convertSignerToV6(signer);
	const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
	if (amount == -1) {
		// if amount is -1, approve infinite amount
		amount = ethers.MaxUint256;
	}
	const spender = PEANUT_CONTRACTS[chainId][contractVersion];
	let allowance = await getAllowance(signer, chainId, tokenContract, spender);
	// convert amount to BigInt and compare to allowance
	amount = ethers.parseUnits(amount.toString(), tokenDecimals);
	if (allowance >= amount) {
		console.log('Allowance already enough, no need to approve more');
		return { allowance, txReceipt: null };
	} else {
		console.log('Allowance only', allowance.toString(), ', need' + amount.toString() + ', approving...');
		const txOptions = await setTxOptions({ verbose }, signer.provider, true); // Include verbose when calling setTxOptions
		const tx = await tokenContract.approve(spender, amount, txOptions);
		const txReceipt = await tx.wait();
		allowance = await getAllowance(signer, chainId, tokenContract, spender);
		return { allowance, txReceipt };
	}
}

async function setTxOptions({
	txOptions,
	provider,
	eip1559,
	maxFeePerGas = null,
	maxFeePerGasMultiplier = 1.1,
	gasLimit = null,
	gasPrice = null,
	gasPriceMultiplier = 1.2,
	maxPriorityFeePerGas = null,
	maxPriorityFeePerGasMultiplier = 1.1,
	verbose = false,
} = {}) {
	let feeData;
	try {
		console.log('IN SET TX OPTIONS');
		console.log(provider);
		console.log(provider.getFeeData);
		console.log(await provider.getFeeData());
		feeData = await provider.getFeeData();
		verbose && console.log('Fetched gas price from provider:', feeData);
	} catch (error) {
		console.error('Failed to fetch gas price from provider:', error);
		return txOptions;
	}

	if (gasLimit) {
		txOptions.gasLimit = gasLimit;
	}

	if (eip1559) {
		verbose && console.log('Setting eip1559 tx options...', txOptions);
		txOptions.maxFeePerGas =
			maxFeePerGas ||
			(BigInt(feeData.maxFeePerGas.toString()) * BigInt(Math.round(maxFeePerGasMultiplier * 10))) / BigInt(10);
		txOptions.maxPriorityFeePerGas =
			maxPriorityFeePerGas ||
			(BigInt(feeData.maxPriorityFeePerGas.toString()) *
				BigInt(Math.round(maxPriorityFeePerGasMultiplier * 10))) /
				BigInt(10);
	} else {
		let gasPrice;
		if (!txOptions.gasPrice) {
			if (feeData.gasPrice == null) {
				// operating in a EIP-1559 environment
				eip1559 = true;
				console.log("Couldn't fetch gas price from provider, trying an eip1559 transaction");
			} else {
				txOptions.gasPrice = feeData.gasPrice.toString();
				gasPrice = BigInt(feeData.gasPrice.toString());
			}
		}
		const proposedGasPrice = (gasPrice * BigInt(Math.round(gasPriceMultiplier * 10))) / BigInt(10);
		txOptions.gasPrice = proposedGasPrice.toString();
	}

	verbose && console.log('FINAL txOptions:', txOptions);

	return txOptions;
}

async function estimateGasLimit(contract, functionName, params, txOptions) {
	try {
		const method = contract[functionName];
		const estimatedGas = BigInt(await method.estimateGas(...params, txOptions));
		return BigInt(Math.floor(Number(estimatedGas) * 1.1)); // safety margin
	} catch (error) {
		console.error('Error estimating gas:', error);
		return null;
	}
}

export async function createLink({
	signer,
	chainId,
	tokenAmount,
	tokenAddress = '0x0000000000000000000000000000000000000000',
	tokenType = 0,
	tokenId = 0,
	tokenDecimals = 18,
	password = '',
	baseUrl = 'https://peanut.to/claim',
	trackId = 'sdk',
	maxFeePerGas = null,
	maxPriorityFeePerGas = null,
	gasLimit = null,
	eip1559 = true,
	verbose = false,
	contractVersion = DEFAULT_CONTRACT_VERSION,
}) {
	assert(signer, 'signer arg is required');
	assert(chainId, 'chainId arg is required');
	assert(tokenAmount, 'amount arg is required');

	signer = await convertSignerToV6(signer);

	if (tokenAddress == null) {
		tokenAddress = '0x0000000000000000000000000000000000000000';
		if (tokenType != 0) {
			throw new Error('tokenAddress is null but tokenType is not 0');
		}
	}
	// convert tokenAmount to appropriate unit
	tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals);

	// if native token (tokentype == 0), add value to txOptions
	txOptions = {};
	// // set nonce
	// const nonce = await signer.getTransactionCount(); // doesnt work in v6
	// const nonce = await signer.getNonce();
	// txOptions.nonce = nonce;
	if (tokenType == 0) {
		txOptions = {
			...txOptions,
			value: tokenAmount,
		};
	} else if (tokenType == 1) {
		// check allowance
		// TODO: check for erc721 and erc1155
		verbose && console.log('checking allowance...');
		// if token is erc20, check allowance
		const allowance = await approveSpendERC20(
			signer,
			chainId,
			tokenAddress,
			tokenAmount,
			tokenDecimals,
			contractVersion,
		);
		verbose && console.log('allowance: ', allowance, ' tokenAmount: ', tokenAmount);
		if (allowance < tokenAmount) {
			throw new Error('Allowance not enough');
		}
	}

	if (password == null || password == '') {
		// if no password is provided, generate a random one
		password = getRandomString(16);
	}
	const keys = generateKeysFromString(password); // deterministically generate keys from password
	const contract = await getContract(chainId, signer, contractVersion); // get the contract instance

	verbose && console.log('Generating link...');

	// set transaction options
	let txOptions = await setTxOptions({
		txOptions,
		provider: signer.provider,
		eip1559,
		maxFeePerGas,
		maxPriorityFeePerGas,
		gasLimit,
		verbose, // Include verbose in the object passed to setTxOptions
	});

	verbose && console.log('post txOptions: ', txOptions);
	const estimatedGasLimit = await estimateGasLimit(
		contract,
		'makeDeposit',
		[tokenAddress, tokenType, tokenAmount, tokenId, keys.address],
		txOptions,
	);
	if (estimatedGasLimit) {
		txOptions.gasLimit = estimatedGasLimit.toString();
	}
	verbose && console.log('final txOptions: ', txOptions);
	// const depositParams = [tokenAddress, tokenType, tokenAmount, tokenId, keys.address, txOptions];
	const depositParams = [tokenAddress, tokenType, tokenAmount, tokenId, keys.address];
	verbose && console.log('depositParams: ', depositParams);
	// var tx = await contract.makeDeposit(...depositParams);
	var tx = await contract.makeDeposit(...depositParams, txOptions);

	verbose && console.log('submitted tx: ', tx.hash);

	// now we need the deposit index from the tx receipt
	var txReceipt = await tx.wait();
	var depositIdx = getDepositIdx(txReceipt, chainId);

	// now we can create the link
	const link = getLinkFromParams(chainId, contractVersion, depositIdx, password, baseUrl, trackId);
	verbose && console.log('created link: ', link);
	// return the link and the tx receipt
	return { link, txReceipt };
}

export async function createLinks({
	signer, // ethers signer object
	chainId, // chain id of the network (only EVM for now)
	tokenAmount, // tokenAmount to put in each link
	numberOfLinks = null, // number of links to create
	tokenAmounts = [], // array of token amounts, if different amounts are needed for links
	tokenAddress = '0x0000000000000000000000000000000000000000',
	tokenType = 0, // 0: ETH, 1: ERC20, 2: ERC721, 3: ERC1155
	tokenId = 0, // only used for ERC721 and ERC1155
	tokenDecimals = null, // only used for ERC20 and ERC1155
	passwords = [], // passwords that each link should have
	baseUrl = 'https://peanut.to/claim',
	trackId = 'sdk', // optional tracker id to track the link source
	maxFeePerGas = ethers.parseUnits('1000', 'gwei'), // maximum fee per gas
	maxPriorityFeePerGas = ethers.parseUnits('5', 'gwei'), // maximum priority fee per gas
	gasLimit = 1000000, // gas limit
	eip1559 = true, // whether to use eip1559 or not
	verbose = false,
	contractVersion = 'v4',
}) {
	// if tokenAmounts is provided, throw a not implemented error
	if (tokenAmounts.length > 0) {
		throw new Error('variable tokenAmounts support is not implemented yet');
	}

	assert(signer, 'signer arg is required');
	assert(chainId, 'chainId arg is required');
	assert(tokenAmount, 'amount arg is required');
	assert(tokenAmounts.length > 0 || numberOfLinks > 0, 'either numberOfLinks or tokenAmounts must be provided');
	numberOfLinks = numberOfLinks || tokenAmounts.length;
	assert(
		tokenAmounts.length == 0 || tokenAmounts.length == numberOfLinks,
		'length of tokenAmounts must be equal to numberOfLinks',
	);
	assert(tokenType == 0 || tokenType == 1, 'ERC721 and ERC1155 are not supported yet');
	assert(
		tokenType == 0 || tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-ETH tokens',
	);
	// tokendecimals must be provided for erc20 and erc1155 tokens
	assert(
		!(tokenType == 1 || tokenType == 3) || tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens',
	);
	if (tokenDecimals == null) {
		tokenDecimals = 18;
	}

	if (verbose) {
		console.log('Asserts passed');
	}

	console.log('checking allowance...');
	if (tokenType == 1) {
		// if token is erc20, check allowance
		const allowance = await approveSpendERC20(
			signer,
			chainId,
			tokenAddress,
			tokenAmount * numberOfLinks,
			tokenDecimals,
			contractVersion,
		);
		if (allowance < tokenAmount) {
			throw new Error('Allowance not enough');
		}
	}
	if (verbose) {
		console.log('Generating links...');
	}
	// return { links: [], txReceipt: {} };

	signer = await convertSignerToV6(signer);

	var { keys, passwords } = generateKeysAndPasswords(passwords, numberOfLinks);
	const depositIdxs = await makeDeposits(
		signer,
		chainId,
		contractVersion,
		numberOfLinks,
		tokenType,
		tokenAmount,
		tokenAddress,
		tokenDecimals,
		keys,
	);
	const links = generateLinks(chainId, contractVersion, depositIdxs, passwords, baseUrl, trackId);

	return { links, txReceipt: depositIdxs }; // Assuming depositIdxs is a list of receipts.
}

async function makeDeposits(
	signer,
	chainId,
	contractVersion,
	numberOfLinks,
	tokenType,
	tokenAmount,
	tokenAddress,
	tokenDecimals,
	keys,
) {
	const contract = await getContract(chainId, signer, contractVersion);
	let tx;

	// convert tokenAmount depending on tokenDecimals
	tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals);
	const amounts = Array(numberOfLinks).fill(tokenAmount);

	const pubKeys20 = keys.map(key => key.address);

	// Set maxFeePerGas and maxPriorityFeePerGas (in Gwei)
	const maxFeePerGas = ethers.parseUnits('900', 'gwei'); // 100 Gwei
	const maxPriorityFeePerGas = ethers.parseUnits('50', 'gwei'); // 2 Gwei

	// Transaction options (eip1559)
	// let txOptions = {
	//   maxFeePerGas,
	//   maxPriorityFeePerGas
	// };

	let txOptions = await setTxOptions({}, true, chainId, signer);

	if (tokenType == 0) {
		// ETH
		txOptions = {
			...txOptions,
			value: amounts.reduce((a, b) => BigInt(a) + BigInt(b), BigInt(0)), // set total Ether value
		};

		tx = await contract.batchMakeDepositEther(amounts, pubKeys20, txOptions);
	} else if (tokenType == 1) {
		// ERC20
		// TODO: The user must have approved the contract to spend tokens on their behalf before this
		tx = await contract.batchMakeDepositERC20(tokenAddress, amounts, pubKeys20, txOptions);
	}
	console.log('submitted tx: ', tx.hash, ' for ', numberOfLinks, ' deposits. Now waiting for receipt...');
	// print the submitted tx fee and gas price
	// console.log(tx)
	const txReceipt = await tx.wait();
	return getDepositIdxs(txReceipt, chainId, contract.target);
}

function generateKeysAndPasswords(passwords, numberOfLinks) {
	let keys = [];
	if (passwords.length > 0) {
		keys = passwords.map(password => generateKeysFromString(password));
	} else {
		for (let i = 0; i < numberOfLinks; i++) {
			const password = getRandomString(16);
			keys.push(generateKeysFromString(password));
			passwords.push(password);
		}
	}
	return { keys, passwords };
}

function generateLinks(chainId, contractVersion, depositIdxs, passwords, baseUrl, trackId) {
	return depositIdxs.map((depositIdx, i) =>
		getLinkFromParams(chainId, contractVersion, depositIdx, passwords[i], baseUrl, trackId),
	);
}

export async function getLinkStatus({ signer, link }) {
	/* checks if a link has been claimed */
	assert(signer, 'signer arg is required');
	assert(link, 'link arg is required');

	signer = await convertSignerToV6(signer);

	const params = getParamsFromLink(link);
	const chainId = params.chainId;
	const contractVersion = params.contractVersion;
	const depositIdx = params.depositIdx;
	const contract = await getContract(chainId, signer, contractVersion);
	const deposit = await contract.deposits(depositIdx);

	// if the deposit is claimed, the pubKey20 will be 0x000....
	if (deposit.pubKey20 == '0x0000000000000000000000000000000000000000') {
		return { claimed: true, deposit };
	}
	return { claimed: false, deposit };
}

export async function claimLink({ signer, link, recipient = null, verbose = false }) {
	/* claims the contents of a link */
	assert(signer, 'signer arg is required');
	assert(link, 'link arg is required');

	signer = await convertSignerToV6(signer);

	const params = getParamsFromLink(link);
	const chainId = params.chainId;
	const contractVersion = params.contractVersion;
	const depositIdx = params.depositIdx;
	const password = params.password;
	if (recipient == null) {
		recipient = signer.address;
	}
	const keys = generateKeysFromString(password); // deterministically generate keys from password
	const contract = await getContract(chainId, signer, contractVersion);

	// cryptography
	var addressHash = solidityHashAddress(recipient);
	var addressHashBinary = ethers.getBytes(addressHash);
	var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary);
	var signature = await signAddress(recipient, keys.privateKey); // sign with link keys

	if (verbose) {
		// print the params
		console.log('params: ', params);
		console.log('addressHash: ', addressHash);
		console.log('addressHashEIP191: ', addressHashEIP191);
		console.log('signature: ', signature);
	}

	// TODO: use createClaimPayload instead

	// withdraw the deposit
	// address hash is hash(prefix + hash(address))
	const tx = await contract.withdrawDeposit(depositIdx, recipient, addressHashEIP191, signature);
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...');
	const txReceipt = await tx.wait();

	return txReceipt;
}

async function createClaimPayload(link, recipientAddress) {
	/* internal utility function to create the payload for claiming a link */
	const params = getParamsFromLink(link);
	const chainId = params.chainId;
	const password = params.password;
	const keys = generateKeysFromString(password); // deterministically generate keys from password

	// cryptography
	var addressHash = solidityHashAddress(recipientAddress);
	var addressHashBinary = ethers.getBytes(addressHash);
	var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary);
	var signature = await signAddress(recipientAddress, keys.privateKey); // sign with link keys

	return {
		addressHash: addressHashEIP191,
		signature: signature,
		idx: params.depositIdx,
		chainId: params.chainId,
		contractVersion: params.contractVersion,
	};
}

export async function claimLinkGasless(link, recipientAddress, apiKey, url = 'https://api.peanut.to/claim') {
	console.log('claiming link through Peanut API...');
	const payload = await createClaimPayload(link, recipientAddress);
	//  url = "https://api.peanut.to/claim";
	if (url == 'local') {
		console.log('using local api');
		url = 'http://127.0.0.1:5001/claim';
	}

	const headers = {
		'Content-Type': 'application/json',
	};

	const body = {
		address: recipientAddress,
		address_hash: payload.addressHash,
		signature: payload.signature,
		idx: payload.idx,
		chain: payload.chainId,
		version: payload.contractVersion,
		api_key: apiKey,
	};

	// if axios error, return the error message

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		} else {
			const data = await response.json();
			return data;
		}
	} catch (e) {
		console.log('error claiming link: ', e);
		return e.message;
	}
}

const peanut = {
	greeting,
	generateKeysFromString,
	signMessageWithPrivatekey,
	verifySignature,
	solidityHashBytesEIP191,
	solidityHashAddress,
	signAddress,
	getRandomString,
	getContract,
	getDepositIdx,
	getLinkStatus,
	getParamsFromLink,
	getParamsFromPageURL,
	getLinkFromParams,
	createLink,
	createLinks,
	claimLink,
	approveSpendERC20,
	claimLinkGasless,
	VERSION,
	version: VERSION,
	CHAIN_DETAILS,
	TOKEN_TYPES,
	DEFAULT_CONTRACT_VERSION,
	// approveSpendERC721,
	// approveSpendERC1155,
};

export default peanut;
export { peanut };
