////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. This library is compatible with ethers v5, and
//  supports both node and browser environments.
//
/////////////////////////////////////////////////////////

import { BigNumber, ethers } from 'ethersv5' // v5
import { TransactionReceipt } from '@ethersproject/abstract-provider'

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

// async function getAbstractSigner(signer: any) {
// 	// TODO: create abstract signer class that is compatible with ethers v5, v6, viem, web3js
// 	return signer
// }

function timeout(ms: number, promise: Promise<any>) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timed out after ${ms} ms`))
		}, ms)

		promise
			.then((value) => {
				clearTimeout(timer)
				resolve(value)
			})
			.catch((err) => {
				clearTimeout(timer)
				reject(err)
			})
	})
}

async function checkRpc(rpc: string): Promise<boolean> {
	console.log('checkRpc rpc:', rpc)

	try {
		const provider = new ethers.providers.JsonRpcProvider(rpc)
		await timeout(
			2000,
			new Promise((resolve, reject) => {
				provider.ready // added this, it hangs forever
				provider.getBalance('0x0000000000000000000000000000000000000000').then(resolve).catch(reject)
			})
		)
		return true
	} catch (error) {
		console.log('Error checking provider:', rpc, 'Error:', error)
		return false
	}
}

/**
 * Returns the default provider for a given chainId
 */
async function getDefaultProvider(chainId: string, verbose = false) {
	verbose && console.log('Getting default provider for chainId ', chainId)
	const rpcs = CHAIN_DETAILS[chainId as keyof typeof CHAIN_DETAILS].rpc

	verbose && console.log('rpcs', rpcs)

	let i = 0
	while (i < rpcs.length) {
		let rpc = rpcs[i]

		// Skip if the rpc string contains '${'
		// if (rpc.includes('${')) continue
		rpc = rpc.replace('${INFURA_API_KEY}', '4478656478ab4945a1b013fb1d8f20fd') // for workshop

		verbose && console.log('Checking rpc', rpc)

		const isRpcValid = await checkRpc(rpc)
		if (isRpcValid) {
			return new ethers.providers.JsonRpcProvider(rpc)
		} else {
			verbose && console.log('Provider is down:', rpc)
		}

		i++ // Move to the next rpc in the list.
	}

	throw new Error('No alive provider found for chainId ' + chainId)

	// for (let i = 0; i < rpcs.length; i++) {
	// 	let rpc = rpcs[i]

	// 	// Skip if the rpc string contains '${'
	// 	// if (rpc.includes('${')) continue
	// 	rpc = rpc.replace('${INFURA_API_KEY}', '4478656478ab4945a1b013fb1d8f20fd') // for workshop

	// 	verbose && console.log('Checking rpc', rpc)

	// 	if (await checkRpc(rpc, verbose)) {
	// 		return new ethers.providers.JsonRpcProvider(rpc)
	// 	} else {
	// 		verbose && console.log('Provider is down:', rpc)
	// 	}
	// }

	// throw new Error('No alive provider found for chainId ' + chainId)
}

async function getContract(
	_chainId: string,
	signerOrProvider: any,
	version = DEFAULT_CONTRACT_VERSION,
	verbose = false
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
	tokenContract: any,
	spender: any,
	address: string,
	signerOrProvider?: ethers.providers.JsonRpcSigner | ethers.providers.Provider
) {
	let allowance
	try {
		if (!signerOrProvider) {
			signerOrProvider = await getDefaultProvider(tokenContract.chainId)
		}

		if (!address) {
			const signer = signerOrProvider as ethers.providers.JsonRpcSigner
			address = await signer.getAddress()
		}
		allowance = await tokenContract.allowance(address, spender)
	} catch (error) {
		console.error('Error fetching allowance:', error)
	}
	return allowance
}

// async function approveSpendERC20(
// 	signer: ethers.providers.JsonRpcSigner,
// 	chainId: string,
// 	tokenAddress: string,
// 	_amount: number | BigNumber,
// 	tokenDecimals = 18,
// 	isRawAmount = false,
// 	contractVersion = DEFAULT_CONTRACT_VERSION
// ) {
// 	/* Approves the contract to spend the specified amount of tokens */
// 	signer = await getAbstractSigner(signer)
// 	const signerAddress = await signer.getAddress()

// 	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
// 	const spender = _PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion]
// 	if (!spender) throw new Error('Spender address not found for the given chain and contract version')

// 	const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
// 	let allowance = await getAllowance(tokenContract, spender, signerAddress, signer)

// 	const txDetails = await prepareApproveERC20Tx(
// 		chainId,
// 		tokenAddress,
// 		spender,
// 		_amount,
// 		tokenDecimals,
// 		isRawAmount,
// 		contractVersion
// 	)

// 	if (txDetails != null) {
// 		const txOptions = await setFeeOptions({ provider: signer.provider, eip1559: true })
// 		const tx = await signer.sendTransaction({ ...txDetails, ...txOptions })
// 		const txReceipt = await tx.wait()
// 		let allowance = await getAllowance(tokenContract, spender, signerAddress, signer)
// 		return { allowance, txReceipt }
// 	} else {
// 		console.log('Allowance already enough, no need to approve more (allowance: ' + allowance.toString() + ')')
// 		return { allowance, txReceipt: null }
// 	}
// }

async function prepareApproveERC20Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	_amount: number | BigNumber,
	tokenDecimals = 18,
	isRawAmount = false,
	contractVersion = DEFAULT_CONTRACT_VERSION,
	spenderAddress?: string | undefined
): Promise<ethers.providers.TransactionRequest | null> {
	//TODO: implement address
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

	// get allowance
	const allowance = await getAllowance(tokenContract, spender, address, defaultProvider)
	if (allowance.gte(amount)) {
		console.log('Allowance already enough, no need to approve more (allowance: ' + allowance.toString() + ')')
		return null
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
	gasPriceMultiplier?: number
	maxPriorityFeePerGas?: number | BigNumber | null // change this to number | null
	maxPriorityFeePerGasMultiplier?: number
	verbose?: boolean
}) {
	// eip1559 = true
	const verbose = true // TODO: move this to initializing the sdk
	verbose && console.log('Setting tx options...')
	let feeData
	// if not txOptions, create it (oneliner)
	txOptions = txOptions || {}
	try {
		verbose && console.log('getting Fee data')
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
				(
					(BigInt(feeData.maxFeePerGas.toString()) * BigInt(Math.round(maxFeePerGasMultiplier * 10))) /
					BigInt(10)
				).toString()
			txOptions.maxPriorityFeePerGas =
				maxPriorityFeePerGas ||
				(
					(BigInt(feeData.maxPriorityFeePerGas.toString()) *
						BigInt(Math.round(maxPriorityFeePerGasMultiplier * 10))) /
					BigInt(10)
				).toString()

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

async function estimateGasLimit(contract: any, functionName: string, params: any, txOptions: any, multiplier = 1.3) {
	try {
		console.log('called estimate gas limit. contract.address:', contract.address, params, txOptions)
		const estimatedGas = await contract.estimateGas[functionName](...params, txOptions)
		return BigInt(Math.floor(Number(estimatedGas) * multiplier))
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
async function prepareTxs({
	address,
	linkDetails,
	peanutContractVersion = DEFAULT_CONTRACT_VERSION,
	batcherContractVersion = DEFAULT_BATCHER_VERSION,
	numberOfLinks = 1,
	passwords = [],
	provider,
}: interfaces.IPrepareCreateTxsParams): Promise<interfaces.IPrepareCreateTxsResponse> {
	linkDetails = validateLinkDetails(linkDetails, passwords, numberOfLinks)
	assert(numberOfLinks == passwords.length, 'numberOfLinks must be equal to passwords.length')

	const unsignedTxs: ethers.providers.TransactionRequest[] = []
	let txOptions: interfaces.ITxOptions = {}
	if (!provider._isProvider) {
		provider = await getDefaultProvider(String(linkDetails.chainId))
	}
	// txOptions.nonce = structSigner.nonce || (await structSigner.signer.getTransactionCount()) // no nonce anymore?
	txOptions.nonce = await provider.getTransactionCount(address)

	const tokenAmountString = trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals) // v5
	// multiply tokenAmountBigNum by numberOfLinks
	const totalTokenAmount = tokenAmountBigNum.mul(numberOfLinks)

	assert(tokenAmountBigNum.gt(0), 'tokenAmount must be greater than 0')
	if (linkDetails.tokenType == 0) {
		txOptions = {
			...txOptions,
			value: totalTokenAmount,
		}
	} else if (linkDetails.tokenType == 1) {
		// TODO: check for erc721 and erc1155
		console.log('checking allowance...')
		const approveTx = await prepareApproveERC20Tx(
			// returns null
			address,
			String(linkDetails.chainId),
			linkDetails.tokenAddress!,
			tokenAmountBigNum,
			linkDetails.tokenDecimals,
			true,
			peanutContractVersion
		)
		approveTx && unsignedTxs.push(approveTx)
	}

	if (passwords.length == 0) {
		passwords = Array(numberOfLinks).fill(getRandomString(16))
	}

	const keys = passwords.map((password) => generateKeysFromString(password)) // deterministically generate keys from password
	console.log('Generating link...')

	// set transaction options
	txOptions = await setFeeOptions({
		txOptions,
		provider: provider,
		// TODO: setFeeOptions should take into account if chain supports eip1559? or should we just set this to empty?
		// eip1559: structSigner.eip1559,
		// maxFeePerGas: structSigner.maxFeePerGas,
		// maxPriorityFeePerGas: structSigner.maxPriorityFeePerGas,
		// gasLimit: structSigner.gasLimit,
	})

	let contract
	let depositParams
	let depositTx
	if (numberOfLinks == 1) {
		depositParams = [
			linkDetails.tokenAddress,
			linkDetails.tokenType,
			tokenAmountBigNum,
			linkDetails.tokenId,
			keys[0].address,
		]
		contract = await getContract(String(linkDetails.chainId), provider, peanutContractVersion) // get the contract instance
		const estimatedGasLimit = await estimateGasLimit(contract, 'makeDeposit', depositParams, txOptions)
		if (estimatedGasLimit) {
			txOptions.gasLimit = ethers.BigNumber.from(estimatedGasLimit.toString())
		}
		depositTx = await contract.populateTransaction.makeDeposit(...depositParams, txOptions)
	} else {
		depositParams = [
			PEANUT_CONTRACTS[String(linkDetails.chainId)][peanutContractVersion], // The address of the PeanutV4 contract
			linkDetails.tokenAddress,
			linkDetails.tokenType,
			tokenAmountBigNum,
			linkDetails.tokenId,
			keys.map((key) => key.address),
		]
		contract = await getContract(String(linkDetails.chainId), provider, batcherContractVersion) // get the contract instance
		const estimatedGasLimit = await estimateGasLimit(contract, 'batchMakeDeposit', depositParams, txOptions)
		if (estimatedGasLimit) {
			txOptions.gasLimit = ethers.BigNumber.from(estimatedGasLimit.toString())
		}
		depositTx = await contract.populateTransaction.batchMakeDeposit(...depositParams, txOptions)
	}
	unsignedTxs.push(depositTx)

	return { success: { success: true }, unsignedTxs }
}

async function signAndSubmitTx({
	structSigner,
	unsignedTx,
}: interfaces.ISignAndSubmitTxParams): Promise<interfaces.ISignAndSubmitTxResponse> {
	const verbose = false
	verbose && console.log('unsigned tx: ', unsignedTx)
	// const signedTx = await structSigner.signer.signTransaction(unsignedTx)
	// console.log("signed tx: ", signedTx)
	const tx = await structSigner.signer.sendTransaction(unsignedTx)
	verbose && console.log('tx: ', tx)
	await tx.wait()

	return { txHash: tx.hash, success: { success: true } }
}

// takes in a tx hash and linkDetails and returns an array of one or many links (if batched)
async function getLinksFromTx({
	linkDetails,
	txHash,
	passwords,
	provider,
}: interfaces.IGetLinkFromTxParams): Promise<interfaces.IGetLinkFromTxResponse> {
	const txReceipt = await getTxReceiptFromHash(txHash, linkDetails.chainId, provider)
	// TODO: get contract version & idx from tx receipt
	/// get chainid

	// get deposit idx
	const peanutContractVersion = detectContractVersionFromTxReceipt(txReceipt, String(linkDetails.chainId))
	// TODO: See if its one deposit or many, and call getDepositIdx or getDepositIdxs accordingly
	// or: always call getDepositIdxs? <-- bingo
	const idxs: number[] = getDepositIdxs(txReceipt, String(linkDetails.chainId), peanutContractVersion) // doesn't work on V3!
	const links: string[] = []
	idxs.map((idx) => {
		links.push(
			getLinkFromParams(
				linkDetails.chainId,
				peanutContractVersion,
				idx,
				passwords[idxs.indexOf(idx)],
				linkDetails.baseUrl,
				linkDetails.trackId
			)
		)
	})

	return {
		links: links,
		success: { success: true },
	}
}

function detectContractVersionFromTxReceipt(txReceipt: any, chainId: string): string {
	const contractAddresses = Object.values(PEANUT_CONTRACTS[chainId])
	const contractVersions = Object.keys(PEANUT_CONTRACTS[chainId])
	const txReceiptContractAddresses = txReceipt.logs.map((log: any) => log.address.toLowerCase())

	let txReceiptContractVersion = -1

	for (let i = 0; i < contractAddresses.length; i++) {
		if (txReceiptContractAddresses.includes(String(contractAddresses[i]).toLowerCase())) {
			txReceiptContractVersion = i
			break
		}
	}

	return contractVersions[txReceiptContractVersion]
}

async function getTxReceiptFromHash(
	txHash: string,
	chainId: number,
	provider?: ethers.providers.Provider
): Promise<TransactionReceipt> {
	let _provider: ethers.providers.Provider

	if (provider) {
		if (provider instanceof ethers.providers.Provider) {
			_provider = provider
		} else {
			_provider = await getDefaultProvider(String(chainId))
		}
	} else {
		_provider = await getDefaultProvider(String(chainId))
	}

	const txReceipt = await _provider.getTransactionReceipt(txHash)
	return txReceipt
}

function validateLinkDetails(
	linkDetails: interfaces.IPeanutLinkDetails,
	passwords: string[],
	numberOfLinks: number
): interfaces.IPeanutLinkDetails {
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
	linkDetails.baseUrl = linkDetails.baseUrl ?? 'https://peanut.to/claim'
	linkDetails.trackId = linkDetails.trackId ?? 'sdk'

	assert(
		numberOfLinks > 1 || passwords.length === numberOfLinks,
		'when creating multiple links, passwords must be an array of length numberOfLinks'
	)

	assert(
		linkDetails.tokenType == 0 || linkDetails.tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-ETH tokens'
	)
	assert(linkDetails.tokenType == 0 || linkDetails.tokenType == 1, 'ERC721 and ERC1155 are not supported yet')
	assert(
		!(linkDetails.tokenType == 1 || linkDetails.tokenType == 3) || linkDetails.tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
	)

	if (linkDetails.tokenType !== 0 && linkDetails.tokenAddress === '0x000000cl0000000000000000000000000000000000') {
		throw new Error('need to provide tokenAddress if tokenType is not 0')
	}

	return linkDetails
}

/**
 * Generates a link with the specified parameters
 */
async function createLink({
	structSigner,
	linkDetails,
	peanutContractVersion = DEFAULT_CONTRACT_VERSION,
}: interfaces.ICreateLinkParams): Promise<interfaces.ICreateLinkResponse> {
	const password = getRandomString(16)
	linkDetails = validateLinkDetails(linkDetails, [password], 1)

	const provider = structSigner.signer.provider
	// Prepare the transactions
	const prepareTxsResponse = await prepareTxs({
		address: await structSigner.signer.getAddress(),
		linkDetails,
		peanutContractVersion,
		numberOfLinks: 1,
		passwords: [password],
		provider: provider,
	})

	// Sign and submit the transactions
	const signedTxs = await Promise.all(
		prepareTxsResponse.unsignedTxs.map((unsignedTx) => signAndSubmitTx({ structSigner, unsignedTx }))
	)

	// Get the links from the transactions
	const link = (
		await getLinksFromTx({
			linkDetails,
			txHash: signedTxs[signedTxs.length - 1].txHash,
			passwords: [password],
			provider,
		})
	).links

	return { createdLink: { link: link, txHash: signedTxs[signedTxs.length - 1].txHash }, success: { success: true } }
}

async function createLinks({
	structSigner,
	linkDetails,
	numberOfLinks = 2,
	peanutContractVersion = DEFAULT_CONTRACT_VERSION,
}: interfaces.ICreateLinksParams): Promise<interfaces.ICreateLinksResponse> {
	const verbose = false
	const passwords = Array.from({ length: numberOfLinks }, () => getRandomString(16))
	linkDetails = validateLinkDetails(linkDetails, passwords, numberOfLinks)

	const provider = structSigner.signer.provider
	// Prepare the transactions
	const prepareTxsResponse = await prepareTxs({
		address: await structSigner.signer.getAddress(),
		linkDetails,
		peanutContractVersion,
		numberOfLinks: numberOfLinks,
		passwords: passwords,
		provider: provider,
	})

	verbose && console.log('prepareTxsResponse: ', prepareTxsResponse)
	// Sign and submit the transactions
	const signedTxs = await Promise.all(
		prepareTxsResponse.unsignedTxs.map((unsignedTx) => signAndSubmitTx({ structSigner, unsignedTx }))
	)
	verbose && console.log('signedTxs: ', signedTxs)

	const links = (
		await getLinksFromTx({
			linkDetails,
			txHash: signedTxs[signedTxs.length - 1].txHash,
			passwords: passwords,
			provider,
		})
	).links
	const createdLinks = links.map((link) => {
		return { link: link, txHash: signedTxs[signedTxs.length - 1].txHash }
	})
	return { createdLinks: createdLinks, success: { success: true } }
}

/**
 * Claims the contents of a link
 */
async function claimLink({
	signer,
	link,
	recipient = null,
	verbose = false,
	maxFeePerGas = null,
	maxPriorityFeePerGas = null,
	gasLimit = null,
	eip1559 = true,
}: {
	signer: ethers.Signer
	link: string
	recipient?: string | null
	verbose?: boolean
	maxFeePerGas?: number | null
	maxPriorityFeePerGas?: number | null
	gasLimit?: number | null
	eip1559?: boolean
}) {
	// TODO: split into 2

	// claims the contents of a link
	assert(signer, 'signer arg is required')
	assert(link, 'link arg is required')

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
	const contract = await getContract(String(chainId), signer, contractVersion, verbose)

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
async function getAllDepositsForSigner({
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
 */
// async function claimLinkSender({
// 	signer,
// 	link,
// 	verbose = false,
// }: {
// 	signer: ethers.providers.JsonRpcSigner
// 	link: string
// 	verbose?: boolean
// }) {
// 	// TODO:
// 	throw new Error('Not implemented yet')
// }

async function createClaimPayload(link: string, recipientAddress: string) {
	/* internal utility function to create the payload for claiming a link */
	const params = getParamsFromLink(link)
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
 */
async function getLinkDetails({ link, provider }: interfaces.IGetLinkDetailsParams) {
	const verbose = false // TODO: move this to initializing the SDK
	verbose && console.log('getLinkDetails called with link: ', link)
	assert(link, 'link arg is required')

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	provider = provider || (await getDefaultProvider(String(chainId)))
	const contract = await getContract(chainId.toString(), provider, contractVersion, verbose)
	// check contract works
	verbose && console.log('contract address: ', contract.address)
	// check provider works (get addrss balance)
	verbose && console.log('contract balance: ', await provider.getBalance(contract.address))

	verbose && console.log('fetching deposit: ', depositIdx)
	const deposit = await contract.deposits(depositIdx)
	// const deposit = await contract.getDeposit(depositIdx)
	verbose && console.log('deposit: ', deposit)
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
	verbose && console.log('chainId: ', chainId)
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
		claimed: claimed,
		depositDate: depositDate,
	}

	// tokenPrice: tokenPrice
}

/**
 * Claims a link through the Peanut API
 */
async function claimLinkGasless({
	link,
	recipientAddress,
	APIKey,
	baseUrl = 'https://api.peanut.to/claim',
}: interfaces.IClaimLinkGaslessParams) {
	const verbose = true
	verbose && console.log('claiming link through Peanut API...')
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
	detectContractVersionFromTxReceipt,
	getContract,
	getDefaultProvider,
	checkRpc,
	getDepositIdx,
	getDepositIdxs,
	getAllDepositsForSigner,
	getLinkDetails,
	getParamsFromLink,
	getParamsFromPageURL,
	getLinkFromParams,
	createLink,
	createLinks,
	claimLink,
	claimLinkGasless,
	// approveSpendERC20,
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
