////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. This library is compatible with ethers v5, and
//  supports both node and browser environments.
//
/////////////////////////////////////////////////////////

import { BigNumber, ethers } from 'ethersv5' // v5
import 'isomorphic-fetch' // isomorphic-fetch is a library that implements fetch in node.js and the browser
import {
	PEANUT_ABI_V3,
	PEANUT_ABI_V4,
	PEANUT_BATCHER_ABI_V4,
	PEANUT_CONTRACTS,
	ERC20_ABI,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	VERSION,
	DEFAULT_CONTRACT_VERSION,
	FALLBACK_CONTRACT_VERSION,
	DEFAULT_BATCHER_VERSION,
	TOKEN_TYPES,
} from './data.ts'

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
} from './util.ts'

import * as interfaces from './consts/interfaces.consts.ts'
import {
	// IPeanutSigner,
	ICreateLinkParams,
	IPrepareCreateTxsResponse,
	ISignAndSubmitTxParams,
	IClaimLinkParams,
	IGetLinkDetailsParams,
} from './consts/interfaces.consts.ts'

async function getAbstractSigner(signer: any) {
	// TODO: create abstract signer class that is compatible with ethers v5, v6, viem, web3js
	return signer
}

async function checkRpc(rpc: string, verbose = false) {
	try {
		verbose && console.log('Checking provider:', rpc)
		const provider = new ethers.providers.JsonRpcProvider(rpc)
		verbose && console.log('provider blocknumber:', await provider.getBlockNumber())
		return true
	} catch (error) {
		verbose && console.error('Error checking provider:', rpc)
		return false
	}
}
/**
 * Returns the default provider for a given chainId
 */
export async function getDefaultProvider(chainId: string, verbose = false) {
	verbose && console.log('Getting default provider for chainId ', chainId)
	chainId = String(chainId)
	const rpcs = CHAIN_DETAILS[chainId as keyof typeof CHAIN_DETAILS].rpc

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

export async function getContract(
	_chainId: string,
	signerOrProvider: any,
	version = DEFAULT_CONTRACT_VERSION,
	verbose = true
) {
	if (signerOrProvider == null) {
		verbose && console.log('signerOrProvider is null, getting default provider...')
		signerOrProvider = await getDefaultProvider(_chainId, verbose)
	}

	const chainId = parseInt(_chainId)

	// Determine which ABI version to use based on the version provided
	let PEANUT_ABI
	switch (version) {
		case 'v3':
			PEANUT_ABI = PEANUT_ABI_V3
			break
		case 'v4':
			PEANUT_ABI = PEANUT_ABI_V4
			break
		case 'Bv4':
			PEANUT_ABI = PEANUT_BATCHER_ABI_V4
			break
		default:
			throw new Error('Invalid version')
	}

	// Find the contract address based on the chainId and version provided
	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const contractAddress = _PEANUT_CONTRACTS[chainId.toString()] && _PEANUT_CONTRACTS[chainId.toString()][version]

	// If the contract address is not found, throw an error
	if (!contractAddress) {
		throw new Error(`Contract ${version} not deployed on chain ${chainId}`)
	}

	const contract = new ethers.Contract(contractAddress, PEANUT_ABI, signerOrProvider)

	verbose && console.log(`Connected to contract ${version} on chain ${chainId} at ${contractAddress}`)

	return contract
	// TODO: return class
}

async function getAllowance(
	signer: ethers.providers.JsonRpcSigner,
	tokenContract: any,
	spender: any,
	address: string = '',
	verbose = false
) {
	let allowance
	try {
		address = address || (await signer.getAddress())
		verbose &&
			console.log('calling contract allowance function for address ', address, ' and spender ', spender, '...')
		allowance = await tokenContract.allowance(address, spender)
		verbose && console.log('allowance: ', allowance)
	} catch (error) {
		console.error('Error fetching allowance:', error)
	}
	return allowance
}

export async function approveSpendERC20(
	signer: ethers.providers.JsonRpcSigner,
	chainId: string,
	tokenAddress: string,
	_amount: number | BigNumber,
	tokenDecimals = 18,
	isRawAmount = false,
	contractVersion = DEFAULT_CONTRACT_VERSION
) {
	/* Approves the contract to spend the specified amount of tokens */
	signer = await getAbstractSigner(signer)
	const signerAddress = await signer.getAddress()

	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = _PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion]
	if (!spender) throw new Error('Spender address not found for the given chain and contract version')

	const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
	let allowance = await getAllowance(signer, tokenContract, spender, signerAddress)

	const txDetails = await prepareApproveERC20Tx(
		chainId,
		tokenAddress,
		spender,
		_amount,
		tokenDecimals,
		isRawAmount,
		contractVersion
	)

	if (!allowance.gte(txDetails.value)) {
		const txOptions = await setFeeOptions({ provider: signer.provider, eip1559: true })
		const tx = await signer.sendTransaction({ ...txDetails, ...txOptions })
		const txReceipt = await tx.wait()
		allowance = await getAllowance(signer, tokenContract, spender, signerAddress)
		return { allowance, txReceipt }
	} else {
		console.log('Allowance already enough, no need to approve more (allowance: ' + allowance.toString() + ')')
		return { allowance, txReceipt: null }
	}
}

export async function prepareApproveERC20Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	spenderAddress: string | undefined,
	_amount: number | BigNumber,
	tokenDecimals = 18,
	isRawAmount = false,
	contractVersion = DEFAULT_CONTRACT_VERSION
) {
	const defaultProvider = await getDefaultProvider(chainId)
	const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, defaultProvider)

	let amount: BigNumber | number = _amount
	if (_amount == -1) {
		// if amount is -1, approve infinite amount
		amount = ethers.constants.MaxUint256
	}

	if (!isRawAmount) {
		amount = ethers.utils.parseUnits(amount.toString(), tokenDecimals)
	}

	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	if (!spender) {
		throw new Error('Spender address not found for the given chain and contract version')
	}

	const tx = tokenContract.populateTransaction.approve(spender, amount)
	return tx
}

async function setFeeOptions({
	txOptions,
	provider,
	eip1559 = true, // provide a default value
	maxFeePerGas = null,
	maxFeePerGasMultiplier = 1.1,
	gasLimit = null,
	gasPrice = null,
	gasPriceMultiplier = 1.2,
	maxPriorityFeePerGas, // don't provide a default value here
	maxPriorityFeePerGasMultiplier = 2,
}: {
	txOptions?: any
	provider: any
	eip1559?: boolean
	maxFeePerGas?: number | null
	maxFeePerGasMultiplier?: number
	gasLimit?: number | null
	gasPrice?: number | null
	gasPriceMultiplier?: number
	maxPriorityFeePerGas?: number | BigNumber | null // change this to number | null
	maxPriorityFeePerGasMultiplier?: number
	verbose?: boolean
}) {
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
	const chainId = await provider.getNetwork().then((network: any) => network.chainId)
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
		if (gasPrice) {
			txOptions.gasPrice = gasPrice
		} else if (txOptions.gasPrice) {
			gasPrice = txOptions.gasPrice
		} else if (feeData.gasPrice != null) {
			txOptions.gasPrice = feeData.gasPrice.toString()
			gasPrice = BigInt(feeData.gasPrice.toString())
		}
		const proposedGasPrice = gasPrice && (gasPrice * BigInt(Math.round(gasPriceMultiplier * 10))) / BigInt(10)
		txOptions.gasPrice = proposedGasPrice && proposedGasPrice.toString()
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

function formatNumberAvoidScientific(n: number) {
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
function trim_decimal_overflow(_n: number, decimals: number) {
	let n = formatNumberAvoidScientific(_n)
	n += ''

	if (n.indexOf('.') === -1) return n

	const arr = n.split('.')
	const fraction = arr[1].substr(0, decimals)
	return arr[0] + '.' + fraction
}

/**
 * Returns an array of transactions necessary to create a link (e.g. 1. approve, 2. makeDeposit)
 * all values obligatory
 */
export async function prepareTxs({
	structSigner,
	linkDetails,
	peanutContractVersion = 'v4',
}: ICreateLinkParams): Promise<IPrepareCreateTxsResponse> {
	linkDetails = validateLinkDetails(linkDetails)

	let txOptions: interfaces.ITxOptions = {}
	txOptions.nonce = structSigner.nonce || (await structSigner.signer.getTransactionCount())

	// TODO: q: linkDetails interface has some optional params. but prepareTxs (should) assume everth is provided.
	//  So should we create a new interface?
	const tokenAmountString = trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
	const tokenAmountBignum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals) // v5
	assert(tokenAmountBignum.gt(0), 'tokenAmount must be greater than 0')
	if (linkDetails.tokenType == 0) {
		txOptions = {
			...txOptions,
			value: tokenAmountBignum,
		}
	} else if (linkDetails.tokenType == 1) {
		// check allowance
		// TODO: check for erc721 and erc1155
		console.log('checking allowance...')
		// if token is erc20, check allowance
		// TODO: prepare tx
		// TODO: there should be a version of this without signer. It makes no sense to have this fn if it takes in a signer. that's dumb. the types are dumb.
		prepareApproveERC20Tx
		// const allowance = await approveSpendERC20(
		// 	structSigner.signer,
		// 	String(linkDetails.chainId),
		// 	linkDetails.tokenAddress!,
		// 	tokenAmountBignum,
		// 	linkDetails.tokenDecimals,
		// 	true,
		// 	peanutContractVersion
		// )
		// console.log('allowance: ', allowance, ' tokenAmount: ', tokenAmountBignum)
		if (allowance.lt(tokenAmountBignum)) {
			throw new Error('Allowance not enough')
		}
	}

	if (linkDetails.password == null || linkDetails.password == '') {
		// if no password is provided, generate a random one
		linkDetails.password = getRandomString(16)
	}

	const keys = generateKeysFromString(linkDetails.password) // deterministically generate keys from password
	const contract = await getContract(String(linkDetails.chainId), structSigner.signer, peanutContractVersion) // get the contract instance

	console.log('Generating link...')

	// set transaction options
	txOptions = await setFeeOptions({
		txOptions,
		provider: structSigner.signer.provider,
		eip1559: structSigner.eip1559,
		maxFeePerGas: structSigner.maxFeePerGas,
		maxPriorityFeePerGas: structSigner.maxPriorityFeePerGas,
		gasLimit: structSigner.gasLimit,
	})

	const depositParams = [
		linkDetails.tokenAddress,
		linkDetails.tokenType,
		tokenAmountBignum,
		linkDetails.tokenId,
		keys.address,
	]
	if (!txOptions.gasLimit) {
		const estimatedGasLimit = await estimateGasLimit(contract, 'makeDeposit', depositParams, txOptions)
		if (estimatedGasLimit) {
			txOptions.gasLimit = ethers.BigNumber.from(estimatedGasLimit.toString())
		}
	}

	return
	const signer = structSigner.signer
	const recipientAddress = await signer.getAddress()
	const contract = await getContract(linkDetails.chainId.toString(), signer, peanutContractVersion)
	const depositParams = [
		linkDetails.tokenAddress,
		linkDetails.tokenType,
		linkDetails.tokenAmount,
		linkDetails.tokenId,
		recipientAddress,
	]
	const gasLimit = await contract.estimateGas.makeDeposit(...depositParams)
	const gasPrice = await signer.getGasPrice()
	const nonce = structSigner.nonce || (await signer.getTransactionCount())
	const unsignedTxs = depositParams.map((param) =>
		contract.populateTransaction.makeDeposit(...param, { gasLimit, gasPrice, nonce })
	)
	return { success: { success: true }, unsignedTxs }
}

export async function signAndSubmitTx({ structSigner, unsignedTx }: ISignAndSubmitTxParams): Promise<IClaimLinkParams> {
	const signer = structSigner.signer
	const signedTx = await signer.signTransaction(unsignedTx)
	const tx = await signer.sendTransaction(signedTx)
	const txReceipt = await tx.wait()
	return { structSigner, link: txReceipt.transactionHash }
}

export async function getLinkFromTx({ linkDetails, txHash }: IGetLinkDetailsParams): Promise<string> {
	const txReceipt = await getTxReceiptFromHash(txHash, linkDetails.chainId)
	// TODO: get contract version & idx from tx receipt
	// map from json

	return getLinkFromParams(
		linkDetails.chainId,
		params.contractVersion,
		params.depositIdx,
		linkDetails.password,
		linkDetails.baseUrl,
		linkDetails.trackId
	)
}

async function getTxReceiptFromHash(txHash: string, chainId: number, signerOrProvider?: any): Promise<any> {
	const provider = signerOrProvider || getDefaultProvider(String(chainId))
	const txReceipt = await provider.getTransactionReceipt(txHash)
	return txReceipt
}

function validateLinkDetails(linkDetails: interfaces.IPeanutLinkDetails): Required<interfaces.IPeanutLinkDetails> {
	if (!linkDetails || !linkDetails.chainId || !linkDetails.tokenAmount) {
		throw new Error('createLink function requires linkDetails object with chainId and tokenAmount properties')
	}

	// Assert that linkDetails conforms to IPeanutLinkDetails
	linkDetails = linkDetails as interfaces.IPeanutLinkDetails

	// Use nullish coalescing operator to provide default values
	linkDetails.tokenAddress = linkDetails.tokenAddress ?? '0x0000000000000000000000000000000000000000'
	linkDetails.tokenType = linkDetails.tokenType ?? 0
	linkDetails.tokenId = linkDetails.tokenId ?? 0
	linkDetails.tokenDecimals = linkDetails.tokenDecimals ?? 18
	linkDetails.password = linkDetails.password ?? ''
	linkDetails.baseUrl = linkDetails.baseUrl ?? 'https://peanut.to/claim'
	linkDetails.trackId = linkDetails.trackId ?? 'sdk'

	assert(
		linkDetails.tokenType == 0 || linkDetails.tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-ETH tokens'
	)
	assert(linkDetails.tokenType == 0 || linkDetails.tokenType == 1, 'ERC721 and ERC1155 are not supported yet')
	assert(
		!(linkDetails.tokenType == 1 || linkDetails.tokenType == 3) || linkDetails.tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
	)

	if (linkDetails.tokenType !== 0 && linkDetails.tokenAddress === '0x0000000000000000000000000000000000000000') {
		throw new Error('need to provide tokenAddress if tokenType is not 0')
	}

	return linkDetails
}

/**
 * Generates a link with the specified parameters
 */
export async function createLink({
	structSigner,
	linkDetails,
	peanutContractVersion = DEFAULT_CONTRACT_VERSION,
}: interfaces.ICreateLinkParams): Promise<interfaces.ICreateLinkResponse> {
	// validate linkDetails
	linkDetails = validateLinkDetails(linkDetails)

	// check if contractVersion exists
	if (!PEANUT_CONTRACTS[String(linkDetails.chainId)][peanutContractVersion]) {
		// if not, use fallback contract version if it is not null or false, else throw error
		// if (fallBackPeanutContractVersion) {
		// 	peanutContractVersion = fallBackPeanutContractVersion
		// 	console.warn(
		// 		'WARNING: Contract version ' + peanutContractVersion + ' not deployed on chain ' + chainId,
		// 		'Using fallback contract version ' + fallBackPeanutContractVersion
		// 	)
		// } else {
		// 	throw new Error('Contract version ' + peanutContractVersion + ' not deployed on chain ' + chainId)
		// }
		throw new Error('Contract version ' + peanutContractVersion + ' not deployed on chain ' + linkDetails.chainId)
	}

	// signer = await getAbstractSigner(signer)

	// limit tokenAmount to 18 decimals
	// if (typeof tokenAmount == 'string' || tokenAmount instanceof String) {
	// 	tokenAmount = parseFloat(tokenAmount)
	// }
	// tokenAmount = tokenAmount.toFixed(18)
	const tokenAmountString = trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals)
	const tokenAmountBignum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals) // v5
	assert(tokenAmountBignum.gt(0), 'tokenAmount must be greater than 0')

	// if native token (tokentype == 0), add value to txOptions
	let txOptions: interfaces.ITxOptions = {}
	// set nonce
	// nonce = nonce || (await signer.getNonce()); // v6
	structSigner.nonce = structSigner.nonce || (await structSigner.signer.getTransactionCount()) // v5
	txOptions.nonce = structSigner.nonce
	if (linkDetails.tokenType == 0) {
		txOptions = {
			...txOptions,
			value: tokenAmountBignum,
		}
	} else if (linkDetails.tokenType == 1) {
		// check allowance
		// TODO: check for erc721 and erc1155
		console.log('checking allowance...')
		// if token is erc20, check allowance
		const allowance = await approveSpendERC20(
			structSigner.signer,
			String(linkDetails.chainId),
			linkDetails.tokenAddress,
			tokenAmountBignum,
			linkDetails.tokenDecimals,
			true,
			peanutContractVersion
		)
		console.log('allowance: ', allowance, ' tokenAmount: ', tokenAmountBignum)
		if (allowance.allowance.lt(tokenAmountBignum)) {
			throw new Error('Allowance not enough')
		}
	}

	if (linkDetails.password == null || linkDetails.password == '') {
		// if no password is provided, generate a random one
		linkDetails.password = getRandomString(16)
	}

	const keys = generateKeysFromString(linkDetails.password) // deterministically generate keys from password
	const contract = await getContract(String(linkDetails.chainId), structSigner.signer, peanutContractVersion) // get the contract instance

	console.log('Generating link...')

	// set transaction options
	txOptions = await setFeeOptions({
		txOptions,
		provider: structSigner.signer.provider,
		eip1559: structSigner.eip1559,
		maxFeePerGas: structSigner.maxFeePerGas,
		maxPriorityFeePerGas: structSigner.maxPriorityFeePerGas,
		gasLimit: structSigner.gasLimit,
	})

	const depositParams = [
		linkDetails.tokenAddress,
		linkDetails.tokenType,
		tokenAmountBignum,
		linkDetails.tokenId,
		keys.address,
	]
	if (!txOptions.gasLimit) {
		const estimatedGasLimit = await estimateGasLimit(contract, 'makeDeposit', depositParams, txOptions)
		if (estimatedGasLimit) {
			txOptions.gasLimit = ethers.BigNumber.from(estimatedGasLimit.toString())
		}
	}
	console.log('final txOptions: ', txOptions)
	// const depositParams = [tokenAddress, tokenType, tokenAmount, tokenId, keys.address, txOptions];
	console.log('depositParams: ', depositParams)

	// store in localstorage in case tx falls through (only if in web environment)
	// TODO: refactor in future
	if (typeof window !== 'undefined') {
		const tempDeposits = JSON.parse(localStorage.getItem('tempDeposits') || '[]')
		const tempDeposit = {
			chain: linkDetails.chainId,
			tokenAmount: tokenAmountBignum,
			contractType: linkDetails.tokenType,
			peanutContractVersion: peanutContractVersion,
			tokenAddress: linkDetails.tokenAddress,
			password: linkDetails.password,
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
	const depositIdx = getDepositIdx(txReceipt, String(linkDetails.chainId), peanutContractVersion)
	console.log('Deposit finalized. Deposit index: ', depositIdx)

	// now we can create the link
	const link = getLinkFromParams(
		linkDetails.chainId,
		peanutContractVersion,
		depositIdx,
		linkDetails.password,
		linkDetails.baseUrl,
		linkDetails.trackId
	)

	console.log('created link: ', link)

	const response: interfaces.ICreateLinkResponse = {
		createdLink: { link: link, txHash: tx.hash },
		success: { success: true },
	}

	return response
}

export async function createLinks({
	structSigner,
	linkDetails,
	numberOfLinks = 2,
	peanutContractVersion = DEFAULT_CONTRACT_VERSION,
}: interfaces.ICreateLinksParams): Promise<interfaces.ICreateLinksResponse> {
	if (!structSigner || !structSigner.signer) {
		throw new Error('createLinks function requires a structSigner object with a signer property')
	}
	if (!linkDetails || !linkDetails.chainId || !linkDetails.tokenAmount) {
		throw new Error('createLinks function requires linkDetails object with chainId and tokenAmount properties')
	}

	// Assert that linkDetails conforms to IPeanutLinkDetails
	linkDetails = linkDetails as interfaces.IPeanutLinkDetails

	// Use nullish coalescing operator to provide default values
	linkDetails.tokenAddress = linkDetails.tokenAddress ?? '0x0000000000000000000000000000000000000000'
	linkDetails.tokenType = linkDetails.tokenType ?? 0
	linkDetails.tokenId = linkDetails.tokenId ?? 0
	linkDetails.tokenDecimals = linkDetails.tokenDecimals ?? 18
	linkDetails.password = linkDetails.password ?? ''
	linkDetails.baseUrl = linkDetails.baseUrl ?? 'https://peanut.to/claim'
	linkDetails.trackId = linkDetails.trackId ?? 'sdk'
	const batcherContractVersion: string = DEFAULT_BATCHER_VERSION

	assert(
		linkDetails.tokenType == 0 || linkDetails.tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-ETH tokens'
	)
	assert(linkDetails.tokenType == 0 || linkDetails.tokenType == 1, 'ERC721 and ERC1155 are not supported yet')
	assert(
		!(linkDetails.tokenType == 1 || linkDetails.tokenType == 3) || linkDetails.tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
	)

	const tokenAmountString = trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals)
	assert(tokenAmountBigNum.gt(0), 'tokenAmount must be greater than 0')
	const totalTokenAmount = tokenAmountBigNum.mul(ethers.BigNumber.from(numberOfLinks.toString()))

	// Get the batcher Contract
	const batcherContract = await getContract(String(linkDetails.chainId), structSigner.signer, batcherContractVersion)

	// Determine the pubKeys from the passwords
	const passwords = Array.from({ length: numberOfLinks }, () => getRandomString(16))
	const pubKeys = passwords.map((password) => generateKeysFromString(password).address)

	// If the token is ERC20, approve the contract to spend tokens
	if (linkDetails.tokenType === 1) {
		console.log('Checking && requesting approval of a total of ', totalTokenAmount, ' tokens')
		const { allowance } = await approveSpendERC20(
			structSigner.signer,
			String(linkDetails.chainId),
			linkDetails.tokenAddress,
			totalTokenAmount,
			linkDetails.tokenDecimals,
			true,
			batcherContractVersion
		)
		console.log('Allowance: ', allowance)
	}

	// Set transaction options
	let txOptions: interfaces.ITxOptions = {}
	const nonce = structSigner.nonce || (await structSigner.signer.getTransactionCount())
	txOptions.nonce = nonce
	if (linkDetails.tokenType == 0) {
		txOptions = {
			...txOptions,
			value: tokenAmountBigNum.mul(ethers.BigNumber.from(numberOfLinks.toString())),
		}
	}

	txOptions = await setFeeOptions({
		txOptions,
		provider: structSigner.signer.provider,
		eip1559: structSigner.eip1559,
		maxFeePerGas: structSigner.maxFeePerGas,
		maxPriorityFeePerGas: structSigner.maxPriorityFeePerGas,
		gasLimit: structSigner.gasLimit,
	})

	// Make the batch deposit (amount of deposits is determined by length of pubKeys). tokenAmount is for each individual deposit
	const depositParams = [
		PEANUT_CONTRACTS[String(linkDetails.chainId)][batcherContractVersion], // The address of the PeanutV4 contract
		linkDetails.tokenAddress,
		linkDetails.tokenType,
		tokenAmountBigNum,
		linkDetails.tokenId,
		pubKeys,
	]
	console.log('depositParams: ', depositParams)

	if (!txOptions.gasLimit) {
		const estimatedGasLimit = await estimateGasLimit(batcherContract, 'batchMakeDeposit', depositParams, txOptions)
		if (estimatedGasLimit) {
			txOptions.gasLimit = ethers.BigNumber.from(estimatedGasLimit.toString())
		}
	}

	const tx = await batcherContract.batchMakeDeposit(...depositParams, txOptions)
	console.log('submitted tx: ', tx.hash)

	// Wait for the transaction to be mined and get the receipt
	const txReceipt = await tx.wait()
	const txHash = txReceipt.transactionHash

	// Extract the deposit indices from the transaction receipt
	const depositIdxs = getDepositIdxs(txReceipt, linkDetails.chainId, peanutContractVersion)

	// Generate the links based on the deposit indices
	const links: interfaces.ICreatedPeanutLink[] = depositIdxs.map((depositIdx, i) => {
		const link = getLinkFromParams(
			linkDetails.chainId,
			peanutContractVersion,
			depositIdx,
			passwords[i],
			linkDetails.baseUrl,
			linkDetails.trackId
		)
		return {
			link: link,
			txHash: txHash,
		}
	})

	const response: interfaces.ICreateLinksResponse = {
		createdLinks: links,
		success: { success: true },
	}

	return response
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
	const addressHash = solidityHashAddress(recipient)
	const addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
	const addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	const signature = signAddress(recipient, keys.privateKey) // sign with link keys

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
}: {
	signer: ethers.providers.JsonRpcSigner
	chainId: string
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
export async function claimLinkSender({
	signer,
	link,
	verbose = false,
}: {
	signer: ethers.providers.JsonRpcSigner
	link: string
	verbose?: boolean
}) {
	// raise error, not implemented yet
	throw new Error('Not implemented yet')
	// assert(signer, 'signer arg is required')
	// assert(link, 'link arg is required')

	// signer = await getAbstractSigner(signer)

	// const params = getParamsFromLink(link)
	// const chainId = params.chainId
	// const contractVersion = params.contractVersion
	// const depositIdx = params.depositIdx
	// const password = params.password
	// if (recipient == null) {
	// 	recipient = await signer.getAddress()

	// 	verbose && console.log('recipient not provided, using signer address: ', recipient)
	// }
	// const keys = generateKeysFromString(password) // deterministically generate keys from password
	// const contract = await getContract(chainId, signer, contractVersion)

	// // cryptography
	// var addressHash = solidityHashAddress(recipient)
	// // var addressHashBinary = ethers.getBytes(addressHash); // v6
	// var addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	// verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
	// var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	// var signature = await signAddress(recipient, keys.privateKey) // sign with link keys

	// if (verbose) {
	// 	// print the params
	// 	console.log('params: ', params)
	// 	console.log('addressHash: ', addressHash)
	// 	console.log('addressHashEIP191: ', addressHashEIP191)
	// 	console.log('signature: ', signature)
	// }

	// // TODO: use createClaimPayload instead

	// // withdraw the deposit
	// // address hash is hash(prefix + hash(address))
	// const tx = await contract.withdrawDeposit(depositIdx, recipient, addressHashEIP191, signature)
	// console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	// const txReceipt = await tx.wait()

	// return txReceipt
}

async function createClaimPayload(link: string, recipientAddress: string) {
	/* internal utility function to create the payload for claiming a link */
	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const password = params.password
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
 * @param {Object|null} signerOrProvider - The signer or provider to use. if not provided, will use fallback public provider
 * @param {string} link - The link to get the details of
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {Object} - An object containing the link details
 */
export async function getLinkDetails({ RPCProvider, link }: interfaces.IGetLinkDetailsParams) {
	const verbose = false // TODO: move this to initializing the SDK
	verbose && console.log('getLinkDetails called with link: ', link)
	assert(link, 'link arg is required')

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	const contract = await getContract(chainId.toString(), RPCProvider, contractVersion, verbose)

	verbose && console.log('fetching deposit: ', depositIdx)
	const deposit = await contract.deposits(depositIdx)
	// const deposit = await contract.getDeposit(depositIdx)
	console.log('deposit: ', deposit)
	verbose && console.log('fetched deposit: ', deposit)
	let tokenAddress = deposit.tokenAddress

	let claimed = false
	if (deposit.pubKey20 == '0x0000000000000000000000000000000000000000') {
		claimed = true
	}

	// get date of deposit (only possible in V4 links)
	let depositDate
	if (['v4', 'v5'].includes(contractVersion)) {
		if (deposit.timestamp) {
			depositDate = new Date(deposit.timestamp * 1000)
			if (deposit.timestamp == 0) {
				depositDate = null // for deleted deposits (TODO: we'd like to keep this in the future contract versions)
			}
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
export async function claimLinkGasless({
	link,
	recipientAddress,
	APIKey,
	baseUrl = 'https://api.peanut.to/claim',
}: interfaces.IClaimLinkGaslessParams) {
	const verbose = true
	console.log('claiming link through Peanut API...')
	verbose &&
		console.log('link: ', link, ' recipientAddress: ', recipientAddress, ' apiKey: ', APIKey, ' url: ', baseUrl)
	const payload = await createClaimPayload(link, recipientAddress)
	verbose && console.log('payload: ', payload)
	//  url = "https://api.peanut.to/claim";
	if (baseUrl == 'local') {
		verbose && console.log('using local api')
		baseUrl = 'http://127.0.0.1:5001/claim'
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
		api_key: APIKey,
	}

	// if axios error, return the error message

	const response = await fetch(baseUrl, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})

	verbose && console.log('response status: ', response.status)

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
