////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. This library is compatible with ethers v5, and
//  supports both node and browser environments.
//
/////////////////////////////////////////////////////////

import { ethers } from 'ethersv5' // v5
import 'isomorphic-fetch' // isomorphic-fetch is a library that implements fetch in node.js and the browser
import {
	PEANUT_ABI_V3,
	PEANUT_ABI_V4,
	PEANUT_BATCHER_ABI_V4,
	PEANUT_CONTRACTS,
	ERC20_ABI,
	ERC721_ABI,
	ERC1155_ABI,
	CHAIN_MAP,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	VERSION,
	DEFAULT_CONTRACT_VERSION,
	FALLBACK_CONTRACT_VERSION,
	TOKEN_TYPES,
} from './data.js'

import {
	assert,
	greeting,
	generateKeysFromString,
	hash_string,
	signMessageWithPrivatekey,
	verifySignature,
	solidityHashBytesEIP191,
	solidityHashAddress,
	signAddress,
	getRandomString,
	getLinkFromParams,
	getParamsFromLink,
	getParamsFromPageURL,
	getDepositIdx,
	getDepositIdxs,
} from './util.js'

async function getAbstractSigner(signer, verbose = true) {
	// TODO: create abstract signer class that is compatible with ethers v5, v6, viem, web3js
	return signer
}

async function checkRpc(rpc, verbose = false) {
	try {
		verbose && console.log('Checking provider:', rpc)
		const provider = new ethers.providers.JsonRpcProvider(rpc)
		verbose && console.log('provider blocknumber:', await provider.getBlockNumber())
		return true
	} catch (error) {
		verbose && console.error('Error checking provider:', provider)
		return false
	}
}
/**
 * Returns the default provider for a given chainId
 *
 * @param {number|string} chainId - The chainId to get the provider for
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {Object} - The provider
 */
export async function getDefaultProvider(chainId, verbose = false) {
	verbose && console.log('Getting default provider for chainId ', chainId)
	chainId = String(chainId)
	const rpcs = CHAIN_DETAILS[chainId].rpc

	verbose && console.log('rpcs', rpcs)

	for (let i = 0; i < rpcs.length; i++) {
		const rpc = rpcs[i]

		// Skip if the rpc string contains '${'
		if (rpc.includes('${')) continue

		verbose && console.log('Checking rpc', rpc)
		if (await checkRpc(rpc, verbose)) {
			verbose && console.log('Provider is alive:', rpc)
			return new ethers.providers.JsonRpcProvider(rpc)
		} else {
			verbose && console.log('Provider is down:', rpc)
		}
	}

	throw new Error('No alive provider found for chainId ' + chainId)
}

/**
 * Returns a contract object for a given chainId and signer
 *
 * @param {number|string} chainId - The chainId to get the contract for
 * @param {Object|null} signerOrProvider - The signer or provider to use for the contract. if null, use getDefaultProvider
 * @param {string} [version=CONTRACT_VERSION] - The version of the contract
 * @param {boolean} [verbose=true] - Whether or not to print verbose output
 * @returns {Object} - The contract object
 */export async function getContract(chainId, signerOrProvider, version = CONTRACT_VERSION, verbose = true) {
	if (signerOrProvider == null) {
		verbose && console.log('signerOrProvider is null, getting default provider...');
		signerOrProvider = await getDefaultProvider(chainId, verbose);
	}

	if (typeof chainId == 'string' || chainId instanceof String) {
		chainId = parseInt(chainId);
	}

	// Determine which ABI version to use based on the version provided
	var PEANUT_ABI;
	switch(version) {
		case 'v3':
			PEANUT_ABI = PEANUT_ABI_V3;
			break;
		case 'v4':
			PEANUT_ABI = PEANUT_ABI_V4;
			break;
		case 'Bv4':
			PEANUT_ABI = PEANUT_BATCHER_ABI_V4;
			break;
		default:
			throw new Error('Invalid version');
	}

	// Find the contract address based on the chainId and version provided
	const contractAddress = PEANUT_CONTRACTS[chainId] && PEANUT_CONTRACTS[chainId][version];

	// If the contract address is not found, throw an error
	if (!contractAddress) {
		throw new Error(`Contract ${version} not deployed on chain ${chainId}`);
	}

	const contract = new ethers.Contract(contractAddress, PEANUT_ABI, signerOrProvider);

	verbose && console.log(`Connected to contract ${version} on chain ${chainId} at ${contractAddress}`);

	return contract;
	// TODO: return class
}


async function getAllowance(signer, chainId, tokenContract, spender, address = null, verbose = false) {
	let allowance
	try {
		address = address || (await signer.getAddress())
		verbose && console.log('calling contract allowance function...')
		allowance = await tokenContract.allowance(address, spender)
	} catch (error) {
		console.error('Error fetching allowance:', error)
	}
	return allowance
}

/**
 * Approves the contract to spend the specified amount of tokens
 *
 * @param {Object} signer - The signer to use for approving the spend
 * @param {number|string} chainId - The chainId of the contract
 * @param {string} tokenAddress - The address of the token to approve the spend for
 * @param {number|string} amount - The amount to approve for spending. If -1, approve infinite amount.
 * defaults to 18.
 * @param {number} tokenDecimals - The number of decimals the token has
 * @param {boolean} isRawAmount - Whether or not the amount is raw or not. If true, the amount will not be converted to the appropriate unit
 * @param {string} contractVersion - The version of the contract
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {Object} - An object containing the allowance and txReceipt
 */
export async function approveSpendERC20(
	signer,
	chainId,
	tokenAddress,
	amount,
	tokenDecimals = 18,
	isRawAmount = false,
	contractVersion = DEFAULT_CONTRACT_VERSION,
	verbose = true
) {
	/*  Approves the contract to spend the specified amount of tokens   */
	signer = await getAbstractSigner(signer)
	const signerAddress = await signer.getAddress()

	const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
	verbose && console.log('Connected to tokenContract at ', tokenAddress, ' on chain ', chainId)
	if (amount == -1) {
		// if amount is -1, approve infinite amount
		amount = ethers.constants.MaxUint256
	}
	const spender = PEANUT_CONTRACTS[chainId][contractVersion]
	verbose && console.log('Getting allowance for spender ', spender, 'on chain ', chainId, '...')
	let allowance = await getAllowance(signer, chainId, tokenContract, spender, signerAddress, verbose)
	verbose && console.log('Allowance: ', allowance.toString())

	if (isRawAmount) {
		amount = amount
	} else {
		amount = ethers.utils.parseUnits(amount.toString(), tokenDecimals)
	}
	// debug: print type of allowance and amount, print their comparison
	// verbose && console.log('Allowance type: ', typeof allowance, allowance, allowance.toString())
	// verbose && console.log('Amount type: ', typeof amount, amount, amount.toString())
	// verbose && console.log('Allowance >= Amount: ', allowance >= amount)
	// verbose && console.log('Allowance >= Amount: ', allowance.gte(amount));

	if (allowance.gte(amount)) {
		console.log('Allowance already enough, no need to approve more (allowance: ' + allowance.toString() + ')')
		return { allowance, txReceipt: null }
	} else {
		console.log('Allowance only', allowance.toString(), ', need ' + amount.toString() + ', approving...')
		const txOptions = await setFeeOptions({ verbose, provider: signer.provider, eip1559: true })
		const tx = await tokenContract.approve(spender, amount, txOptions)
		const txReceipt = await tx.wait()
		allowance = await getAllowance(signer, chainId, tokenContract, spender, signerAddress, verbose)
		console.log('New Allowance: ', allowance.toString())
		return { allowance, txReceipt }
	}
}

async function setFeeOptions({
	txOptions,
	provider,
	eip1559,
	maxFeePerGas = null,
	maxFeePerGasMultiplier = 1.1,
	gasLimit = null,
	gasPrice = null,
	gasPriceMultiplier = 1.2,
	maxPriorityFeePerGas = null,
	maxPriorityFeePerGasMultiplier = 2,
	verbose = false,
} = {}) {
	verbose && console.log('Setting tx options...')
	let feeData
	// if not txOptions, create it (oneliner)
	txOptions = txOptions || {}
	try {
		feeData = await provider.getFeeData()
		verbose && console.log('Fetched gas price from provider:', feeData)
	} catch (error) {
		console.error('Failed to fetch gas price from provider:', error)
		throw error
		// return txOptions;
	}

	if (gasLimit) {
		txOptions.gasLimit = gasLimit
	}

	// if on chain 137 (polygon mainnet), set maxPriorityFeePerGas to 30 gwei
	let chainId = await provider.getNetwork().then((network) => network.chainId)
	if (chainId == 137) {
		maxPriorityFeePerGas = ethers.utils.parseUnits('30', 'gwei')
		verbose && console.log('Setting maxPriorityFeePerGas to 30 gwei')
	}

	// if on milkomeda, set eip1559 to false
	if (chainId == '2001' || chainId == '200101' || chainId == 2001 || chainId == 200101) {
		eip1559 = false
		verbose && console.log('Setting eip1559 to false for milkomeda')
	}

	if (eip1559) {
		try {
			verbose && console.log('Setting eip1559 tx options...', txOptions)
			txOptions.maxFeePerGas =
				maxFeePerGas ||
				(BigInt(feeData.maxFeePerGas.toString()) * BigInt(Math.round(maxFeePerGasMultiplier * 10))) / BigInt(10)
			txOptions.maxPriorityFeePerGas =
				maxPriorityFeePerGas ||
				(BigInt(feeData.maxPriorityFeePerGas.toString()) *
					BigInt(Math.round(maxPriorityFeePerGasMultiplier * 10))) /
					BigInt(10)

			// ensure maxPriorityFeePerGas is less than maxFeePerGas
			if (txOptions.maxPriorityFeePerGas > txOptions.maxFeePerGas) {
				txOptions.maxPriorityFeePerGas = txOptions.maxFeePerGas
			}
		} catch (error) {
			console.error('Failed to set eip1559 tx options:', error)
			console.log('Falling back to legacy tx options...')
			eip1559 = false
		}
	}
	if (!eip1559) {
		let gasPrice
		if (!txOptions.gasPrice) {
			if (feeData.gasPrice == null) {
				// operating in a EIP-1559 environment
				eip1559 = true
				console.log("Couldn't fetch gas price from provider, trying an eip1559 transaction")
			} else {
				txOptions.gasPrice = feeData.gasPrice.toString()
				gasPrice = BigInt(feeData.gasPrice.toString())
			}
		}
		const proposedGasPrice = (gasPrice * BigInt(Math.round(gasPriceMultiplier * 10))) / BigInt(10)
		txOptions.gasPrice = proposedGasPrice.toString()
	}

	verbose && console.log('FINAL txOptions:', txOptions)

	return txOptions
}

async function estimateGasLimit(contract, functionName, params, txOptions) {
	try {
		const estimatedGas = await contract.estimateGas[functionName](...params, txOptions)
		return BigInt(Math.floor(Number(estimatedGas) * 1.1)) // safety margin
	} catch (error) {
		console.error(`Error estimating gas for ${functionName}:`, error)
		console.error(
			'contract address:',
			contract.address,
			'txOptions:',
			txOptions,
			'params:',
			params,
			'functionName:',
			functionName
		)
		return null
	}
}

export function formatNumberAvoidScientific(n) {
	if (typeof n === 'number') {
		const str = n.toString()

		// If number is already in standard format or is an integer
		if (!str.includes('e') && !str.includes('E')) {
			return str
		}

		const [lead, decimal, pow] = str.split(/e|\./)
		const prefix = lead + (decimal || '')
		const exponent = parseInt(pow, 10)

		if (exponent > 0) {
			return prefix + '0'.repeat(exponent - (decimal || '').length)
		} else {
			const length = lead.length
			if (exponent + length > 0) {
				return prefix.slice(0, exponent + length) + '.' + prefix.slice(exponent + length)
			} else {
				return '0.' + '0'.repeat(-(exponent + length)) + prefix
			}
		}
	} else {
		return n
	}
}

// trim some number to a certain number of decimals
export function trim_decimal_overflow(n, decimals) {
	n = formatNumberAvoidScientific(n)
	n += ''

	if (n.indexOf('.') === -1) return n

	const arr = n.split('.')
	const fraction = arr[1].substr(0, decimals)
	return arr[0] + '.' + fraction
}

/**
 * Generates a link with the specified parameters
 *
 * @param {Object} options - An object containing the options to use for the link creation
 * @returns {Object} - An object containing the link and the txReceipt
 * @example
 * const result = await createLink({
 *   signer,
 *   chainId: 1,
 *   tokenAmount: 100,
 *   tokenAddress: "0xYourTokenAddress",
 *   tokenType: 1,
 *   tokenId: 0,
 *   tokenDecimals: 18,
 *   password: "yourPassword",
 *   baseUrl: "https://peanut.to/claim",
 *   trackId: "sdk",
 *   maxFeePerGas: null,
 *   maxPriorityFeePerGas: null,
 *   gasLimit: null,
 *   eip1559: true,
 *   verbose: false,
 *   contractVersion: "v4",
 *   nonce: null
 * });
 * console.log(result); // { link: "https://peanut.to/claim?c=1&v=v4&i=123&p=yourPassword", txReceipt: TransactionReceipt }
 */
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
	fallBackContractVersion = FALLBACK_CONTRACT_VERSION,
	nonce = null,
}) {
	assert(signer, 'signer arg is required')
	assert(chainId, 'chainId arg is required')
	assert(tokenAmount, 'amount arg is required')
	assert(
		tokenType == 0 || tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-native tokens'
	)
	assert(
		!(tokenType == 1 || tokenType == 3) || tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
	)

	// check if contractVersion exists
	if (!PEANUT_CONTRACTS[chainId][contractVersion]) {
		// if not, use fallback contract version if it is not null or false, else throw error
		if (fallBackContractVersion) {
			contractVersion = fallBackContractVersion
			console.warn(
				'WARNING: Contract version ' + contractVersion + ' not deployed on chain ' + chainId,
				'Using fallback contract version ' + fallBackContractVersion
			)
		} else {
			throw new Error('Contract version ' + contractVersion + ' not deployed on chain ' + chainId)
		}
	}

	signer = await getAbstractSigner(signer)

	if (tokenAddress == null) {
		tokenAddress = '0x0000000000000000000000000000000000000000'
		if (tokenType != 0) {
			throw new Error('tokenAddress is null but tokenType is not 0')
		}
	}
	// limit tokenAmount to 18 decimals
	// if (typeof tokenAmount == 'string' || tokenAmount instanceof String) {
	// 	tokenAmount = parseFloat(tokenAmount)
	// }
	// tokenAmount = tokenAmount.toFixed(18)
	tokenAmount = trim_decimal_overflow(tokenAmount, tokenDecimals)
	tokenAmount = ethers.utils.parseUnits(tokenAmount, tokenDecimals) // v5
	assert(tokenAmount > 0, 'tokenAmount must be greater than 0')

	// if native token (tokentype == 0), add value to txOptions
	let txOptions = {}
	// set nonce
	// nonce = nonce || (await signer.getNonce()); // v6
	nonce = nonce || (await signer.getTransactionCount()) // v5
	txOptions.nonce = nonce
	if (tokenType == 0) {
		txOptions = {
			...txOptions,
			value: tokenAmount,
		}
	} else if (tokenType == 1) {
		// check allowance
		// TODO: check for erc721 and erc1155
		verbose && console.log('checking allowance...')
		// if token is erc20, check allowance
		const allowance = await approveSpendERC20(
			signer,
			chainId,
			tokenAddress,
			tokenAmount,
			tokenDecimals,
			true,
			contractVersion
		)
		verbose && console.log('allowance: ', allowance, ' tokenAmount: ', tokenAmount)
		if (allowance < tokenAmount) {
			throw new Error('Allowance not enough')
		}
	}

	if (password == null || password == '') {
		// if no password is provided, generate a random one
		password = getRandomString(16)
	}

	const keys = generateKeysFromString(password) // deterministically generate keys from password
	const contract = await getContract(chainId, signer, contractVersion) // get the contract instance

	verbose && console.log('Generating link...')

	// set transaction options
	txOptions = await setFeeOptions({
		txOptions,
		provider: signer.provider,
		eip1559,
		maxFeePerGas,
		maxPriorityFeePerGas,
		gasLimit,
		verbose, // Include verbose in the object passed to setFeeOptions
	})

	verbose && console.log('post txOptions: ', txOptions)
	const depositParams = [tokenAddress, tokenType, tokenAmount, tokenId, keys.address]
	const estimatedGasLimit = await estimateGasLimit(contract, 'makeDeposit', depositParams, txOptions)
	if (estimatedGasLimit) {
		txOptions.gasLimit = estimatedGasLimit.toString()
	}
	verbose && console.log('final txOptions: ', txOptions)
	// const depositParams = [tokenAddress, tokenType, tokenAmount, tokenId, keys.address, txOptions];
	verbose && console.log('depositParams: ', depositParams)
	// var tx = await contract.makeDeposit(...depositParams);

	// store in localstorage in case tx falls through (only if in web environment)
	// TODO: refactor in future
	if (typeof window !== 'undefined') {
		const tempDeposits = JSON.parse(localStorage.getItem('tempDeposits')) || []
		const tempDeposit = {
			chain: chainId,
			tokenAmount: tokenAmount.toString(),
			contractType: tokenType,
			contractVersion: contractVersion,
			tokenAddress: tokenAddress,
			password: password,
			idx: null,
			link: null,
			txHash: null,
		}
		tempDeposits.push(tempDeposit)
		localStorage.setItem('tempDeposits', JSON.stringify(tempDeposits))
	}

	var tx = await contract.makeDeposit(...depositParams, txOptions)

	console.log('submitted tx: ', tx.hash)

	// now we need the deposit index from the tx receipt
	var txReceipt = await tx.wait()
	var depositIdx = getDepositIdx(txReceipt, chainId, contractVersion)
	verbose && console.log('Deposit finalized. Deposit index: ', depositIdx)

	// now we can create the link
	const link = getLinkFromParams(chainId, contractVersion, depositIdx, password, baseUrl, trackId)
	verbose && console.log('created link: ', link)
	// return the link and the tx receipt
	return { link, txReceipt }
}

export async function createLinks({
	signer, // ethers signer object
	chainId, // chain id of the network (only EVM for now)
	tokenAmount = null, // tokenAmount to put in each link
	numberOfLinks = null, // number of links to create
	tokenAmounts = [], // array of token amounts, if different amounts are needed for links
	tokenAddress = '0x0000000000000000000000000000000000000000',
	tokenAddresses = [], // array of token addresses, if different tokens are needed for links
	tokenType = 0, // 0: ETH, 1: ERC20, 2: ERC721, 3: ERC1155
	tokenId = 0, // only used for ERC721 and ERC1155
	tokenDecimals = null, // only used for ERC20 and ERC1155
	passwords = [], // passwords that each link should have
	baseUrl = 'https://peanut.to/claim',
	trackId = 'sdk', // optional tracker id to track the link source
	maxFeePerGas = null,
	maxPriorityFeePerGas = null,
	gasLimit = null,
	eip1559 = true,
	nonce = null,
	verbose = false,
	contractVersion = DEFAULT_CONTRACT_VERSION, // need this for passing in an address to the batcher
	batcherContractVersion = 'Bv4', // TODO: group with DEFAULT_CONTRACT_VERSION
	fallBackcontractInstance = null, // TODO:
	mock = false,
}) {
	assert(signer, 'signer arg is required')
	assert(chainId, 'chainId arg is required')
	assert(
		tokenAmounts.length == 0 && tokenAddresses.length == 0,
		'variable tokenAmounts & tokenAddresses is not supported yet. Please use a single value instead'
	)

	assert(
		tokenType == 0 || tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-ETH tokens'
	)
	assert(tokenAmount == null || tokenAmounts.length == 0, "can't have both tokenAmount and tokenAmounts defined")
	assert(tokenAmounts.length > 0 || numberOfLinks > 0, 'either numberOfLinks or tokenAmounts must be provided')
	numberOfLinks = numberOfLinks || tokenAmounts.length
	assert(
		tokenAmounts.length == 0 || tokenAmounts.length == numberOfLinks,
		'length of tokenAmounts must be equal to numberOfLinks'
	)
	assert(tokenType == 0 || tokenType == 1, 'ERC721 and ERC1155 are not supported yet')
	// tokendecimals must be provided for erc20 and erc1155 tokens
	assert(
		!(tokenType == 1 || tokenType == 3) || tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
	)
	verbose && console.log('Asserts passed')

	// set tokenDecimals for native token
	if (tokenDecimals == null) {
		tokenDecimals = 18
	}

	// // limit tokenAmount to 18 decimals
	// if (typeof tokenAmount == 'string' || tokenAmount instanceof String) {
	// 	tokenAmount = parseFloat(tokenAmount)
	// }
	// tokenAmount = tokenAmount.toFixed(18)

	tokenAmount = trim_decimal_overflow(tokenAmount, tokenDecimals)
	tokenAmount = ethers.utils.parseUnits(tokenAmount, tokenDecimals)
	assert(tokenAmount > 0, 'tokenAmount must be greater than 0')
	let totalTokenAmount
	if (tokenAmounts.length > 0) {
		totalTokenAmount = tokenAmounts.reduce((acc, curr) => {
			return acc.add(ethers.utils.parseUnits(curr.toString(), tokenDecimals))
		}, ethers.BigNumber.from(0))
	} else if (tokenAmount) {
		verbose && console.log('calculating tokenAmount * numberOfLinks')
		totalTokenAmount = tokenAmount.mul(ethers.BigNumber.from(numberOfLinks.toString()))
		verbose && console.log('totalTokenAmount: ', totalTokenAmount.toString())
	} else {
		throw new Error('Either tokenAmount or tokenAmounts must be provided')
	}
	assert(totalTokenAmount > 0, 'totalTokenAmount must be greater than 0')

	// Get the batcher Contract
	const batcherContract = await getContract(chainId, signer, batcherContractVersion)

	// Determine the pubKeys from the passwords
	if (passwords.length == 0) {
		passwords = Array.from({ length: numberOfLinks }, () => getRandomString(16))
	}
	const pubKeys = passwords.map((password) => generateKeysFromString(password).address)

	verbose && console.log('created pubKeys')

	// If the token is ERC20, approve the contract to spend tokens
	if (tokenType === 1) {
		verbose && console.log('Checking && requesting approval of a total of ', totalTokenAmount, ' tokens')
		const { allowance, txReceipt } = await approveSpendERC20(
			signer,
			chainId,
			tokenAddress,
			totalTokenAmount,
			tokenDecimals,
			true,
			batcherContractVersion
		)
		verbose && console.log('Allowance: ', allowance)
	}

	// Set transaction options
	let txOptions = {}
	nonce = nonce || (await signer.getTransactionCount())
	txOptions.nonce = nonce
	if (tokenType == 0) {
		txOptions = {
			...txOptions,
			value: tokenAmount.mul(ethers.BigNumber.from(numberOfLinks.toString())),
		}
	}

	txOptions = await setFeeOptions({
		txOptions,
		provider: signer.provider,
		eip1559,
		maxFeePerGas,
		maxPriorityFeePerGas,
		gasLimit,
		verbose,
	})

	verbose && console.log('post txOptions: ', txOptions)
	// Make the batch deposit (amount of deposits is determined by length of pubKeys). tokenAmount is for each individual deposit
	const depositParams = [
		PEANUT_CONTRACTS[chainId][contractVersion], // The address of the PeanutV4 contract
		tokenAddress,
		tokenType,
		tokenAmount,
		tokenId,
		pubKeys,
	]
	verbose && console.log('depositParams: ', depositParams)

	const estimatedGasLimit = await estimateGasLimit(batcherContract, 'batchMakeDeposit', depositParams, txOptions)
	if (estimatedGasLimit) {
		txOptions.gasLimit = estimatedGasLimit.toString()
	}

	if (mock) {
		return { links: [], txReceipt: null }
	}

	const tx = await batcherContract.batchMakeDeposit(...depositParams, txOptions)
	console.log('submitted tx: ', tx.hash)

	// Wait for the transaction to be mined and get the receipt
	const txReceipt = await tx.wait()
	verbose && console.log('txReceipt: ', txReceipt)

	// Extract the deposit indices from the transaction receipt
	const depositIdxs = getDepositIdxs(txReceipt, chainId, contractVersion)

	// Generate the links based on the deposit indices
	const links = depositIdxs.map((depositIdx, i) =>
		getLinkFromParams(chainId, contractVersion, depositIdx, passwords[i], baseUrl, trackId)
	)

	// Return the links and the transaction receipt
	return { links, txReceipt }
}

/**
 * Checks if a link has been claimed
 *
 * @param {Object} options - An object containing the signer and link to check
 * @returns {Object} - An object containing whether the link has been claimed and the deposit
 */
export async function getLinkStatus({ signer, link }) {
	// warning deprecated
	console.warn('WARNING: getLinkStatus is deprecated. Use getLinkDetails instead.')
	assert(signer, 'signer arg is required')
	assert(link, 'link arg is required')

	signer = await getAbstractSigner(signer)

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const contract = await getContract(chainId, signer, contractVersion)
	const deposit = await contract.deposits(depositIdx)

	// if the deposit is claimed, the pubKey20 will be 0x000....
	if (deposit.pubKey20 == '0x0000000000000000000000000000000000000000') {
		return { claimed: true, deposit }
	}
	return { claimed: false, deposit }
}

/**
 * Claims the contents of a link
 *
 * @param {Object} options - An object containing the options to use for claiming the link
 * @param {Object} options.signer - The signer to use for claiming
 * @param {string} options.link - The link to claim
 * @param {string} [options.recipient=null] - The address to claim the link to. Defaults to the signer's address if not provided
 * @param {boolean} [options.verbose=false] - Whether or not to print verbose output
 * @returns {Object} - The transaction receipt
 */
export async function claimLink({
	signer,
	link,
	recipient = null,
	verbose = false,
	maxFeePerGas = null,
	maxPriorityFeePerGas = null,
	gasLimit = null,
	eip1559 = true,
}) {
	// claims the contents of a link
	assert(signer, 'signer arg is required')
	assert(link, 'link arg is required')

	signer = await getAbstractSigner(signer)

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	if (recipient == null) {
		recipient = await signer.getAddress()
		verbose && console.log('recipient not provided, using signer address: ', recipient)
	}
	const keys = generateKeysFromString(password) // deterministically generate keys from password
	const contract = await getContract(chainId, signer, contractVersion, verbose)

	// cryptography
	var addressHash = solidityHashAddress(recipient)
	var addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
	var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	var signature = signAddress(recipient, keys.privateKey) // sign with link keys

	if (verbose) {
		// print the params
		console.log('params: ', params)
		console.log('addressHash: ', addressHash)
		console.log('addressHashEIP191: ', addressHashEIP191)
		console.log('signature: ', signature)
	}

	// Prepare transaction options
	let txOptions = {}
	txOptions = await setFeeOptions({
		txOptions,
		provider: signer.provider,
		eip1559,
		maxFeePerGas,
		maxPriorityFeePerGas,
		gasLimit,
		verbose,
	})

	const claimParams = [depositIdx, recipient, addressHashEIP191, signature]
	verbose && console.log('claimParams: ', claimParams)
	verbose && console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')

	// withdraw the deposit
	const tx = await contract.withdrawDeposit(...claimParams, txOptions)
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	const txReceipt = await tx.wait()

	return txReceipt
}

/**
 * Gets all deposits for a given signer and chainId.
 *
 */
export async function getAllDepositsForSigner({
	signer,
	chainId,
	contractVersion = DEFAULT_CONTRACT_VERSION,
	verbose = false,
}) {
	const contract = await getContract(chainId, signer, contractVersion)
	let deposits
	if (contractVersion == 'v3') {
		// throw warning if using v3
		console.warn('WARNING: This function is not efficient for v3 contracts. Not recommended to use.')
		const depositCount = await contract.getDepositCount()
		deposits = []
		for (let i = 0; i < depositCount; i++) {
			verbose && console.log('fetching deposit: ', i)
			let deposit = await contract.deposits(i)
			deposits.push(deposit)
		}
	} else {
		// v4: we now have getAllDeposits available
		const address = await signer.getAddress()
		// const allDeposits = await contract.getAllDeposits();
		deposits = await contract.getAllDepositsForAddress(address)
	}
	return deposits
}

/**
 * Claims the contents of a link as a sender. Can only be used if a link has not been claimed in a set time period.
 * (24 hours). Only works with links created with v4 of the contract. More gas efficient than claimLink.
 *
 * @param {Object} options - An object containing the options to use for claiming the link
 * @param {Object} options.signer - The signer to use for claiming
 * @param {string} options.link - The link to claim
 * @param {boolean} [options.verbose=false] - Whether or not to print verbose output
 * @returns {Object} - The transaction receipt
 */
export async function claimLinkSender({ signer, link, verbose = false }) {
	// raise error, not implemented yet
	throw new Error('Not implemented yet')
	assert(signer, 'signer arg is required')
	assert(link, 'link arg is required')

	signer = await getAbstractSigner(signer)

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	if (recipient == null) {
		recipient = await signer.getAddress()

		verbose && console.log('recipient not provided, using signer address: ', recipient)
	}
	const keys = generateKeysFromString(password) // deterministically generate keys from password
	const contract = await getContract(chainId, signer, contractVersion)

	// cryptography
	var addressHash = solidityHashAddress(recipient)
	// var addressHashBinary = ethers.getBytes(addressHash); // v6
	var addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
	var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	var signature = await signAddress(recipient, keys.privateKey) // sign with link keys

	if (verbose) {
		// print the params
		console.log('params: ', params)
		console.log('addressHash: ', addressHash)
		console.log('addressHashEIP191: ', addressHashEIP191)
		console.log('signature: ', signature)
	}

	// TODO: use createClaimPayload instead

	// withdraw the deposit
	// address hash is hash(prefix + hash(address))
	const tx = await contract.withdrawDeposit(depositIdx, recipient, addressHashEIP191, signature)
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	const txReceipt = await tx.wait()

	return txReceipt
}

async function createClaimPayload(link, recipientAddress) {
	/* internal utility function to create the payload for claiming a link */
	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const password = params.password
	const keys = generateKeysFromString(password) // deterministically generate keys from password

	// cryptography
	var addressHash = solidityHashAddress(recipientAddress)
	// var addressHashBinary = ethers.getBytes(addressHash); // v6
	var addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	var signature = await signAddress(recipientAddress, keys.privateKey) // sign with link keys

	return {
		recipientAddress: recipientAddress,
		addressHash: addressHashEIP191,
		signature: signature,
		idx: params.depositIdx,
		chainId: params.chainId,
		contractVersion: params.contractVersion,
	}
}

/**
 * Gets the details of a Link: what token it is, how much it holds, etc.
 *
 * @param {Object|null} signerOrProvider - The signer or provider to use. if not provided, will use fallback public provider
 * @param {string} link - The link to get the details of
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {Object} - An object containing the link details
 */
export async function getLinkDetails(signerOrProvider, link, verbose = false) {
	verbose && console.log('getLinkDetails called with link: ', link)
	assert(link, 'link arg is required')

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	const contract = await getContract(chainId, signerOrProvider, contractVersion, verbose)

	verbose && console.log('fetching deposit: ', depositIdx)
	const deposit = await contract.deposits(depositIdx)
	// const deposit = await contract.getDeposit(depositIdx)
	console.log('deposit: ', deposit)
	verbose && console.log('fetched deposit: ', deposit)
	var tokenAddress = deposit.tokenAddress

	let claimed = false
	if (deposit.pubKey20 == '0x0000000000000000000000000000000000000000') {
		claimed = true
	}

	// get date of deposit (only possible in V4 links)
	let depositDate
	if (['v4', 'v5'].includes(contractVersion)) {
		if (deposit.timestamp) {
			depositDate = new Date(deposit.timestamp * 1000) // Convert Solidity's UNIX timestamp to JavaScript's Date object
		} else {
			verbose && console.log('No timestamp found in deposit for version', contractVersion)
		}
	}

	const tokenType = deposit.contractType
	verbose && console.log('tokenType: ', tokenType, typeof tokenType)

	if (tokenType == 0) {
		// native token, set zero address
		// TODO: is this a potential footgun or no? Why is matic 0xeeeeee....? Is this a problem?
		verbose && console.log('tokenType is 0, setting tokenAddress to zero address')
		tokenAddress = ethers.constants.AddressZero
	}
	verbose && console.log('deposit: ', deposit)

	// Retrieve the token's details from the tokenDetails.json file
	verbose && console.log('finding token details for token with address: ', tokenAddress, ' on chain: ', chainId)
	// Find the correct chain details using chainId
	console.log('chainId: ', chainId)
	const chainDetails = TOKEN_DETAILS.find((chain) => chain.chainId === String(chainId))
	if (!chainDetails) {
		throw new Error('Chain details not found')
	}

	// Find the token within the tokens array of the chain
	const tokenDetails = chainDetails.tokens.find((token) => token.address.toLowerCase() === tokenAddress.toLowerCase())
	if (!tokenDetails) {
		throw new Error('Token details not found')
	}

	// Format the token amount
	const tokenAmount = ethers.utils.formatUnits(deposit.amount, tokenDetails.decimals)

	// TODO: Fetch token price using API

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
		clamed: claimed,
		depositDate: depositDate,
	}

	// tokenPrice: tokenPrice
}

/**
 * Claims a link through the Peanut API
 *
 * @param {string} link - The link to claim
 * @param {string} recipientAddress - The recipient address to claim the link to
 * @param {string} apiKey -The API key to use for the Peanut API
 * @param {string} url - The URL to use for the Peanut API (default is 'https://api.peanut.to/claim')
 * @returns {Object} - The data returned from the API call
 */
export async function claimLinkGasless(
	link,
	recipientAddress,
	apiKey,
	verbose = false,
	url = 'https://api.peanut.to/claim'
) {
	console.log('claiming link through Peanut API...')
	verbose && console.log('link: ', link, ' recipientAddress: ', recipientAddress, ' apiKey: ', apiKey, ' url: ', url)
	const payload = await createClaimPayload(link, recipientAddress)
	verbose && console.log('payload: ', payload)
	//  url = "https://api.peanut.to/claim";
	if (url == 'local') {
		verbose && console.log('using local api')
		url = 'http://127.0.0.1:5001/claim'
	}

	const headers = {
		'Content-Type': 'application/json',
	}

	const body = {
		address: payload.recipientAddress,
		address_hash: payload.addressHash,
		signature: payload.signature,
		idx: payload.idx,
		chain: payload.chainId,
		version: payload.contractVersion,
		api_key: apiKey,
	}

	// if axios error, return the error message

	const response = await fetch(url, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})

	verbose && console.log('response: ', response)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	} else {
		const data = await response.json()
		return data
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
	getDefaultProvider,
	getDepositIdx,
	getDepositIdxs,
	getAllDepositsForSigner,
	getLinkStatus, // deprecated
	getLinkDetails,
	getParamsFromLink,
	getParamsFromPageURL,
	getLinkFromParams,
	createLink,
	createLinks,
	claimLink,
	claimLinkGasless,
	approveSpendERC20,
	// approveSpendERC721,
	// approveSpendERC1155,
	VERSION,
	version: VERSION,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	TOKEN_TYPES,
	DEFAULT_CONTRACT_VERSION,
	PEANUT_CONTRACTS,
}

console.log('peanut-sdk version: ', VERSION)

export default peanut
export {
	peanut,
	greeting,
	generateKeysFromString,
	hash_string,
	signMessageWithPrivatekey,
	verifySignature,
	solidityHashBytesEIP191,
	solidityHashAddress,
	signAddress,
	getRandomString,
	getLinkFromParams,
	getParamsFromLink,
	getParamsFromPageURL,
	getDepositIdx,
	getDepositIdxs,
}
