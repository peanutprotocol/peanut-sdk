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
	PEANUT_CONTRACTS,
	ERC20_ABI,
	// ERC721_ABI,
	// ERC1155_ABI,
	// CHAIN_MAP,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	VERSION,
	DEFAULT_CONTRACT_VERSION,
	TOKEN_TYPES,
} from './data'

import {
	assert,
	greeting,
	generateKeysFromString,
	// hash_string,
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
} from './util'

import { createLinkProp } from '../types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getAbstractSigner(signer: any, _verbose = true) {
	// TODO: create abstract signer class that is compatible with ethers v5, v6, viem, web3js
	return signer
}

/**
 * Returns the default provider for a given chainId
 *
 * @param {number|string} chainId - The chainId to get the provider for
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {Object} - The provider
 */
export function getDefaultProvider(chainId: number | string, verbose = false) {
	chainId = String(chainId)
	const rpcs = CHAIN_DETAILS[chainId as keyof typeof CHAIN_DETAILS].rpc

	verbose && console.log('rpcs', rpcs)
	// choose first rpc that has no '${' sign in it (e.g. )
	const rpc = rpcs.find((rpc) => !rpc.includes('${'))
	verbose && console.log('rpc', rpc)
	const provider = new ethers.providers.JsonRpcProvider(rpc)
	return provider
}

/**
 * Returns a contract object for a given chainId and signer
 *
 * @param {number|string} chainId - The chainId to get the contract for
 * @param {Object} signerOrProvider - The signer or provider to use for the contract
 * @param {string} [version=CONTRACT_VERSION] - The version of the contract
 * @param {boolean} [verbose=true] - Whether or not to print verbose output
 * @returns {Object} - The contract object
 */
export async function getContract(
	chainIdProp: number | string,
	signerOrProvider: any,
	version: string = DEFAULT_CONTRACT_VERSION,
	verbose = true
) {
	/* returns a contract object for the given chainId and signer */
	// signerOrProvider = await convertSignerOr ToV6(signerOrProvider);

	const chainId = typeof chainIdProp === 'string' ? parseInt(chainIdProp) : chainIdProp

	// TODO: fix this for new versions
	// if version is v3, load PEANUT_ABI_V3. if it is v4, load PEANUT_ABI_V4
	let PEANUT_ABI
	if (version == 'v3') {
		PEANUT_ABI = PEANUT_ABI_V3
	} else if (version == 'v4') {
		PEANUT_ABI = PEANUT_ABI_V4
	} else {
		throw new Error('Invalid version')
	}

	const info: { [key: string]: any } = PEANUT_CONTRACTS[String(chainId) as keyof typeof PEANUT_CONTRACTS]
	const contractAddress = info[version as keyof typeof info]
	const contract = new ethers.Contract(contractAddress, PEANUT_ABI, signerOrProvider)
	// connected to contracv
	verbose && console.log('Connected to contract ', version, ' on chain ', chainId, ' at ', contractAddress)
	return contract
	// TODO: return class
}

async function getAllowance(signer: any, _chainId: number | string, tokenContract: any, spender: string) {
	let allowance
	try {
		const address = await signer.getAddress()
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
	signer: any,
	chainId: number | string,
	tokenAddress: string,
	amount: number | string,
	tokenDecimals = 18,
	isRawAmount = false,
	contractVersion = DEFAULT_CONTRACT_VERSION,
	verbose = true
) {
	/*  Approves the contract to spend the specified amount of tokens   */
	signer = await getAbstractSigner(signer)

	const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
	if (amount == -1) {
		// if amount is -1, approve infinite amount
		amount = Number(ethers.constants.MaxUint256)
	}
	const info: { [key: string]: any } = PEANUT_CONTRACTS[String(chainId) as keyof typeof PEANUT_CONTRACTS]
	const spender = info[contractVersion as keyof typeof info]
	let allowance = await getAllowance(signer, chainId, tokenContract, spender)
	// convert amount to BigInt and compare to allowance

	if (isRawAmount) {
		amount = amount
	} else {
		amount = Number(ethers.utils.parseUnits(amount.toString(), tokenDecimals))
	}
	if (allowance >= amount) {
		console.log('Allowance already enough, no need to approve more')
		return { allowance, txReceipt: null }
	} else {
		console.log('Allowance only', allowance.toString(), ', need ' + amount.toString() + ', approving...')
		const txOptions = await setFeeOptions({ verbose, provider: signer.provider, eip1559: true })
		const tx = await tokenContract.approve(spender, amount, txOptions)
		const txReceipt = await tx.wait()
		allowance = await getAllowance(signer, chainId, tokenContract, spender)
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
	// gasPrice = null,
	gasPriceMultiplier = 1.2,
	maxPriorityFeePerGas = null,
	maxPriorityFeePerGasMultiplier = 2,
	verbose = false,
}: any = {}) {
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
	const chainId = await provider.getNetwork().then((network: any) => network.chainId)
	if (chainId == 137) {
		maxPriorityFeePerGas = ethers.utils.parseUnits('30', 'gwei')
		verbose && console.log('Setting maxPriorityFeePerGas to 30 gwei')
	}

	if (eip1559) {
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
	} else {
		let gasPrice = BigInt(0)
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

async function estimateGasLimit(contract: any, functionName: string, params: any, txOptions: any) {
	try {
		const estimatedGas = await contract.estimateGas[functionName](...params, txOptions)
		return BigInt(Math.floor(Number(estimatedGas) * 1.1)) // safety margin
	} catch (error) {
		console.error(`Error estimating gas for ${functionName}:`, error)
		return null
	}
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
	nonce = null,
}: createLinkProp) {
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

	signer = await getAbstractSigner(signer)

	if (tokenAddress == null) {
		tokenAddress = '0x0000000000000000000000000000000000000000'
		if (tokenType != 0) {
			throw new Error('tokenAddress is null but tokenType is not 0')
		}
	}
	// convert tokenAmount to appropriate unit
	// tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals); // v6
	tokenAmount = Number(ethers.utils.parseUnits(tokenAmount.toString(), tokenDecimals)) // v5

	// if native token (tokentype == 0), add value to txOptions
	let txOptions: any = {}
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
		const res = await approveSpendERC20(
			signer,
			chainId,
			tokenAddress,
			tokenAmount,
			tokenDecimals,
			true,
			contractVersion
		)
		verbose && console.log('allowance: ', res.allowance, ' tokenAmount: ', tokenAmount)
		if (res.allowance < tokenAmount) {
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
		const tempDeposits = JSON.parse(localStorage.getItem('tempDeposits') ?? '') || []
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

	const tx = await contract.makeDeposit(...depositParams, txOptions)

	console.log('submitted tx: ', tx.hash)

	// now we need the deposit index from the tx receipt
	const txReceipt = await tx.wait()
	const depositIdx = getDepositIdx(txReceipt, chainId)
	verbose && console.log('Deposit finalized. Deposit index: ', depositIdx)

	// now we can create the link
	const link = getLinkFromParams(chainId, parseInt(contractVersion), depositIdx, password, baseUrl, trackId)
	verbose && console.log('created link: ', link)
	// return the link and the tx receipt
	return { link, txReceipt }
}

/**
 * Checks if a link has been claimed
 *
 * @param {Object} options - An object containing the signer and link to check
 * @returns {Object} - An object containing whether the link has been claimed and the deposit
 */
export async function getLinkStatus({ signer, link }: { signer: any; link: string }) {
	/* checks if a link has been claimed */
	assert(signer, 'signer arg is required')
	assert(link, 'link arg is required')

	signer = await getAbstractSigner(signer)

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion ?? ''
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
	recipientProp = null,
	verbose = false,
	maxFeePerGas = null,
	maxPriorityFeePerGas = null,
	gasLimit = null,
	eip1559 = true,
}: {
	signer: any
	link: string
	recipientProp?: string | null
	verbose?: boolean
	maxFeePerGas?: any
	maxPriorityFeePerGas?: any
	gasLimit?: any
	eip1559?: boolean
}) {
	// claims the contents of a link
	assert(signer, 'signer arg is required')
	assert(link, 'link arg is required')

	signer = await getAbstractSigner(signer)

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion ?? ''
	const depositIdx = params.depositIdx
	const password = params.password ?? ''
	const recipient = recipientProp === null ? await signer.getAddress() : recipientProp
	if (recipientProp == null) {
		verbose && console.log('recipient not provided, using signer address: ', recipient)
	}
	const keys = generateKeysFromString(password) // deterministically generate keys from password
	const contract = await getContract(chainId, signer, contractVersion)

	// cryptography
	const addressHash = solidityHashAddress(recipient)
	const addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
	const addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	const signature = await signAddress(recipient, keys.privateKey) // sign with link keys

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
}: {
	signer: any
	chainId: number | string
	contractVersion?: string
	verbose?: boolean
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
			const deposit = await contract.deposits(i)
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
// not implemented
/*
export async function claimLinkSender({
	signer,
	link,
	verbose = false,
}: {
	signer: any
	link: string
	verbose: boolean
}) {
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
*/

async function createClaimPayload(link: string, recipientAddress: string) {
	/* internal utility function to create the payload for claiming a link */
	const params = getParamsFromLink(link)
	// const chainId = params.chainId
	const password = params.password ?? ''
	const keys = generateKeysFromString(password) // deterministically generate keys from password

	// cryptography
	const addressHash = solidityHashAddress(recipientAddress)
	// var addressHashBinary = ethers.getBytes(addressHash); // v6
	const addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	const addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	const signature = await signAddress(recipientAddress, keys.privateKey) // sign with link keys

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
 * @param {Object} signerOrProvider - The signer or provider to use
 * @param {string} link - The link to get the details of
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {Object} - An object containing the link details
 */
export async function getLinkDetails(signerOrProvider: any, link: string, verbose = false) {
	/**
	 * Gets the details of a Link: what token it is, how much it holds, etc.
	 */
	verbose && console.log('getLinkDetails called with link: ', link)
	assert(signerOrProvider, 'signerOrProvider arg is required')
	assert(link, 'link arg is required')

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion ?? ''
	const depositIdx = params.depositIdx
	const password = params.password
	const contract = await getContract(chainId, signerOrProvider, contractVersion)

	const deposit = await contract.deposits(depositIdx)
	let tokenAddress = deposit.tokenAddress
	verbose && console.log('fetched deposit: ', deposit)

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
		// tokenPrice: tokenPrice
	}
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
	link: string,
	recipientAddress: string,
	apiKey: string,
	verbose = false,
	url = 'https://api.peanut.to/claim'
) {
	console.log('claiming link through Peanut API...')
	verbose && console.log('link: ', link, ' recipientAddress: ', recipientAddress, ' apiKey: ', apiKey, ' url: ', url)
	const payload = await createClaimPayload(link, recipientAddress)
	verbose && console.log('payload: ', payload)
	//  url = "https://api.peanut.to/claim";
	if (url == 'local') {
		console.log('using local api')
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
	getLinkStatus,
	getLinkDetails,
	getParamsFromLink,
	getParamsFromPageURL,
	getLinkFromParams,
	createLink,
	// createLinks,
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

export default peanut
export { peanut }
