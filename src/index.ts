////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. This library is compatible with ethers v5, and
//  supports both node and browser environments.
//
/////////////////////////////////////////////////////////

import { BigNumber, ethers } from 'ethersv5'
import { Provider, TransactionReceipt, TransactionRequest } from '@ethersproject/abstract-provider'
import {
	PEANUT_ABI_V4,
	PEANUT_BATCHER_ABI_V4,
	PEANUT_CONTRACTS,
	ERC20_ABI,
	ERC721_ABI,
	ERC1155_ABI,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	VERSION,
	LATEST_STABLE_CONTRACT_VERSION,
	LATEST_EXPERIMENTAL_CONTRACT_VERSION,
	LATEST_STABLE_BATCHER_VERSION,
	TOKEN_TYPES,
	PEANUT_ROUTER_ABI_V4_2,
	PEANUT_ABI_V4_2,
	FALLBACK_CONTRACT_VERSION,
} from './data.ts'

import { config } from './config.ts'

import {
	assert,
	greeting,
	generateKeysFromString,
	hash_string,
	signMessageWithPrivatekey,
	verifySignature,
	solidityHashBytesEIP191,
	solidityHashAddress,
	signWithdrawalMessage,
	signHash,
	getRandomString,
	getLinkFromParams,
	getParamsFromLink,
	getParamsFromPageURL,
	getDepositIdx,
	getDepositIdxs,
	getLinksFromMultilink,
	createMultiLinkFromLinks,
	compareDeposits,
	signAddress,
	getSquidRouterUrl,
	toLowerCaseKeys,
} from './util.ts'

import * as interfaces from './consts/interfaces.consts.ts'
import { SQUID_ADDRESS } from './consts/misc.ts'
import {
	EIP3009Tokens,
	GaslessReclaimTypes,
	PeanutsWithEIP3009,
	PeanutsWithGaslessRevoke,
	ReceiveWithAuthorizationTypes,
} from './consts/eip712domains.ts'

greeting()

const providerCache: { [chainId: string]: ethers.providers.JsonRpcProvider } = {}
function resetProviderCache() {
	for (const key in providerCache) {
		delete providerCache[key]
	}
}
// async function getAbstractSigner(signer: any) {
// 	// TODO: create abstract signer class that is compatible with ethers v5, v6, viem, web3js
// 	return signer
// }

function timeout<T>(ms: number, promise: Promise<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timed out after ${ms} ms`))
		}, ms)

		promise
			.then(resolve)
			.catch(reject)
			.finally(() => clearTimeout(timer))
	})
}

async function fetchGetBalance(rpcUrl: string) {
	const res = await fetch(rpcUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_getBalance',
			params: ['0x0000000000000000000000000000000000000000', 'latest'],
			id: 1,
		}),
	})

	const json = await res.json()
	return json
}

/**
 * This function is used to get the default provider for a given chainId.
 */ async function getDefaultProvider(chainId: string): Promise<ethers.providers.JsonRpcProvider> {
	config.verbose && console.log('Getting default provider for chainId ', chainId)
	if (!CHAIN_DETAILS[chainId]) {
		throw new Error(`Chain ID ${chainId} not supported yet`)
	}

	if (providerCache[chainId]) {
		config.verbose && console.log('Found cached provider for chainId ', chainId)
		return providerCache[chainId]
	}

	const rpcs = CHAIN_DETAILS[chainId as keyof typeof CHAIN_DETAILS].rpc
	config.verbose && console.log('rpcs', rpcs)

	// Check if there is an Infura RPC and check for its liveliness
	let infuraRpc = rpcs.find((rpc) => rpc.includes('infura.io'))
	const INFURA_API_KEY = '4478656478ab4945a1b013fb1d8f20fd'
	if (infuraRpc) {
		infuraRpc = infuraRpc.replace('${INFURA_API_KEY}', INFURA_API_KEY)
		config.verbose && console.log('Infura RPC found:', infuraRpc)
		const provider = await createValidProvider(infuraRpc)
		if (provider) {
			providerCache[chainId] = provider
			return provider
		}
	}

	// If no valid Infura RPC, continue with the current behavior
	const providerPromises = rpcs.map((rpcUrl) =>
		createValidProvider(rpcUrl.replace('${INFURA_API_KEY}', INFURA_API_KEY)).catch((error) => null)
	)

	try {
		const provider = await Promise.any(providerPromises)
		if (provider === null) {
			throw new Error('No alive provider found for chainId ' + chainId)
		}
		providerCache[chainId] = provider
		return provider
	} catch (error) {
		throw new Error('No alive provider found for chainId ' + chainId)
	}
}

/**
 * Like getDefaultProvider, but only returns a string with the RPC URL.
 */
async function getDefaultProviderUrl(chainId: string): Promise<string> {
	const provider = await getDefaultProvider(chainId)
	return provider.connection.url
}

async function createValidProvider(rpcUrl: string): Promise<ethers.providers.JsonRpcProvider> {
	try {
		const provider = new ethers.providers.JsonRpcProvider({
			url: rpcUrl,
		})

		// Check if the RPC is valid by calling fetchGetBalance
		const response = await fetchGetBalance(rpcUrl)
		if (response.error) {
			config.verbose && console.log('JSON RPC Error for:', rpcUrl, response.error.message)
			throw new Error('Invalid RPC: ' + rpcUrl)
		}

		config.verbose && console.log('RPC is valid:', rpcUrl)
		return provider
	} catch (error) {
		try {
			if (error.code === 'NETWORK_ERROR') {
				config.verbose && console.log('Network error for RPC:', rpcUrl, 'Trying with skipFetchSetup...')
				const provider = new ethers.providers.JsonRpcProvider({
					url: rpcUrl,
					skipFetchSetup: true,
				})

				// Check if the RPC is valid by calling fetchGetBalance
				const response = await fetchGetBalance(rpcUrl)
				if (response.error) {
					config.verbose && console.log('JSON RPC Error for:', rpcUrl, response.error.message)
					throw new Error('Invalid RPC: ' + rpcUrl)
				}

				return provider
			} else {
				config.verbose && console.log('Error checking RPC:', rpcUrl, 'Error:', error)
				// Introduce a delay before throwing the error. This is necessary so that the Promise.any
				// call in getDefaultProvider doesn't immediately reject the promise and instead waits for a success.
				await new Promise((resolve) => setTimeout(resolve, 5000))
				throw new Error('Invalid RPC: ' + rpcUrl)
			}
		} catch (error) {
			config.verbose && console.log('Error checking RPC (fallback):', rpcUrl, 'Error:', error)
			await new Promise((resolve) => setTimeout(resolve, 5000))
			throw new Error('Invalid RPC: ' + rpcUrl)
		}
	}
}

function getContractAddress(chainId: number, version: string) {
	// Find the contract address based on the chainId and version provided
	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const contractAddress = _PEANUT_CONTRACTS[chainId.toString()] && _PEANUT_CONTRACTS[chainId.toString()][version]
	return contractAddress
}

async function getContract(_chainId: string, signerOrProvider: any, version = null) {
	if (signerOrProvider == null) {
		config.verbose && console.log('signerOrProvider is null, getting default provider...')
		signerOrProvider = await getDefaultProvider(_chainId)
	}
	if (version == null) {
		version = getLatestContractVersion({ chainId: _chainId, type: 'normal' })
	}

	const chainId = parseInt(_chainId)

	// Determine which ABI version to use based on the version provided
	let PEANUT_ABI
	switch (version) {
		case 'v4':
			PEANUT_ABI = PEANUT_ABI_V4
			break
		case 'v4.2':
			PEANUT_ABI = PEANUT_ABI_V4_2
			break
		case 'Bv4':
			PEANUT_ABI = PEANUT_BATCHER_ABI_V4
			break
		case 'Rv4.2':
			PEANUT_ABI = PEANUT_ROUTER_ABI_V4_2
			break
		default:
			throw new Error('Unable to find Peanut contract for this version, check for correct version or updated SDK')
	}

	const contractAddress = getContractAddress(chainId, version)

	// If the contract address is not found, throw an error
	if (!contractAddress) {
		throw new Error(`Contract ${version} not deployed on chain ${chainId}`)
	}

	const contract = new ethers.Contract(contractAddress, PEANUT_ABI, signerOrProvider)

	config.verbose && console.log(`Connected to contract ${version} on chain ${chainId} at ${contractAddress}`)

	return contract
	// TODO: return class
}

async function getAllowanceERC20(
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
		console.error('Error fetching ERC20 allowance status:', error)
	}
	return allowance
}

async function getApprovedERC721(
	tokenContract: any,
	tokenId: number,
	signerOrProvider?: ethers.providers.JsonRpcSigner | ethers.providers.Provider
) {
	let approved
	try {
		if (!signerOrProvider) {
			signerOrProvider = await getDefaultProvider(tokenContract.chainId)
		}

		approved = await tokenContract.getApproved(tokenId)
	} catch (error) {
		console.error('Error fetching ERC721 approval status:', error)
	}
	return approved
}

async function getApprovedERC1155(
	tokenContract: any,
	addressOwner: string,
	addressOperator: string,
	signerOrProvider?: ethers.providers.JsonRpcSigner | ethers.providers.Provider
) {
	let approved
	try {
		if (!signerOrProvider) {
			signerOrProvider = await getDefaultProvider(tokenContract.chainId)
		}

		approved = await tokenContract.isApprovedForAll(addressOwner, addressOperator)
	} catch (error) {
		console.error('Error fetching ERC1155 approval status:', error)
	}
	return approved
}

async function prepareApproveERC20Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	_amount: number | BigNumber,
	tokenDecimals = 18,
	isRawAmount = false,
	contractVersion = null,
	provider?: any, // why does TS complain about string here?
	spenderAddress?: string | undefined
): Promise<ethers.providers.TransactionRequest | null> {
	//TODO: implement address
	const defaultProvider = provider || (await getDefaultProvider(chainId))
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
	const allowance = await getAllowanceERC20(tokenContract, spender, address, defaultProvider)
	if (allowance.gte(amount)) {
		config.verbose &&
			console.log('Allowance already enough, no need to approve more (allowance: ' + allowance.toString() + ')')
		return null
	}
	config.verbose && console.log('Approving ' + amount.toString() + ' tokens for spender ' + spender)

	const tx = tokenContract.populateTransaction.approve(spender, amount)
	return tx
}

async function prepareApproveERC721Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	tokenId: number,
	provider?: any,
	spenderAddress?: string | undefined,
	contractVersion = null
): Promise<ethers.providers.TransactionRequest | null> {
	if (contractVersion == null) {
		contractVersion = getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}
	const defaultProvider = provider || (await getDefaultProvider(chainId))
	const tokenContract = new ethers.Contract(tokenAddress, ERC721_ABI, defaultProvider)

	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	config.verbose && console.log('Checking approval for ' + tokenAddress + ' token ID: ' + tokenId)
	// Check if approval is already sufficient
	const currentApproval = await getApprovedERC721(tokenContract, tokenId, defaultProvider)
	if (currentApproval.toLowerCase() === spender.toLowerCase()) {
		config.verbose && console.log('Approval already granted to the spender for token ID: ' + tokenId)
		return null
	} else {
		config.verbose &&
			console.log('Approval granted to different address: ' + currentApproval + ' for token ID: ' + tokenId)
	}

	// Prepare the transaction to approve the spender for the specified token ID
	const tx = tokenContract.populateTransaction.approve(spender, tokenId, { from: address })
	return tx
}

async function prepareApproveERC1155Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	provider?: any,
	spenderAddress?: string | undefined,
	contractVersion = null
): Promise<ethers.providers.TransactionRequest | null> {
	if (contractVersion == null) {
		contractVersion = getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}
	const defaultProvider = provider || (await getDefaultProvider(chainId))
	const tokenContract = new ethers.Contract(tokenAddress, ERC1155_ABI, defaultProvider)

	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	config.verbose &&
		console.log('Checking approval for ' + tokenAddress + ' owner: ' + address + ' operator: ' + spender)
	// Check if approval is already granted for the operator
	const isApproved = await getApprovedERC1155(tokenContract, address, spender, defaultProvider)

	if (isApproved) {
		config.verbose && console.log('Approval already granted to the operator')
		return null
	}

	// Prepare the transaction to approve the spender for the specified token ID
	const tx = tokenContract.populateTransaction.setApprovalForAll(spender, true, { from: address })
	config.verbose && console.log('Approval needed for operator')
	return tx
}

async function supportsEIP1559(provider: ethers.providers.Provider): Promise<boolean> {
	const block = await provider.getBlock('latest')
	// EIP-1559 compatible blocks include a baseFeePerGas field.
	return block.baseFeePerGas !== undefined
}

async function getEIP1559Tip(chainId: string): Promise<ethers.BigNumber | null> {
	// Map of chain IDs to tip sizes
	const tipSizes: { [key: string]: string } = {
		'137': '40', // Polygon
		'1': '5', // Ethereum Mainnet
	}

	// Check if the chain ID is in tipSizes
	if (!tipSizes.hasOwnProperty(chainId)) {
		return null
	}

	// Get the tip size for the chain ID
	const tip = tipSizes[chainId]

	// Convert the tip size to Wei and return it
	return ethers.utils.parseUnits(tip, 'gwei')
}

/**
 * Estimate gas price. If txRequest is supplied, also estimate the gas limit
 * @returns struct with gas info
 */
async function setFeeOptions({
	txOptions,
	txRequest,
	provider,
	eip1559 = true,
	maxFeePerGas = null,
	maxFeePerGasMultiplier = 1.2,
	gasLimit = null,
	gasPriceMultiplier = 1.3,
	maxPriorityFeePerGas,
	maxPriorityFeePerGasMultiplier = 1.2,
	gasLimitMultiplier = 1,
}: {
	txOptions?: any
	txRequest?: TransactionRequest
	provider: Provider
	eip1559?: boolean
	maxFeePerGas?: ethers.BigNumber | null
	maxFeePerGasMultiplier?: number
	gasLimit?: ethers.BigNumber | null
	gasPriceMultiplier?: number
	maxPriorityFeePerGas?: ethers.BigNumber | null
	maxPriorityFeePerGasMultiplier?: number
	gasLimitMultiplier?: number
}) {
	// eip1559 = true
	config.verbose && console.log('Setting tx options...')
	let feeData
	// if not txOptions, create it (oneliner)
	txOptions = txOptions || {}
	try {
		config.verbose && console.log('getting Fee data')
		// TODO: skip fetching fee data if provided
		feeData = await provider.getFeeData()
		config.verbose && console.log('Fetched gas price from provider:', feeData)
	} catch (error) {
		console.error('Failed to fetch gas price from provider:', error)
		throw error
	}

	const chainId = Number(await provider.getNetwork().then((network: any) => network.chainId))
	const chainDetails = CHAIN_DETAILS[chainId]

	if (gasLimit) {
		txOptions.gasLimit = gasLimit
	} else if (txRequest) {
		const gasLimitRaw = await provider.estimateGas(txRequest)
		txOptions.gasLimit = gasLimitRaw.mul(gasLimitMultiplier)
	}
	config.verbose && console.log('checking if eip1559 is supported...')

	// Check if EIP-1559 is supported
	// if on milkomeda or bnb or linea, set eip1559 to false
	// Even though linea is eip1559 compatible, it is more reliable to use the good old gasPrice
	if (chainId === 2001 || chainId === 200101 || chainId === 56 || chainId === 59144 || chainId === 59140) {
		eip1559 = false
		config.verbose && console.log('Setting eip1559 to false as an exception')
	} else if (chainDetails && chainDetails.features) {
		eip1559 = chainDetails.features.some((feature: any) => feature.name === 'EIP1559')
		config.verbose && console.log('EIP1559 support determined from chain features:', eip1559)
	} else {
		config.verbose && console.log('Chain features not available, checking EIP1559 support via feeData...')
		try {
			eip1559 = 'maxFeePerGas' in feeData
			config.verbose && console.log('EIP1559 support determined from feeData:', eip1559)
		} catch (error) {
			console.error('Failed to determine EIP1559 support from feeData:', error)
			eip1559 = false
		}
	}

	if (eip1559) {
		try {
			config.verbose && console.log('Setting eip1559 tx options...', txOptions)
			config.verbose && console.log('feeData:', feeData)

			// maxFeePerGas (base fee + miner tip + margin of error)
			const lastBaseFeePerGas = BigInt(feeData.lastBaseFeePerGas || feeData.baseFeePerGas)

			// priority fee (miner tip)
			if (maxPriorityFeePerGas) {
				txOptions.maxPriorityFeePerGas = maxPriorityFeePerGas
			} else {
				txOptions.maxPriorityFeePerGas = (
					(BigInt(feeData.maxPriorityFeePerGas.toString()) *
						BigInt(Math.round(maxPriorityFeePerGasMultiplier * 100))) /
					BigInt(100)
				).toString()

				// for some chains, like arbitrum or base, providers tend to return an incorrect maxPriorityFeePerGas
				// Sanity check so that it's never more than the base fee.
				// exception: linea, where baseFee is hardcoded to 7 gwei (minimum allowed)
				if (![59144, 59140].includes(chainId)) {
					if (BigInt(txOptions.maxPriorityFeePerGas) > lastBaseFeePerGas) {
						txOptions.maxPriorityFeePerGas = lastBaseFeePerGas.toString()
					}
				}

				// for polygon (137), set priority fee to min 40 gwei (they have a minimum of 30 for spam prevention)
				if (chainId == 137) {
					const minPriorityFee = ethers.utils.parseUnits('40', 'gwei')
					if (ethers.BigNumber.from(txOptions.maxPriorityFeePerGas).lt(minPriorityFee)) {
						txOptions.maxPriorityFeePerGas = minPriorityFee.toString()
					}
				}
			}

			// if lastBaseFeePerGas is null, just set maxFeePerGas to feeData.maxFeePerGas * maxFeePerGasMultiplier
			txOptions.maxFeePerGas =
				maxFeePerGas ||
				(
					((lastBaseFeePerGas + BigInt(txOptions.maxPriorityFeePerGas.toString())) * // base fee + miner tip
						BigInt(Math.round(maxFeePerGasMultiplier * 100))) /
					BigInt(100)
				).toString()

			// ensure maxPriorityFeePerGas is less than maxFeePerGas
			if (BigInt(txOptions.maxPriorityFeePerGas) > BigInt(txOptions.maxFeePerGas)) {
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
		txOptions.gasPrice = proposedGasPrice && ethers.BigNumber.from(proposedGasPrice.toString())
	}

	config.verbose && console.log('FINAL txOptions:', txOptions)

	return txOptions
}

async function estimateGasLimit(contract: any, functionName: string, params: any, txOptions: any, multiplier = 1.3) {
	try {
		config.verbose &&
			console.log('called estimate gas limit. contract.address:', contract.address, params, txOptions)
		const estimatedGas = await contract.estimateGas[functionName](...params, txOptions)
		return BigInt(Math.floor(Number(estimatedGas) * multiplier))
	} catch (error) {
		console.warn(`Could not estimate gas for for ${functionName}:`, error)
		console.warn(
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
 *
 * @param address - The senders wallet address. This is NOT the token contract address.
 */
async function prepareTxs({
	address,
	linkDetails,
	peanutContractVersion = null,
	batcherContractVersion = LATEST_STABLE_BATCHER_VERSION,
	numberOfLinks = 1,
	passwords = [],
	provider,
}: interfaces.IPrepareTxsParams): Promise<interfaces.IPrepareTxsResponse> {
	if (peanutContractVersion == null) {
		peanutContractVersion = getLatestContractVersion({ chainId: linkDetails.chainId.toString(), type: 'normal' })
	}
	try {
		linkDetails = validateLinkDetails(linkDetails, passwords, numberOfLinks)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: please make sure all required fields are provided and valid'
		)
	}
	const tokenAmountString = trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals)
	const totalTokenAmount = tokenAmountBigNum.mul(numberOfLinks)

	const unsignedTxs: ethers.providers.TransactionRequest[] = []
	let txOptions: interfaces.ITxOptions = {}
	if (!provider) {
		try {
			provider = await getDefaultProvider(String(linkDetails.chainId))
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_GETTING_DEFAULT_PROVIDER,
				'Error getting the default provider'
			)
		}
	}

	if (linkDetails.tokenType == interfaces.EPeanutLinkType.native) {
		txOptions = {
			...txOptions,
			value: totalTokenAmount,
		}
	} else if (linkDetails.tokenType == interfaces.EPeanutLinkType.erc20) {
		config.verbose && console.log('checking allowance...')
		try {
			let approveTx
			if (numberOfLinks == 1) {
				approveTx = await prepareApproveERC20Tx(
					address,
					String(linkDetails.chainId),
					linkDetails.tokenAddress!,
					tokenAmountBigNum,
					linkDetails.tokenDecimals,
					true,
					peanutContractVersion,
					provider
				)
			} else {
				// approve to the batcher contract
				approveTx = await prepareApproveERC20Tx(
					address,
					String(linkDetails.chainId),
					linkDetails.tokenAddress!,
					totalTokenAmount,
					linkDetails.tokenDecimals,
					true,
					batcherContractVersion,
					provider
				)
			}
			approveTx && unsignedTxs.push(approveTx)
			approveTx && config.verbose && console.log('approveTx:', approveTx)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_PREPARING_APPROVE_ERC20_TX,
				'Error preparing the approve ERC20 tx, please make sure you have enough balance and have approved the contract to spend your tokens'
			)
		}
	} else if (linkDetails.tokenType == interfaces.EPeanutLinkType.erc721) {
		config.verbose && console.log('checking ERC721 allowance...')
		try {
			const approveTx = await prepareApproveERC721Tx(
				address,
				String(linkDetails.chainId),
				linkDetails.tokenAddress!,
				linkDetails.tokenId
			)

			approveTx && unsignedTxs.push(approveTx)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_PREPARING_APPROVE_ERC721_TX,
				'Error preparing the approve ERC721 tx, please make sure you have approved the contract to spend your tokens'
			)
		}
	} else if (linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155) {
		config.verbose && console.log('checking ERC1155 allowance...')
		// Note for testing https://goerli.etherscan.io/address/0x246c7802c82598bff1521eea314cf3beabc33197
		// can be used for generating and playing with 1155s
		try {
			const approveTx = await prepareApproveERC1155Tx(
				address,
				String(linkDetails.chainId),
				linkDetails.tokenAddress!
			)

			approveTx && unsignedTxs.push(approveTx)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_PREPARING_APPROVE_ERC1155_TX,
				'Error preparing the approve ERC1155 tx, please make sure you have approved the contract to spend your tokens'
			)
		}
	} else {
		assert(false, 'Unsupported link type')
	}

	if (passwords.length == 0) {
		passwords = await Promise.all(Array.from({ length: numberOfLinks }, () => getRandomString(16)))
	}

	const keys = passwords.map((password) => generateKeysFromString(password)) // deterministically generate keys from password

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

		try {
			depositTx = await contract.populateTransaction.makeDeposit(...depositParams, txOptions)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
				error,
				'Error making the deposit to the contract'
			)
		}
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

		try {
			depositTx = await contract.populateTransaction.batchMakeDeposit(...depositParams, txOptions)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
				'Error making the deposit to the contract'
			)
		}
	}

	unsignedTxs.push(depositTx)

	// if 2 or more transactions, assign them sequential nonces
	if (unsignedTxs.length > 1) {
		// txOptions.nonce = structSigner.nonce || (await structSigner.signer.getTransactionCount()) // no nonce anymore?
		let nonce
		try {
			nonce = await provider.getTransactionCount(address)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_GETTING_TX_COUNT,
				'Error getting the transaction count'
			)
		}

		unsignedTxs.forEach((tx, i) => (tx.nonce = nonce + i))
	}

	config.verbose && console.log('unsignedTxs: ', unsignedTxs)

	return { unsignedTxs }
}

async function signAndSubmitTx({
	structSigner,
	unsignedTx,
}: interfaces.ISignAndSubmitTxParams): Promise<interfaces.ISignAndSubmitTxResponse> {
	config.verbose && console.log('unsigned tx: ', unsignedTx)

	// Set the transaction options using setFeeOptions
	let txOptions
	try {
		txOptions = await setFeeOptions({
			provider: structSigner.signer.provider,
			eip1559: structSigner.eip1559,
			maxFeePerGas: structSigner.maxFeePerGas,
			maxPriorityFeePerGas: structSigner.maxPriorityFeePerGas,
			gasLimit: structSigner.gasLimit,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.ESignAndSubmitTx.ERROR_SETTING_FEE_OPTIONS,
			'Error setting the fee options',
			error
		)
	}

	// Merge the transaction options into the unsigned transaction
	unsignedTx = { ...unsignedTx, ...txOptions, ...{ nonce: structSigner.nonce } }

	let tx: ethers.providers.TransactionResponse
	try {
		config.verbose && console.log('sending tx: ', unsignedTx)
		config.verbose && console.log('....')
		tx = await structSigner.signer.sendTransaction(unsignedTx)
		config.verbose && console.log('sent tx.')
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.ESignAndSubmitTx.ERROR_SENDING_TX,
			error,
			'Error sending the transaction'
		)
	}

	config.verbose && console.log('tx: ', tx)
	return { txHash: tx.hash, tx }
}

// async function signAndSubmitTx({
// 	structSigner,
// 	unsignedTx,
// }: interfaces.ISignAndSubmitTxParams): Promise<interfaces.ISignAndSubmitTxResponse> {
// 	config.verbose && console.log('unsigned tx: ', unsignedTx)

// 	let tx: ethers.providers.TransactionResponse
// 	try {
// 		tx = await structSigner.signer.sendTransaction(unsignedTx)
// 	} catch (error) {
// 		console.error('Error estimating gas, sending with a predefined gas limit: ', error)
// 		unsignedTx.gasLimit = ethers.utils.hexlify(300000) // Set a predefined gas limit here
// 		tx = await structSigner.signer.sendTransaction(unsignedTx)
// 	}

// 	config.verbose && console.log('tx: ', tx)
// 	return { txHash: tx.hash, tx, status: new interfaces.SDKStatus(interfaces.ESignAndSubmitTx.SUCCESS) }
// }

// takes in a tx hash and linkDetails and returns an array of one or many links (if batched)
async function getLinksFromTx({
	linkDetails,
	txHash,
	passwords,
	provider,
}: interfaces.IGetLinkFromTxParams): Promise<interfaces.IGetLinkFromTxResponse> {
	let txReceipt
	try {
		config.verbose && console.log(txHash, linkDetails.chainId, provider)
		txReceipt = await getTxReceiptFromHash(txHash, linkDetails.chainId, provider)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EGetLinkFromTxStatusCodes.ERROR_GETTING_TX_RECEIPT_FROM_HASH,
			'Error getting the transaction receipt from the hash'
		)
	}

	// get deposit idx
	const peanutContractVersion = detectContractVersionFromTxReceipt(txReceipt, String(linkDetails.chainId))
	const idxs: number[] = getDepositIdxs(txReceipt, String(linkDetails.chainId), peanutContractVersion)
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
	provider = provider ?? (await getDefaultProvider(String(chainId)))
	const txReceipt = await provider.getTransactionReceipt(txHash)
	// throw error if txReceipt is null
	if (txReceipt == null) {
		throw new Error('Could not fetch transaction receipt')
	}
	return txReceipt
}

function validateLinkDetails(
	linkDetails: interfaces.IPeanutLinkDetails,
	passwords: string[],
	numberOfLinks: number
): interfaces.IPeanutLinkDetails {
	if (!linkDetails || !linkDetails.chainId || !linkDetails.tokenAmount) {
		throw new Error(
			'validateLinkDetails function requires linkDetails object with chainId and tokenAmount properties'
		)
	}

	// Assert that linkDetails conforms to IPeanutLinkDetails
	linkDetails = linkDetails as interfaces.IPeanutLinkDetails

	if (linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155) {
		linkDetails.tokenDecimals = linkDetails.tokenDecimals ?? 0
	} else {
		linkDetails.tokenDecimals = linkDetails.tokenDecimals ?? 18
	}

	// Use nullish coalescing operator to provide default values
	linkDetails.tokenAddress = linkDetails.tokenAddress ?? '0x0000000000000000000000000000000000000000'
	linkDetails.tokenType = linkDetails.tokenType ?? 0
	linkDetails.tokenId = linkDetails.tokenId ?? 0
	linkDetails.baseUrl = linkDetails.baseUrl ?? 'https://peanut.to/claim'
	linkDetails.trackId = linkDetails.trackId ?? 'sdk'

	if (numberOfLinks > 1) {
		assert(
			passwords.length === numberOfLinks,
			'when creating multiple links, passwords must be an array of length numberOfLinks'
		)
	}

	assert(
		linkDetails.tokenType == interfaces.EPeanutLinkType.native ||
			linkDetails.tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-ETH tokens'
	)
	if (
		linkDetails.tokenType == interfaces.EPeanutLinkType.erc721 ||
		linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155
	) {
		assert(numberOfLinks == 1, 'can only send one ERC721 or ERC1155 at a time')
		assert('tokenId' in linkDetails, 'tokenId needed')
	}
	assert(
		!(
			linkDetails.tokenType == interfaces.EPeanutLinkType.erc20 ||
			linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155
		) || linkDetails.tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
	)

	if (
		linkDetails.tokenType !== interfaces.EPeanutLinkType.native &&
		linkDetails.tokenAddress === '0x000000cl0000000000000000000000000000000000'
	) {
		throw new Error('need to provide tokenAddress if tokenType is not 0')
	}

	const tokenAmountString = trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals) // v5
	assert(tokenAmountBigNum.gt(0), 'tokenAmount must be greater than 0')

	return linkDetails
}

/**
 * Generates a link with the specified parameters
 */
async function createLink({
	structSigner,
	linkDetails,
	peanutContractVersion = null,
	password = null,
}: interfaces.ICreateLinkParams): Promise<interfaces.ICreatedPeanutLink> {
	if (peanutContractVersion == null) {
		getLatestContractVersion({ chainId: linkDetails.chainId.toString(), type: 'normal' })
	}
	password = password || (await getRandomString(16))
	linkDetails = validateLinkDetails(linkDetails, [password], 1)
	const provider = structSigner.signer.provider

	// Prepare the transactions
	let prepareTxsResponse
	try {
		prepareTxsResponse = await prepareTxs({
			address: await structSigner.signer.getAddress(),
			linkDetails,
			peanutContractVersion,
			numberOfLinks: 1,
			passwords: [password],
			provider: provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_PREPARING_TX, error)
	}

	// Sign and submit the transactions sequentially
	const signedTxs = []
	for (const unsignedTx of prepareTxsResponse.unsignedTxs) {
		try {
			const signedTx = await signAndSubmitTx({ structSigner, unsignedTx })
			signedTxs.push(signedTx)
			config.verbose && console.log('awaiting tx to be mined...')
			await signedTx.tx.wait()
			config.verbose && console.log('mined tx: ', signedTx.tx)
		} catch (error) {
			throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_SIGNING_AND_SUBMITTING_TX, error)
		}
	}

	// Get the links from the transactions
	let linksFromTxResp
	try {
		linksFromTxResp = await getLinksFromTx({
			linkDetails,
			txHash: signedTxs[signedTxs.length - 1].txHash,
			passwords: [password],
			provider: provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_GETTING_LINKS_FROM_TX, error)
	}

	return {
		link: linksFromTxResp.links,
		txHash: signedTxs[signedTxs.length - 1].txHash,
	}
}

async function createLinks({
	structSigner,
	linkDetails,
	numberOfLinks = 2,
	peanutContractVersion = null,
	passwords = null,
}: interfaces.ICreateLinksParams): Promise<interfaces.ICreatedPeanutLink[]> {
	if (peanutContractVersion == null) {
		getLatestContractVersion({ chainId: linkDetails.chainId.toString(), type: 'normal' })
	}
	passwords = passwords || (await Promise.all(Array.from({ length: numberOfLinks }, () => getRandomString(16))))
	linkDetails = validateLinkDetails(linkDetails, passwords, numberOfLinks)
	const provider = structSigner.signer.provider

	// Prepare the transactions
	let prepareTxsResponse
	try {
		prepareTxsResponse = await prepareTxs({
			address: await structSigner.signer.getAddress(),
			linkDetails,
			peanutContractVersion,
			numberOfLinks: numberOfLinks,
			passwords: passwords,
			provider: provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_PREPARING_TX, error)
	}

	// Sign and submit the transactions
	const signedTxs = []
	for (const unsignedTx of prepareTxsResponse.unsignedTxs) {
		try {
			const signedTx = await signAndSubmitTx({ structSigner, unsignedTx })
			signedTxs.push(signedTx)
			await signedTx.tx.wait()
		} catch (error) {
			throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_SIGNING_AND_SUBMITTING_TX, error)
		}
	}

	config.verbose && console.log('signedTxs: ', signedTxs)
	let linksFromTxResp: interfaces.IGetLinkFromTxResponse
	try {
		linksFromTxResp = await getLinksFromTx({
			linkDetails,
			txHash: signedTxs[signedTxs.length - 1].txHash,
			passwords: passwords,
			provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_GETTING_LINKS_FROM_TX, error)
	}
	const createdLinks = linksFromTxResp.links.map((link) => {
		return { link: link, txHash: signedTxs[signedTxs.length - 1].txHash }
	})

	return createdLinks
}

/**
 * Claims the contents of a link
 */
async function claimLink({
	structSigner,
	link,
	// maxPriorityFeePerGas = null,
	// gasLimit = null,
	// eip1559 = true,
	// maxFeePerGas = null,
	recipient = null,
}: interfaces.IClaimLinkParams): Promise<interfaces.IClaimLinkResponse> {
	// TODO: split into 2

	const signer = structSigner.signer
	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	if (recipient == null) {
		recipient = await signer.getAddress()
		config.verbose && console.log('recipient not provided, using signer address: ', recipient)
	}
	const keys = generateKeysFromString(password) // deterministically generate keys from password
	const contract = await getContract(String(chainId), signer, contractVersion)

	// cryptography
	const claimParams = await signWithdrawalMessage(
		contractVersion,
		chainId,
		contract.address,
		depositIdx,
		recipient,
		keys.privateKey
	)

	// Prepare transaction options
	let txOptions = {}
	txOptions = await setFeeOptions({
		txOptions,
		provider: signer.provider,
	})

	config.verbose && console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')

	// withdraw the deposit
	const tx = await contract.withdrawDeposit(...claimParams, txOptions)
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	const txReceipt = await tx.wait()

	return {
		txHash: txReceipt.transactionHash,
	}
}

/**
 * Claims the contents of a link as a sender. Can only be used if a link has not been claimed in a set time period.
 * (24 hours). Only works with links created with v4 of the contract. More gas efficient than claimLink.
 */
async function claimLinkSender({
	structSigner,
	depositIndex,
	contractVersion = null,
}: interfaces.IClaimLinkSenderParams): Promise<interfaces.IClaimLinkSenderResponse> {
	const signer = structSigner.signer
	const chainId = await signer.getChainId()
	const contract = await getContract(String(chainId), signer, contractVersion)
	if (contractVersion == null) {
		getLatestContractVersion({ chainId: chainId.toString(), type: 'normal' })
	}
	// Prepare transaction options
	let txOptions = {}
	try {
		txOptions = await setFeeOptions({
			provider: structSigner.signer.provider,
			eip1559: structSigner.eip1559,
			maxFeePerGas: structSigner.maxFeePerGas,
			maxPriorityFeePerGas: structSigner.maxPriorityFeePerGas,
			gasLimit: structSigner.gasLimit,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.ESignAndSubmitTx.ERROR_SETTING_FEE_OPTIONS,
			'Error setting the fee options',
			error
		)
	}

	config.verbose && console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')

	// withdraw the deposit
	let tx
	try {
		tx = await contract.withdrawDepositSender(depositIndex, txOptions)
		console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
		const txReceipt = await tx.wait()

		return {
			txHash: txReceipt.transactionHash,
		}
	} catch (error) {
		if (error.error.reason.includes('NOT 24 HOURS YET')) {
			throw new Error('Link cannot be claimed yet, please wait 24 hours from creation time')
		}
	}
}

/**
 * Gets all deposits for a given signer and chainId.
 *
 */
async function getAllDepositsForSigner({
	signer,
	chainId,
	contractVersion = null,
}: {
	signer: ethers.providers.JsonRpcSigner
	chainId: string
	contractVersion?: string
	verbose?: boolean
}) {
	if (contractVersion == null) {
		getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}
	const contract = await getContract(chainId, signer, contractVersion)
	const address = await signer.getAddress()
	return await contract.getAllDepositsForAddress(address)
}

/**
 * Generates payload to claim the link from peanut vault on the chain where the link was created
 * @param link pure url that was sent to the recipient
 * @param recipientAddress where to send the link's contents
 * @param onlyRecipientMode for v4.2+ peanut only. If true, only the recipient address will be able to perform the withdrawal
 * @returns prepared payload
 */
async function createClaimPayload(link: string, recipientAddress: string, onlyRecipientMode?: boolean) {
	/* internal utility function to create the payload for claiming a link */
	const params = getParamsFromLink(link)
	const password = params.password
	const keys = generateKeysFromString(password) // deterministically generate keys from password

	// cryptography
	const claimParams = await signWithdrawalMessage(
		params.contractVersion,
		params.chainId,
		getContractAddress(params.chainId, params.contractVersion),
		params.depositIdx,
		recipientAddress,
		keys.privateKey,
		onlyRecipientMode
	)

	return {
		claimParams,
		chainId: params.chainId,
		contractVersion: params.contractVersion,
	}
}

/**
 * Genereates payload to claim the link to a chain different to the chain on which it was created
 * @param param0 all the arguments
 * @returns payload that can be then passed to populateXChainClaimTx to generate a transaction
 */
async function createClaimXChainPayload({
	isMainnet = true,
	squidRouterUrl, // accepts an entire url to allow integrators to use their own api
	link,
	recipient,
	destinationChainId,
	destinationToken,
	slippage,
}: interfaces.ICreateClaimXChainPayload): Promise<interfaces.IXchainClaimPayload> {
	const linkParams = peanut.getParamsFromLink(link)
	const chainId = linkParams.chainId
	const contractVersion = linkParams.contractVersion
	const password = linkParams.password

	if (contractVersion !== 'v4.2') {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNSUPPORTED_CONTRACT_VERSION,
			`Unsupported contract version ${contractVersion}`
		)
	}
	const keys = peanut.generateKeysFromString(password)

	const linkDetails = await peanut.getLinkDetails({ link: link })
	if (destinationToken === null) destinationToken = linkDetails.tokenAddress
	console.log('destination token', destinationToken)

	// get wei of amount being withdrawn and send as string (e.g. "10000000000000000")
	const tokenAmount = parseFloat(linkDetails.tokenAmount) * Math.pow(10, linkDetails.tokenDecimals)
	config.verbose && console.log('Getting squid info..')

	const route = await getSquidRoute({
		squidRouterUrl,
		fromChain: chainId,
		fromToken: linkDetails.tokenAddress,
		fromAmount: String(tokenAmount),
		toChain: destinationChainId,
		toToken: destinationToken,
		fromAddress: recipient,
		toAddress: recipient,
		slippage,
	})

	config.verbose && console.log('Squid route calculated :)', { route })

	// cryptography
	const routerContractVersion = 'R' + linkDetails.contractVersion
	const squidAddress = isMainnet ? SQUID_ADDRESS['mainnet'] : SQUID_ADDRESS['testnet']
	const vaultAddress = getContractAddress(linkDetails.chainId, linkDetails.contractVersion)
	const routerAddress = getContractAddress(linkDetails.chainId, routerContractVersion)
	const normalWithdrawalPayload = await createClaimPayload(link, routerAddress, true)

	const routingArgs = [
		'0x1900',
		routerAddress,
		linkDetails.chainId,
		vaultAddress,
		linkDetails.depositIndex,
		squidAddress,
		route.value,
		0, // currently we are not charging any fees
		route.calldata,
	]
	config.verbose && console.log('Routing args', routingArgs)

	const packedRoutingData = ethers.utils.solidityPack(
		[
			'bytes2', // 0x1900 as per EIP-191
			'address', // peanut router address
			'uint256', // chain id
			'address', // peanut vault address
			'uint256', // deposit index
			'address', // squid address
			'uint256', // squid fee
			'uint256', // peanut fee
			'bytes', // squid calldata
		],
		routingArgs
	)
	config.verbose && console.log('Packed routing data %s', packedRoutingData)

	const xchainDigest = ethers.utils.solidityKeccak256(['bytes'], [packedRoutingData])
	config.verbose && console.log('X chain digest', xchainDigest)

	// const signingKey = new SigningKey(keys.privateKey)
	const wallet = new ethers.Wallet(keys.privateKey)
	const routingSignatureRaw = wallet._signingKey().signDigest(ethers.utils.arrayify(xchainDigest))
	const routingSignature = routingSignatureRaw.r + routingSignatureRaw.s.slice(2) + routingSignatureRaw.v.toString(16)
	config.verbose && console.log(`Peanut routing signature:`, { routingSignature: routingSignatureRaw })

	// Withdrawal signature is the last element
	const withdrawalSignature = normalWithdrawalPayload.claimParams[normalWithdrawalPayload.claimParams.length - 1]
	const result: interfaces.IXchainClaimPayload = {
		chainId,
		contractVersion: routerContractVersion,
		peanutAddress: vaultAddress,
		depositIndex: linkDetails.depositIndex,
		withdrawalSignature,
		squidFee: route.value,
		peanutFee: BigNumber.from(0),
		squidData: route.calldata,
		routingSignature,
	}
	config.verbose && console.log('XChain Payload finalized. Values: ', result)
	return result
}

/**
 * Populates a transaction (value, to, calldata) to claim a link cross-chain
 * @param param0 payload and provider
 * @returns transaction request
 */
async function populateXChainClaimTx({
	payload,
	provider,
}: interfaces.IPopulateXChainClaimTxParams): Promise<TransactionRequest> {
	if (!provider) provider = await getDefaultProvider(String(payload.chainId))
	const contract = await getContract(String(payload.chainId), provider, payload.contractVersion) // get the contract instance
	const preparedArgs: any[] = [
		payload.peanutAddress,
		payload.depositIndex,
		payload.withdrawalSignature,
		payload.squidFee,
		payload.peanutFee,
		payload.squidData,
		payload.routingSignature,
	]
	let unsignedTx: ethers.providers.TransactionRequest
	try {
		unsignedTx = await contract.populateTransaction.withdrawAndBridge(...preparedArgs)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR,
			error,
			'Error making a withdrawAndBridge transaction'
		)
	}
	unsignedTx.value = payload.squidFee
	return unsignedTx
}

/**
 * Gets the details of a Link: what token it is, how much it holds, etc.
 */
async function getLinkDetails({ link, provider }: interfaces.IGetLinkDetailsParams) {
	config.verbose && console.log('getLinkDetails called with link: ', link)
	assert(link, 'link arg is required')

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	provider = provider || (await getDefaultProvider(String(chainId)))
	// check that chainID and provider network are the same, else console log warning
	const network = await provider.getNetwork()
	if (network.chainId != Number(chainId)) {
		console.warn('WARNING: chainId and provider network are different')
	}
	const contract = await getContract(chainId.toString(), provider, contractVersion)

	config.verbose && console.log('fetching deposit: ', depositIdx)
	let deposit,
		attempts = 0
	while (!deposit && attempts++ < 5) {
		try {
			deposit = await contract.deposits(depositIdx)
		} catch (error) {
			console.log(`Attempt ${attempts} failed. Retrying...`)
			await new Promise((resolve) => setTimeout(resolve, 500))
		}
	}
	if (!deposit) throw new Error('Failed to fetch deposit after 5 attempts')
	config.verbose && console.log('deposit: ', deposit)

	let tokenAddress = deposit.tokenAddress
	const tokenType = deposit.contractType
	const senderAddress = deposit.senderAddress

	let claimed = false
	if (['v2', 'v4'].includes(contractVersion)) {
		if (deposit.pubKey20 == '0x0000000000000000000000000000000000000000') {
			claimed = true
		}
		config.verbose && console.log('Pre-4.2 claim checking behaviour, claimed:', claimed)
	} else {
		// v4.2+
		claimed = deposit.claimed
		config.verbose && console.log('v4.2+ claim checking behaviour, claimed:', claimed)
	}

	let depositDate: Date | null = null
	if (['v4', 'v4.2'].includes(contractVersion)) {
		if (deposit.timestamp) {
			depositDate = new Date(deposit.timestamp * 1000)
			if (deposit.timestamp == 0) {
				depositDate = null
			}
		} else {
			config.verbose && console.log('No timestamp found in deposit for version', contractVersion)
		}
	}

	let tokenAmount = '0'
	let tokenDecimals = null
	let symbol = null
	let name = null
	let tokenURI = null
	let metadata = null

	if (tokenType == interfaces.EPeanutLinkType.native) {
		config.verbose && console.log('tokenType is 0, setting tokenAddress to zero address')
		tokenAddress = ethers.constants.AddressZero
	}
	if (tokenType == interfaces.EPeanutLinkType.native || tokenType == interfaces.EPeanutLinkType.erc20) {
		config.verbose &&
			console.log('finding token details for token with address: ', tokenAddress, ' on chain: ', chainId)
		const chainDetails = TOKEN_DETAILS.find((chain) => chain.chainId === String(chainId))
		if (!chainDetails) {
			throw new Error("Couldn't find details for this token")
		}

		const tokenDetails = chainDetails.tokens.find(
			(token) => token.address.toLowerCase() === tokenAddress.toLowerCase()
		)

		// If token details not found in TOKEN_DETAILS, fetch them from the contract
		if (!tokenDetails) {
			try {
				const contractERC20 = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
				const [fetchedSymbol, fetchedName, fetchedDecimals] = await Promise.all([
					contractERC20.symbol(),
					contractERC20.name(),
					contractERC20.decimals(),
				])
				symbol = fetchedSymbol
				name = fetchedName
				tokenDecimals = fetchedDecimals
				tokenAmount = ethers.utils.formatUnits(deposit.amount, tokenDecimals)
			} catch (error) {
				console.error('Error fetching ERC20 info:', error)
			}
		} else {
			symbol = tokenDetails.symbol
			name = tokenDetails.name
			tokenDecimals = tokenDetails.decimals
			tokenAmount = ethers.utils.formatUnits(deposit.amount, tokenDecimals)
		}
	} else if (tokenType == interfaces.EPeanutLinkType.erc721) {
		try {
			const contract721 = new ethers.Contract(tokenAddress, ERC721_ABI, provider)
			const [fetchedName, fetchedSymbol, fetchedTokenURI] = await Promise.all([
				contract721.name(),
				contract721.symbol(),
				contract721.tokenURI(deposit.tokenId),
			])
			name = fetchedName
			symbol = fetchedSymbol
			tokenURI = fetchedTokenURI

			const response = await fetch(tokenURI)
			if (response.ok) {
				metadata = await response.json()
			}
			tokenDecimals = null
		} catch (error) {
			console.error('Error fetching ERC721 info:', error)
		}
		tokenAmount = '1'
	} else if (tokenType == interfaces.EPeanutLinkType.erc1155) {
		try {
			const contract1155 = new ethers.Contract(tokenAddress, ERC1155_ABI, provider)
			const fetchedTokenURI = await contract1155.tokenURI(deposit.tokenId)
			tokenURI = fetchedTokenURI

			const response = await fetch(tokenURI)
			if (response.ok) {
				metadata = await response.json()
			}
			name = 'ERC1155 Token (' + deposit.tokenId + ')'
			symbol = '1155'
			tokenDecimals = null
		} catch (error) {
			console.error('Error fetching ERC1155 info:', error)
		}
		tokenAmount = '1'
	}

	// format deposit to string values
	const depositCopy = {}
	for (const key in deposit) {
		if (isNaN(Number(key))) {
			// Only copy named properties
			depositCopy[key] = deposit[key].toString()
		}
	}

	return {
		link: link,
		chainId: chainId,
		depositIndex: depositIdx,
		contractVersion: contractVersion,
		password: password,
		senderAddress: senderAddress,
		tokenType: deposit.contractType,
		tokenAddress: deposit.tokenAddress,
		tokenDecimals: tokenDecimals,
		tokenSymbol: symbol,
		tokenName: name,
		tokenAmount: tokenAmount,
		tokenId: ethers.BigNumber.from(deposit.tokenId).toNumber(),
		claimed: claimed,
		depositDate: depositDate,
		tokenURI: tokenURI,
		metadata: metadata,
		rawOnchainDepositInfo: depositCopy,
	}
}

async function resolveToENSName({
	address,
	provider = null,
}: {
	address: string
	provider?: ethers.providers.Provider
}) {
	if (provider == null) {
		provider = await getDefaultProvider('1')
	}
	const ensName = await provider.lookupAddress(address)
	return ensName
}

/**
 * Claims a link through the Peanut API
 */
async function claimLinkGasless({
	link,
	recipientAddress,
	APIKey,
	baseUrl = 'https://api.peanut.to/claim-v2',
}: interfaces.IClaimLinkGaslessParams) {
	config.verbose && console.log('claiming link through Peanut API...')
	const payload = await createClaimPayload(link, recipientAddress)
	config.verbose && console.log('payload: ', payload)

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		claimParams: payload.claimParams,
		chain: payload.chainId,
		version: payload.contractVersion,
		apiKey: APIKey,
	}

	// if axios error, return the error message

	const response = await fetch(baseUrl, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})

	config.verbose && console.log('response status: ', response.status)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	} else {
		return await response.json()
	}
}

/**
 * Claims a link x-chain through the Peanut API
 */
async function claimLinkXChainGasless({
	link,
	recipientAddress,
	APIKey,
	baseUrl = 'https://api.peanut.to/claim-x-chain',
	destinationChainId,
	destinationToken = null,
	squidRouterUrl,
	isMainnet = true,
	slippage,
}: interfaces.IClaimLinkXChainGaslessParams): Promise<interfaces.IClaimLinkXChainGaslessResponse> {
	const payload = await createClaimXChainPayload({
		isMainnet,
		destinationChainId,
		destinationToken: destinationToken,
		link: link,
		recipient: recipientAddress,
		squidRouterUrl,
		slippage,
	})

	const claimParams = {
		apiKey: APIKey,
		chainId: payload.chainId,
		contractVersion: payload.contractVersion,
		peanutAddress: payload.peanutAddress,
		depositIndex: payload.depositIndex,
		withdrawalSignature: payload.withdrawalSignature,
		squidFee: payload.squidFee.toString(),
		peanutFee: payload.peanutFee.toString(),
		squidData: payload.squidData,
		routingSignature: payload.routingSignature,
	}

	const claimResponse = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(claimParams),
	})
	const data = await claimResponse.json()
	console.log('Claim x-chain response', { data })
	return { txHash: data.txHash }
}

async function getSquidChains({ isTestnet }: { isTestnet: boolean }): Promise<interfaces.ISquidChain[]> {
	// TODO rate limits? Caching?
	const url = isTestnet
		? 'https://testnet.v2.api.squidrouter.com/v2/chains'
		: 'https://v2.api.squidrouter.com/v2/chains'
	try {
		const response = await fetch(url, {
			headers: {
				// 'x-integrator-id': 'peanut-api',
				'x-integrator-id': '11CBA45B-5EE9-4331-B146-48CCD7ED4C7C',
			},
		})
		if (response.ok) {
			const data = await response.json()
			if (data && Array.isArray(data.chains)) {
				return data.chains
			} else {
				throw new interfaces.SDKStatus(
					interfaces.EXChainStatusCodes.ERROR_GETTING_CHAINS,
					'Failed to get x-chain chains'
				)
			}
		} else {
			throw new interfaces.SDKStatus(
				interfaces.EXChainStatusCodes.ERROR_GETTING_CHAINS,
				'Failed to get x-chain chains'
			)
		}
	} catch (error) {
		throw error
	}
}

async function getSquidTokens({ isTestnet }: { isTestnet: boolean }): Promise<interfaces.ISquidToken[]> {
	// TODO rate limits? Caching?
	// const url = isTestnet ? 'https://testnet.api.squidrouter.com/v1/tokens' : 'https://api.squidrouter.com/v1/tokens'
	const url = isTestnet
		? 'https://testnet.v2.api.squidrouter.com/v2/tokens'
		: 'https://v2.api.squidrouter.com/v2/tokens'

	try {
		const response = await fetch(url, {
			headers: {
				// 'x-integrator-id': 'peanut-api',
				'x-integrator-id': '11CBA45B-5EE9-4331-B146-48CCD7ED4C7C',
			},
		})
		if (response.ok) {
			const data = await response.json()
			if (data && Array.isArray(data.tokens)) {
				return data.tokens
			} else {
				throw new interfaces.SDKStatus(
					interfaces.EXChainStatusCodes.ERROR_GETTING_CHAINS,
					'Failed to get x-chain tokens'
				)
			}
		} else {
			throw new interfaces.SDKStatus(
				interfaces.EXChainStatusCodes.ERROR_GETTING_CHAINS,
				'Failed to get x-chain tokens'
			)
		}
	} catch (error) {
		throw error
	}
}

async function getXChainOptionsForLink({
	isTestnet,
	sourceChainId,
	tokenType,
}: interfaces.IGetCrossChainOptionsForLinkParams): Promise<
	Array<interfaces.ISquidChain & { tokens: interfaces.ISquidToken[] }>
> {
	if (tokenType > 1) {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_WRONG_LINK_TYPE,
			'Unsupported link type - can not bridge this link'
		)
	}

	const supportedChains = await getSquidChains({ isTestnet })

	const isSourceChainSupported = supportedChains.some((chain) => chain.chainId.toString() === sourceChainId)

	if (!isSourceChainSupported) {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNSUPPORTED_CHAIN,
			'Unsupported chain - can not bridge from this chain'
		)
	}

	const supportedTokens = await getSquidTokens({ isTestnet })

	const supportedTokensMap = new Map<number, interfaces.ISquidToken[]>()

	supportedTokens.forEach(({ chainId, address, name, symbol, logoURI }) => {
		if (!supportedTokensMap.has(chainId)) {
			supportedTokensMap.set(chainId, [])
		}
		supportedTokensMap.get(chainId)?.push({ chainId, address, name, symbol, logoURI })
	})

	const destinationChains = supportedChains
		.filter((chain) => chain.chainId.toString() !== sourceChainId && chain.chainType === 'evm')
		.map(({ chainId, axelarChainName, chainType, chainIconURI }) => ({
			chainId,
			axelarChainName,
			chainType,
			chainIconURI,
		}))

	const chainsWithTokens = destinationChains.map((chain) => {
		const chainId = chain.chainId
		const tokens = supportedTokensMap.get(chainId) || []
		return { ...chain, tokens }
	})

	return chainsWithTokens
}

/**
 * Gets raw json data about a squid route
 */
async function getSquidRouteRaw({
	squidRouterUrl,
	fromChain,
	fromToken,
	fromAmount,
	toChain,
	toToken,
	fromAddress,
	toAddress,
	slippage,
	enableForecall = true,
	enableBoost = true,
}: interfaces.IGetSquidRouteParams): Promise<any> {
	// have a default for squidRouterUrl
	if (squidRouterUrl === undefined) squidRouterUrl = getSquidRouterUrl(true, true)

	config.verbose && console.log('Using url for squid route call : ', squidRouterUrl)

	if (fromToken == '0x0000000000000000000000000000000000000000') {
		// Update for Squid compatibility
		config.verbose && console.log('Source token is 0x0000, converting to 0xEeee..')
		fromToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	if (toToken == '0x0000000000000000000000000000000000000000') {
		// Update for Squid compatibility
		config.verbose && console.log('Destination token is 0x0000, converting to 0xEeee..')
		toToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	// https://docs.squidrouter.com/squid-v1-docs-cosmos/api/get-a-route
	const params = {
		fromChain,
		fromToken,
		fromAmount,
		toChain,
		toToken,
		fromAddress,
		toAddress,
		// optionally set slippage manually, this will override slippageConfig
		slippageConfig: {
			slippage: slippage, // slippage in %
			autoMode: 1, // ignored if manual slippage is set,
		},
		enableForecall,
		enableBoost,
	}

	config.verbose && console.log('Getting squid route with params', params)

	try {
		const response: Response = await fetch(squidRouterUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-integrator-id': '11CBA45B-5EE9-4331-B146-48CCD7ED4C7C',
			},
			body: JSON.stringify(params),
		})

		if (!response.ok) {
			console.error(`Squid route endpoint ${squidRouterUrl} returned status: `, response.status)
			const responseBody = await response.text()
			console.error('Full response body: ', responseBody)
			throw new interfaces.SDKStatus(interfaces.EXChainStatusCodes.ERROR_GETTING_ROUTE, responseBody)
		}

		const data = await response.json()
		console.log('All squid data', data)
		return data
	} catch (error) {
		throw error
	}
}

/**
 * Gets a squid route
 */
async function getSquidRoute(args: interfaces.IGetSquidRouteParams): Promise<interfaces.ISquidRoute> {
	const data = await getSquidRouteRaw(args)
	if (data && data.route) {
		config.verbose && console.log('Squid route: ', data.route)
		return {
			value: BigNumber.from(data.route.transactionRequest.value),
			calldata: data.route.transactionRequest.data,
		}
	}

	// implicit else
	throw new interfaces.SDKStatus(
		interfaces.EXChainStatusCodes.ERROR_UNDEFINED_DATA,
		'Undefined data received from Squid API'
	)
}

function calculateCombinedPayloadHash(transactionRequest, recipient) {
	const squidDataHash = ethers.utils.solidityKeccak256(['address'], [transactionRequest.data])

	// Combine into an single block and hash again
	const combinedPayload = ethers.utils.solidityPack(
		['address', 'address', 'bytes32', 'uint256'],
		[recipient, transactionRequest.targetAddress, squidDataHash, transactionRequest.value]
	)

	const hash1 = ethers.utils.solidityKeccak256(['address'], [combinedPayload])
	console.log('hash1: ', hash1)

	return peanut.solidityHashBytesEIP191(ethers.utils.arrayify(hash1))
}

function toggleVerbose(verbose?: boolean) {
	if (verbose !== undefined) {
		config.verbose = verbose
	} else {
		config.verbose = !config.verbose
	}
	console.log('Peanut-SDK: toggled verbose mode to: ', config.verbose)
}

/*
please note that a contract version has to start with 'v' and a batcher contract version has to start with 'Bv'. We support major & inor versions (e.g. v1.0, v1.1, v2.0, v2.1, but not v1.0.1)
*/
function getLatestContractVersion({
	chainId,
	type,
	experimental = false,
}: {
	chainId: string
	type: 'normal' | 'batch'
	experimental?: boolean
}): string {
	try {
		const data = PEANUT_CONTRACTS

		const chainData = data[chainId as unknown as keyof typeof data]

		// Filter keys starting with "v" or "Bv" based on type
		let versions = Object.keys(chainData)
			.filter((key) => key.startsWith(type === 'batch' ? 'Bv' : 'v'))
			.sort((a, b) => {
				const partsA = a.substring(1).split('.').map(Number)
				const partsB = b.substring(1).split('.').map(Number)

				// Compare major version first
				if (partsA[0] !== partsB[0]) {
					return partsB[0] - partsA[0]
				}

				// If major version is the same, compare minor version (if present)
				return (partsB[1] || 0) - (partsA[1] || 0)
			})

		// Adjust the filtering logic based on the experimental flag and contract version variables
		if (!experimental && type === 'normal') {
			versions = versions.filter((version) => version.startsWith(LATEST_STABLE_CONTRACT_VERSION))

			if (versions.length === 0) {
				versions = [FALLBACK_CONTRACT_VERSION]
			}

			if (LATEST_STABLE_CONTRACT_VERSION !== LATEST_EXPERIMENTAL_CONTRACT_VERSION) {
				versions = versions.filter((version) => version !== LATEST_EXPERIMENTAL_CONTRACT_VERSION)
			}
		}

		const highestVersion = versions[0]

		config.verbose && console.log('latest contract version: ', highestVersion)
		return highestVersion
	} catch (error) {
		throw new Error('Failed to get latest contract version')
	}
}

async function getAllUnclaimedDepositsWithIdxForAddress({
	address,
	chainId,
	peanutContractVersion,
	provider = null,
	claimedOnly = true,
}: interfaces.IGetAllUnclaimedDepositsWithIdxForAddressParams): Promise<any[]> {
	if (provider == null) {
		provider = await getDefaultProvider(chainId)
	}

	if (!['v4', 'v4.2'].includes(peanutContractVersion)) {
		console.error('ERROR: can only return unclaimed deposits for v4+ contracts')
		return
	}

	config.verbose &&
		console.log(
			'getAllUnclaimedDepositsWithIdxForAddress called with address: ',
			address,
			' on chainId: ',
			chainId,
			' at peanutContractVersion: ',
			peanutContractVersion
		)

	const contract = await getContract(chainId, provider, peanutContractVersion) // get the contract instance

	let addressDeposits = (await contract.getAllDepositsForAddress(address)).map((deposit: any) => {
		return {
			pubKey20: deposit.pubKey20,
			amount: deposit.amount,
			tokenAddress: deposit.tokenAddress,
			contractType: deposit.contractType,
			claimed: deposit.claimed,
			timestamp: deposit.timestamp,
			senderAddress: deposit.senderAddress,
		}
	}) // get all address deposits

	// filter out deposits not made by the address
	addressDeposits = addressDeposits.filter((deposit: any) => {
		return deposit.senderAddress.toString() == address.toString()
	})

	config.verbose && console.log('all deposits made by address: ', addressDeposits)

	if (claimedOnly) {
		addressDeposits = addressDeposits.filter((transaction) => {
			const amount = BigInt(transaction.amount._hex)
			return !transaction.claimed && amount > BigInt(0)
		})
		config.verbose && console.log('all unclaimed deposits made by address: ', addressDeposits)
	} // filter out claimed deposits

	const mappedDeposits = (await contract.getAllDeposits()).map((deposit: any) => {
		return {
			pubKey20: deposit.pubKey20,
			amount: deposit.amount,
			tokenAddress: deposit.tokenAddress,
			contractType: deposit.contractType,
			claimed: deposit.claimed,
			timestamp: deposit.timestamp,
			senderAddress: deposit.senderAddress,
		}
	}) // get all deposits to map idxs

	mappedDeposits.map((deposit: any, idx) => {
		addressDeposits.map((addressDeposit: any) => {
			if (compareDeposits(deposit, addressDeposit)) {
				addressDeposit.idx = idx
			}
		})
	}) // map the idxs from all deposits to the address deposits

	config.verbose && console.log('all deposits by address with idx', addressDeposits)

	return addressDeposits
}

async function claimAllUnclaimedAsSenderPerChain({
	structSigner,
	peanutContractVersion = null,
}: interfaces.IClaimAllUnclaimedAsSenderPerChainParams): Promise<string[]> {
	const chainId = (await structSigner.signer.getChainId()).toString()
	const address = await structSigner.signer.getAddress()
	const provider = structSigner.signer.provider as ethers.providers.JsonRpcProvider

	if (peanutContractVersion == null) {
		peanutContractVersion = getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}

	const addressDepositsWithIdx = await getAllUnclaimedDepositsWithIdxForAddress({
		address: address,
		chainId: chainId,
		provider: provider,
		peanutContractVersion,
	})
	const txHashes: string[] = []

	config.verbose && console.log(addressDepositsWithIdx)

	for (const deposit of addressDepositsWithIdx) {
		try {
			const tx = await claimLinkSender({
				structSigner,
				depositIndex: deposit.idx,
				contractVersion: peanutContractVersion,
			})
			txHashes.push(tx.txHash)
		} catch (error) {
			console.log('error claiming link with deposit idx: ', deposit.idx, ' error: ', error)
		}
	}

	config.verbose && console.log(txHashes)

	return txHashes
}

// Returns args to be passed to makeDepositWithAuthorization function
// and a EIP-712 message to be signed
async function makeGaslessDepositPayload({
	address,
	contractVersion,
	linkDetails,
	password,
}: interfaces.IPrepareGaslessDepositParams): Promise<interfaces.IMakeGaslessDepositPayloadResponse> {
	if (!PeanutsWithEIP3009.includes(contractVersion)) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: this Peanut version does not support gasless deposits'
		)
	}

	if (linkDetails.tokenType !== interfaces.EPeanutLinkType.erc20) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: only erc20 tokens are currently supported for gasless deposits'
		)
	}

	if (!linkDetails.tokenAddress || !linkDetails.tokenDecimals) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: token address and decimals must be provided'
		)
	}

	const chain3009Info = toLowerCaseKeys(EIP3009Tokens[linkDetails.chainId])
	if (!chain3009Info) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: there are no known EIP-3009 compliant tokens on this chain'
		)
	}

	const tokenDomain = chain3009Info[linkDetails.tokenAddress.toLowerCase()]

	if (!tokenDomain) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: token with the given address does not support EIP-3009'
		)
	}

	const peanutContract = await getContract(linkDetails.chainId.toString(), null, contractVersion)
	const uintAmount = ethers.utils.parseUnits(linkDetails.tokenAmount.toString(), linkDetails.tokenDecimals)
	const randomNonceInt = Math.floor(Math.random() * 1e12)
	const randomNonceHex = '0x' + randomNonceInt.toString(16).padStart(64, '0')

	const { address: pubKey20 } = generateKeysFromString(password)
	const nonceWithPubKeyHex = ethers.utils.solidityKeccak256(['address', 'bytes32'], [pubKey20, randomNonceHex])

	const nowSeconds = Math.floor(Date.now() / 1000)
	const validAfter = BigNumber.from(nowSeconds)
	const validBefore = validAfter.add(3600) // valid for 1 hour

	const payload: interfaces.IGaslessDepositPayload = {
		chainId: linkDetails.chainId,
		contractVersion: contractVersion,
		tokenAddress: linkDetails.tokenAddress,
		from: address,
		uintAmount,
		pubKey20,
		nonce: randomNonceHex, // nonce without pubkey. Pubkey will be added inside the peanut contract
		validAfter,
		validBefore,
	}

	const message: interfaces.IPreparedEIP712Message = {
		types: ReceiveWithAuthorizationTypes,
		primaryType: 'ReceiveWithAuthorization',
		domain: tokenDomain,
		values: {
			from: address,
			to: peanutContract.address,
			value: uintAmount,
			validAfter,
			validBefore,
			nonce: nonceWithPubKeyHex, // nonce WITH the pubkey. This is what the user will sign
		},
	}

	return { payload, message }
}

async function prepareGaslessDepositTx({
	provider,
	payload,
	signature,
}: interfaces.IPrepareGaslessDepositTxParams): Promise<TransactionRequest> {
	if (!provider) provider = await getDefaultProvider(String(payload.chainId))

	const contract = await getContract(String(payload.chainId), provider, payload.contractVersion) // get the contract instance
	const puresig = signature.slice(2) // remove 0x prefix
	const preparedPayload: any[] = [
		payload.tokenAddress,
		payload.from,
		payload.uintAmount,
		payload.pubKey20,
		payload.nonce,
		payload.validAfter,
		payload.validBefore,
		BigNumber.from(`0x${puresig.slice(64 * 2)}`), // v
		`0x${puresig.slice(0, 32 * 2)}`, // r
		`0x${puresig.slice(32 * 2, 64 * 2)}`, // s
	]
	let unsignedTx: ethers.providers.TransactionRequest
	try {
		unsignedTx = await contract.populateTransaction.makeDepositWithAuthorization(...preparedPayload)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
			error,
			'Error making the deposit to the contract'
		)
	}
	return unsignedTx
}

/**
 * Makes a gasless eip-3009 deposit through Peanut API
 */
async function makeDepositGasless({
	APIKey,
	baseUrl = 'https://api.peanut.to/deposit-3009',
	payload,
	signature,
}: interfaces.IMakeDepositGaslessParams) {
	config.verbose && console.log('depositing gaslessly through Peanut API...')
	config.verbose && console.log('payload: ', payload)

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		apiKey: APIKey,
		chainId: payload.chainId,
		contractVersion: payload.contractVersion,
		tokenAddress: payload.tokenAddress,
		from: payload.from,
		uintAmount: payload.uintAmount.toString(),
		pubKey20: payload.pubKey20,
		nonce: payload.nonce,
		validAfter: payload.validAfter.toString(),
		validBefore: payload.validBefore.toString(),
		signature,
	}

	// if axios error, return the error message

	const response = await fetch(baseUrl, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})

	config.verbose && console.log('response status: ', response.status)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	} else {
		return await response.json()
	}
}

// Returns args to be passed to withdrawDepositSenderGasless function
// and a EIP-712 message to be signed
async function makeGaslessReclaimPayload({
	address,
	contractVersion,
	depositIndex,
	chainId,
}: interfaces.IMakeGaslessReclaimPayloadParams): Promise<interfaces.IMakeGaslessReclaimPayloadResponse> {
	if (!PeanutsWithGaslessRevoke.includes(contractVersion)) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: this Peanut version does not support gasless revocations'
		)
	}
	const peanutVault = await getContract(chainId.toString(), null, contractVersion)

	const payload: interfaces.IGaslessReclaimPayload = {
		chainId: chainId,
		contractVersion: contractVersion,
		depositIndex,
		signer: address,
	}

	const peanutDomain: interfaces.EIP712Domain = {
		chainId,
		name: 'Peanut',
		version: contractVersion.slice(1), // contract version without 'v'
		verifyingContract: peanutVault.address,
	}

	const message: interfaces.IPreparedEIP712Message = {
		types: GaslessReclaimTypes,
		primaryType: 'GaslessReclaim',
		domain: peanutDomain,
		values: {
			depositIndex,
		},
	}

	return { payload, message }
}

async function prepareGaslessReclaimTx({
	provider,
	payload,
	signature,
}: interfaces.IPrepareGaslessReclaimTxParams): Promise<TransactionRequest> {
	if (!provider) provider = await getDefaultProvider(String(payload.chainId))

	const contract = await getContract(String(payload.chainId), provider, payload.contractVersion) // get the contract instance
	const preparedPayload: any[] = [[payload.depositIndex], payload.signer, signature]
	console.log('Prepared payload', { preparedPayload })
	let unsignedTx: ethers.providers.TransactionRequest
	try {
		unsignedTx = await contract.populateTransaction.withdrawDepositSenderGasless(...preparedPayload)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
			error,
			'Error making a gasless reclaim'
		)
	}
	return unsignedTx
}

/**
 * Makes a gasless eip-3009 deposit through Peanut API
 */
async function makeReclaimGasless({
	APIKey,
	baseUrl = 'https://api.peanut.to/reclaim',
	payload,
	signature,
}: interfaces.IMakeReclaimGaslessParams) {
	config.verbose && console.log('depositing gaslessly through Peanut API...')
	config.verbose && console.log('payload: ', payload)

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		apiKey: APIKey,
		chainId: payload.chainId,
		contractVersion: payload.contractVersion,
		depositIndex: payload.depositIndex,
		signer: payload.signer,
		signature,
	}

	// if axios error, return the error message

	const response = await fetch(baseUrl, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})

	config.verbose && console.log('response status: ', response.status)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	} else {
		return await response.json()
	}
}

const peanut = {
	CHAIN_DETAILS,
	LATEST_STABLE_BATCHER_VERSION,
	LATEST_STABLE_CONTRACT_VERSION,
	LATEST_EXPERIMENTAL_CONTRACT_VERSION,
	ERC1155_ABI,
	ERC20_ABI,
	ERC721_ABI,
	PEANUT_ABI_V4,
	PEANUT_BATCHER_ABI_V4,
	PEANUT_CONTRACTS,
	TOKEN_DETAILS,
	TOKEN_TYPES,
	VERSION,
	assert,
	calculateCombinedPayloadHash,
	claimAllUnclaimedAsSenderPerChain,
	claimLink,
	claimLinkGasless,
	claimLinkSender,
	claimLinkXChainGasless,
	config,
	createClaimPayload,
	createClaimXChainPayload,
	populateXChainClaimTx,
	createLink,
	createLinks,
	createMultiLinkFromLinks,
	detectContractVersionFromTxReceipt,
	estimateGasLimit,
	formatNumberAvoidScientific,
	generateKeysFromString,
	getAllDepositsForSigner,
	getAllUnclaimedDepositsWithIdxForAddress,
	getContract,
	getDefaultProvider,
	getDepositIdx,
	getDepositIdxs,
	getEIP1559Tip,
	getLatestContractVersion,
	getLinkDetails,
	getLinkFromParams,
	getLinksFromMultilink,
	getLinksFromTx,
	getParamsFromLink,
	getParamsFromPageURL,
	getRandomString,
	getSquidChains,
	getSquidRoute,
	getSquidRouteRaw,
	getSquidRouterUrl,
	getSquidTokens,
	getXChainOptionsForLink,
	greeting,
	hash_string,
	interfaces,
	makeDepositGasless,
	makeReclaimGasless,
	prepareTxs,
	resetProviderCache,
	setFeeOptions,
	signWithdrawalMessage,
	signAddress,
	signAndSubmitTx,
	signHash,
	signMessageWithPrivatekey,
	solidityHashAddress,
	solidityHashBytesEIP191,
	supportsEIP1559,
	toggleVerbose,
	trim_decimal_overflow,
	verifySignature,
	resolveToENSName,
	makeGaslessDepositPayload,
	prepareGaslessDepositTx,
	makeGaslessReclaimPayload,
	prepareGaslessReclaimTx,
	EIP3009Tokens,
}

export default peanut
export {
	peanut,
	CHAIN_DETAILS,
	LATEST_STABLE_BATCHER_VERSION,
	LATEST_STABLE_CONTRACT_VERSION,
	LATEST_EXPERIMENTAL_CONTRACT_VERSION,
	ERC1155_ABI,
	ERC20_ABI,
	ERC721_ABI,
	PEANUT_ABI_V4,
	PEANUT_BATCHER_ABI_V4,
	PEANUT_CONTRACTS,
	TOKEN_DETAILS,
	TOKEN_TYPES,
	VERSION,
	assert,
	calculateCombinedPayloadHash,
	claimAllUnclaimedAsSenderPerChain,
	claimLink,
	claimLinkGasless,
	claimLinkSender,
	claimLinkXChainGasless,
	config,
	createClaimPayload,
	createClaimXChainPayload,
	populateXChainClaimTx,
	createLink,
	createLinks,
	createMultiLinkFromLinks,
	detectContractVersionFromTxReceipt,
	estimateGasLimit,
	formatNumberAvoidScientific,
	generateKeysFromString,
	getAllDepositsForSigner,
	getAllUnclaimedDepositsWithIdxForAddress,
	getContract,
	getDefaultProvider,
	getDepositIdx,
	getDepositIdxs,
	getEIP1559Tip,
	getLatestContractVersion,
	getLinkDetails,
	getLinkFromParams,
	getLinksFromMultilink,
	getLinksFromTx,
	getParamsFromLink,
	getParamsFromPageURL,
	getRandomString,
	getSquidChains,
	getSquidRoute,
	getSquidRouteRaw,
	getSquidRouterUrl,
	getSquidTokens,
	getXChainOptionsForLink,
	greeting,
	hash_string,
	interfaces,
	makeDepositGasless,
	makeReclaimGasless,
	prepareTxs,
	resetProviderCache,
	setFeeOptions,
	signWithdrawalMessage,
	signAddress,
	signAndSubmitTx,
	signHash,
	signMessageWithPrivatekey,
	solidityHashAddress,
	solidityHashBytesEIP191,
	supportsEIP1559,
	toggleVerbose,
	trim_decimal_overflow,
	verifySignature,
	resolveToENSName,
	makeGaslessDepositPayload,
	prepareGaslessDepositTx,
	makeGaslessReclaimPayload,
	prepareGaslessReclaimTx,
	EIP3009Tokens,
}
