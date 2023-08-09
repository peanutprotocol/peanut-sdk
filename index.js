////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. This library is compatible with ethers v6, and
//  supports both node and browser environments. If you're using ethers v5,
//  use the peanut-sdk-ethers5 package instead.
//
/////////////////////////////////////////////////////////

// import { ethers } from 'ethersv6'; // v6
import { ethers } from 'ethersv5'; // v5
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
	TOKEN_DETAILS,
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
	// var privateKey = ethers.keccak256(ethers.toUtf8Bytes(string)); // v6
	var privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(string)); // v5
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
	// let hash = ethers.toUtf8Bytes(str); // v6
	let hash = ethers.utils.toUtf8Bytes(str); // v5
	// hash = ethers.hexlify(hash); // v6
	hash = ethers.utils.hexlify(hash); // v5
	// hash = ethers.zeroPadValue(hash, 32); // v6
	hash = ethers.utils.hexZeroPad(hash, 32); // v5
	// hash = ethers.keccak256(hash); // v6
	hash = ethers.utils.keccak256(hash); // v5
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
	// const messageSigner = ethers.verifyMessage(message, signature); // v6
	const messageSigner = ethers.utils.verifyMessage(message, signature); // v5
	return messageSigner == address;
}

export function solidityHashBytesEIP191(bytes) {
	/* adds the EIP191 prefix to a message and hashes it same as solidity*/
	// assert(bytes instanceof Uint8Array);
	// return ethers.hashMessage(bytes); // v6
	return ethers.utils.hashMessage(bytes); // v5
}

export function solidityHashAddress(address) {
	/* hashes an address to a 32 byte hex string */
	// return ethers.solidityPackedKeccak256(['address'], [address]); // v6
	return ethers.utils.solidityKeccak256(["address"], [address]); // v5
}

export async function signAddress(string, privateKey) {
	// 1. hash plain address
	// const stringHash = ethers.solidityPackedKeccak256(['address'], [string]); // v6
	const stringHash = ethers.utils.solidityKeccak256(["address"], [string]); // v5
	// const stringHashbinary = ethers.getBytes(stringHash); // v6
	const stringHashbinary = ethers.utils.arrayify(stringHash); // v5

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

async function convertSignerToV6(signer, verbose = true) {
	return signer;
	// // Check if it's already a v6 signer, just return it
	// if (signer.provider.broadcastTransaction) {
	// 	// console.log("signer is already v6");
	// 	return signer;
	// }
	// console.log(
	// 	'%cYOU ARE PASSING IN AN ETHERS v5 SIGNER. PLEASE UPGRADE TO ETHERS v6 OR USE THE LEGACY PEANUT SDK',
	// 	'color: red',
	// );
	// console.log(
	// 	'%c You are passing an ethers v5 signer, attempting conversion to v6. THIS IS AN EXPERIMENTAL FEATURE',
	// 	'color: yellow',
	// );
	// console.log('%c To avoid any issues, please migrate to ethers v6', 'color: yellow');

	// // New approach: creating a new ethers v6 wallet
	// // if EOA wallet, just get the private key and provider and instantiate a new ethers v6 wallet
	// if (signer.privateKey) {
	// 	const provider = signer.provider;
	// 	const privateKey = signer.privateKey;
	// 	const wallet = new ethers.Wallet(privateKey, provider);
	// 	return wallet;
	// }
	// return signer;

	// // New approach: creating a new ethers v6 wallet
	// // if EOA wallet, just get the private key and provider and instantiate a new ethers v6 wallet
	// if (signer.privateKey) {
	// 	const provider = signer.provider;
	// 	const privateKey = signer.privateKey;
	// 	const wallet = new ethers.Wallet(privateKey, provider);
	// 	return wallet;
	// }
	// // if it is wallet whose key we cannot access (e.g. BrowserWallet), we connect ourselves to the provider
	// else {
	// 	// this will not work with walletconnect or non-meta mask wallets
	// 	// const provider = new ethers.BrowserProvider(window.ethereum, 'any'); // v6
	// 	const provider = new ethers.utils.Web3Provider(window.ethereum, 'any'); // v5
	// 	const signer = await provider.getSigner();
	// 	return signer;
	// }

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

	// //   // v6 methods
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
		let address = await signer.getAddress();
		allowance = await tokenContract.allowance(address, spender);
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
		// amount = ethers.MaxUint256; // v6
		amount = ethers.constants.MaxUint256; // v5
	}
	const spender = PEANUT_CONTRACTS[chainId][contractVersion];
	let allowance = await getAllowance(signer, chainId, tokenContract, spender);
	// convert amount to BigInt and compare to allowance
	// amount = ethers.parseUnits(amount.toString(), tokenDecimals); // v6
	amount = ethers.utils.parseUnits(amount.toString(), tokenDecimals); // v5
	if (allowance >= amount) {
		console.log('Allowance already enough, no need to approve more');
		return { allowance, txReceipt: null };
	} else {
		console.log('Allowance only', allowance.toString(), ', need ' + amount.toString() + ', approving...');
		const txOptions = await setTxOptions({ verbose, provider: signer.provider, eip1559: true });
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
	// if not txOptions, create it (oneliner)
	txOptions = txOptions || {};
	try {
		feeData = await provider.getFeeData();
		verbose && console.log('Fetched gas price from provider:', feeData);
	} catch (error) {
		console.error('Failed to fetch gas price from provider:', error);
		throw error;
		// return txOptions;
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
	nonce = null,
}) {
	assert(signer, 'signer arg is required');
	assert(chainId, 'chainId arg is required');
	assert(tokenAmount, 'amount arg is required');
	assert(
		tokenType == 0 || tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-native tokens',
	);
	assert(
		!(tokenType == 1 || tokenType == 3) || tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens',
	);

	signer = await convertSignerToV6(signer);

	if (tokenAddress == null) {
		tokenAddress = '0x0000000000000000000000000000000000000000';
		if (tokenType != 0) {
			throw new Error('tokenAddress is null but tokenType is not 0');
		}
	}
	// convert tokenAmount to appropriate unit
	// tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals); // v6
	tokenAmount = ethers.utils.parseUnits(tokenAmount.toString(), tokenDecimals); // v5

	// if native token (tokentype == 0), add value to txOptions
	let txOptions = {};
	// set nonce
	// nonce = nonce || (await signer.getNonce()); // v6
	nonce = nonce || (await signer.getTransactionCount()); // v5
	txOptions.nonce = nonce;
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
	txOptions = await setTxOptions({
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

	console.log('submitted tx: ', tx.hash);

	// now we need the deposit index from the tx receipt
	var txReceipt = await tx.wait();
	var depositIdx = getDepositIdx(txReceipt, chainId);
	verbose && console.log('Deposit finalized. Deposit index: ', depositIdx);

	// now we can create the link
	const link = getLinkFromParams(chainId, contractVersion, depositIdx, password, baseUrl, trackId);
	verbose && console.log('created link: ', link);
	// return the link and the tx receipt
	return { link, txReceipt };
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
		recipient = await signer.getAddress();

		verbose && console.log('recipient not provided, using signer address: ', recipient);
	}
	const keys = generateKeysFromString(password); // deterministically generate keys from password
	const contract = await getContract(chainId, signer, contractVersion);

	// cryptography
	var addressHash = solidityHashAddress(recipient);
	// var addressHashBinary = ethers.getBytes(addressHash); // v6
	var addressHashBinary = ethers.utils.arrayify(addressHash); // v5
	verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary);
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
	// var addressHashBinary = ethers.getBytes(addressHash); // v6
	var addressHashBinary = ethers.utils.arrayify(addressHash); // v5
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

export async function getLinkDetails(signer, link, verbose = false) {

	/**
	 * Gets the details of a Link: what token it is, how much it holds, etc.
	 */
	/**
	 * Plan:
	 * 1. Get link from blockchain (need provider for that)
	 * 2. get token details from tokenDetails object
	 * 3. format token amount with decimals
	 * 4. get token price (TODO: API!)
	 * 5. return link details
	 */

	assert(signer, 'signer arg is required');
	assert(link, 'link arg is required');

	signer = await convertSignerToV6(signer);

	const params = getParamsFromLink(link);
	const chainId = params.chainId;
	const contractVersion = params.contractVersion;
	const depositIdx = params.depositIdx;
	const password = params.password;
	const contract = await getContract(chainId, signer, contractVersion);

	const deposit = await contract.deposits(depositIdx);
	verbose && console.log('fetched deposit: ', deposit);

	// Retrieve the token's details from the tokenDetails.json file
	verbose && console.log('finding token details for token with address: ', deposit.tokenAddress, ' on chain: ', chainId);
	// Find the correct chain details using chainId
	const chainDetails = TOKEN_DETAILS.find(chain => chain.chainId === String(chainId));
	if (!chainDetails) {
		throw new Error('Chain details not found');
	}

	// Find the token within the tokens array of the chain
	const tokenDetails = chainDetails.tokens.find(token => token.address.toLowerCase() === deposit.tokenAddress.toLowerCase());
	if (!tokenDetails) {
		throw new Error('Token details not found');
	}


	// Format the token amount
	const tokenAmount = ethers.utils.formatUnits(deposit.amount, tokenDetails.decimals);

	// TODO: Fetch token price using API

	console.log(deposit)
	return {
		link: link,
		chainId: chainId,
		depositIndex: depositIdx,
		contractVersion: contractVersion,
		password: password,
		tokenType: deposit.contractType,
		tokenAddress: deposit.tokenAddress,
		tokenSymbol: tokenDetails.symbol,
		tokenName: tokenDetails.name,
		tokenAmount: tokenAmount,
		// tokenPrice: tokenPrice
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
	getLinkDetails,
	getParamsFromLink,
	getParamsFromPageURL,
	getLinkFromParams,
	createLink,
	// createLinks,
	claimLink,
	approveSpendERC20,
	claimLinkGasless,
	VERSION,
	version: VERSION,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	TOKEN_TYPES,
	DEFAULT_CONTRACT_VERSION,
	// approveSpendERC721,
	// approveSpendERC1155,
};

export default peanut;
export { peanut };
