////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. This library is compatible with ethers v5, and
//  supports both node and browser environments.
//
/////////////////////////////////////////////////////////

import { BigNumber, Bytes, ethers } from 'ethersv5' // v5
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import {
	PEANUT_ABI_V3,
	PEANUT_ABI_V4,
	PEANUT_ABI_V5,
	PEANUT_BATCHER_ABI_V4,
	PEANUT_CONTRACTS,
	ERC20_ABI,
	ERC721_ABI,
	ERC1155_ABI,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	VERSION,
	DEFAULT_CONTRACT_VERSION,
	DEFAULT_BATCHER_VERSION,
	TOKEN_TYPES,
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
	signAddress,
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
} from './util.ts'

import * as interfaces from './consts/interfaces.consts.ts'

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

async function getDefaultProvider(chainId: string): Promise<ethers.providers.JsonRpcProvider> {
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

async function getContract(_chainId: string, signerOrProvider: any, version = DEFAULT_CONTRACT_VERSION) {
	if (signerOrProvider == null) {
		config.verbose && console.log('signerOrProvider is null, getting default provider...')
		signerOrProvider = await getDefaultProvider(_chainId)
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
		case 'v5':
			PEANUT_ABI = PEANUT_ABI_V5
			break
		default:
			throw new Error('Unable to find Peanut contract for this version, check for correct version or updated SDK')
	}

	// Find the contract address based on the chainId and version provided
	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const contractAddress = _PEANUT_CONTRACTS[chainId.toString()] && _PEANUT_CONTRACTS[chainId.toString()][version]

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
// 	let allowance = await getAllowanceERC20(tokenContract, spender, signerAddress, signer)

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
// 		let allowance = await getAllowanceERC20(tokenContract, spender, signerAddress, signer)
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
	contractVersion = DEFAULT_CONTRACT_VERSION
): Promise<ethers.providers.TransactionRequest | null> {
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
	contractVersion = DEFAULT_CONTRACT_VERSION
): Promise<ethers.providers.TransactionRequest | null> {
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

async function setFeeOptions({
	txOptions,
	provider,
	eip1559 = true, // provide a default value
	maxFeePerGas = null,
	maxFeePerGasMultiplier = 1.1,
	gasLimit = null,
	gasPriceMultiplier = 1.3,
	maxPriorityFeePerGas, // don't provide a default value here
	maxPriorityFeePerGasMultiplier = 1.5,
}: {
	txOptions?: any
	provider: any
	eip1559?: boolean
	maxFeePerGas?: ethers.BigNumber | null
	maxFeePerGasMultiplier?: number
	gasLimit?: ethers.BigNumber | null
	gasPriceMultiplier?: number
	maxPriorityFeePerGas?: ethers.BigNumber | null
	maxPriorityFeePerGasMultiplier?: number
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
	} else if (chainId == 56) {
		txOptions.gasLimit = ethers.BigNumber.from('1000000')
	}
	config.verbose && console.log('checking if eip1559 is supported...')

	// Check if EIP-1559 is supported
	// if on milkomeda or bnb, set eip1559 to false
	if (chainId === 2001 || chainId === 200101 || chainId === 56) {
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
			txOptions.maxPriorityFeePerGas =
				maxPriorityFeePerGas ||
				(
					(BigInt(feeData.maxPriorityFeePerGas.toString()) *
						BigInt(Math.round(maxPriorityFeePerGasMultiplier * 100))) /
					BigInt(100)
				).toString()

			// for some chains, like arbitrum or base, provider maxPriorityFeePerGas is returned wrongly. Sanity check so that it's never more than double the base fee
			if (BigInt(txOptions.maxPriorityFeePerGas) > lastBaseFeePerGas) {
				txOptions.maxPriorityFeePerGas = lastBaseFeePerGas.toString()
			}

			// for polygon (137), set priority fee to min 40 gwei (they have a minimum of 30 for spam prevention)
			if (chainId == 137) {
				const minPriorityFee = ethers.utils.parseUnits('40', 'gwei')
				if (ethers.BigNumber.from(txOptions.maxPriorityFeePerGas).lt(minPriorityFee)) {
					txOptions.maxPriorityFeePerGas = minPriorityFee.toString()
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
 */
async function prepareTxs({
	address,
	linkDetails,
	peanutContractVersion = DEFAULT_CONTRACT_VERSION,
	batcherContractVersion = DEFAULT_BATCHER_VERSION,
	numberOfLinks = 1,
	passwords = [],
	provider,
}: interfaces.IPrepareTxsParams): Promise<interfaces.IPrepareTxsResponse> {
	try {
		linkDetails = validateLinkDetails(linkDetails, passwords, numberOfLinks)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: please make sure all required fields are provided and valid'
		)
	}
	const tokenAmountString = trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals) // v5
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

	// HAVE TO SET FEE OPTIONS AT SIGNING TIME
	// set transaction options
	// try {
	// 	txOptions = await setFeeOptions({
	// 		txOptions,
	// 		provider: provider,
	// 		// TODO: setFeeOptions should take into account if chain supports eip1559? or should we just set this to empty?
	// 		// eip1559: structSigner.eip1559,
	// 		// maxFeePerGas: structSigner.maxFeePerGas,
	// 		// maxPriorityFeePerGas: structSigner.maxPriorityFeePerGas,
	// 		// gasLimit: structSigner.gasLimit,
	// 	})
	// } catch (error) {
	// 	console.error(error)
	// 	return {
	// 		unsignedTxs: [],
	// 		status: new interfaces.SDKStatus(
	// 			interfaces.EPrepareCreateTxsStatusCodes.ERROR_SETTING_FEE_OPTIONS,
	// 			'Error setting fee options'
	// 		),
	// 	}
	// }

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

		// TODO: this will fail if allowance is not enough
		// removing estimating gas limit from here
		// try {
		// 	const estimatedGasLimit = await estimateGasLimit(contract, 'makeDeposit', depositParams, txOptions)
		// 	if (estimatedGasLimit) {
		// 		txOptions.gasLimit = ethers.BigNumber.from(estimatedGasLimit.toString())
		// 	}
		// } catch (error) {
		// 	// do nothing
		// 	config.verbose && console.log('Error estimating gas limit:', error)
		// }
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

		// HAVE TO ESTIMATE GAS IN SIGNING PROCESS
		// let estimatedGasLimit
		// try {
		// 	estimatedGasLimit = await estimateGasLimit(contract, 'batchMakeDeposit', depositParams, txOptions)
		// } catch (error) {
		// 	console.error(error)
		// 	return {
		// 		unsignedTxs: [],
		// 		status: new interfaces.SDKStatus(
		// 			interfaces.EPrepareCreateTxsStatusCodes.ERROR_ESTIMATING_GAS_LIMIT,
		// 			'Error estimating gas limit'
		// 		),
		// 	}
		// }
		// if (estimatedGasLimit) {
		// 	txOptions.gasLimit = ethers.BigNumber.from(estimatedGasLimit.toString())
		// }

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
			error,
			'Error setting the fee options'
		)
	}

	// Merge the transaction options into the unsigned transaction
	unsignedTx = { ...unsignedTx, ...txOptions }

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
		txReceipt = await getTxReceiptFromHash(txHash, linkDetails.chainId, provider)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EGetLinkFromTxStatusCodes.ERROR_GETTING_TX_RECEIPT_FROM_HASH,
			'Error getting the transaction receipt from the hash'
		)
	}

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
	peanutContractVersion = DEFAULT_CONTRACT_VERSION,
	password = null,
}: interfaces.ICreateLinkParams): Promise<interfaces.ICreatedPeanutLink> {
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
	peanutContractVersion = DEFAULT_CONTRACT_VERSION,
	passwords = null,
}: interfaces.ICreateLinksParams): Promise<interfaces.ICreatedPeanutLink[]> {
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
	const addressHash = solidityHashAddress(recipient)
	const addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	config.verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
	const addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	const signature = signAddress(recipient, keys.privateKey) // sign with link keys

	if (config.verbose) {
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
		// eip1559,
		// maxFeePerGas,
		// maxPriorityFeePerGas,
		// gasLimit,
		// verbose,
	})

	const claimParams = [depositIdx, recipient, addressHashEIP191, signature]
	config.verbose && console.log('claimParams: ', claimParams)
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
	contractVersion = DEFAULT_CONTRACT_VERSION,
}: interfaces.IClaimLinkSenderParams): Promise<interfaces.IClaimLinkSenderResponse> {
	const signer = structSigner.signer
	const chainId = await signer.getChainId()
	const contract = await getContract(String(chainId), signer, contractVersion)

	// Prepare transaction options
	let txOptions = {}
	txOptions = await setFeeOptions({
		txOptions,
		provider: signer.provider,
	})

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

async function claimLinkXChain({
	structSigner,
	link,
	destinationChainId,
	isTestnet = true,
	maxSlippage = 1.0, // (e.g. 0.x - x.y, example from SDK is 1.0 which is ~ 1%)
	recipient = null,
	destinationTokenAddress = null,
}: interfaces.IClaimLinkXChainParams): Promise<interfaces.IClaimLinkXChainResponse> {
	// Need to check information about the link
	const config = { verbose: true }
	const signer = structSigner.signer
	const linkParams = peanut.getParamsFromLink(link)
	const chainId = linkParams.chainId
	const contractVersion = linkParams.contractVersion
	const depositIdx = linkParams.depositIdx

	if (recipient == null) {
		recipient = await signer.getAddress()
		config.verbose && console.log('recipient not provided, using signer address: ', recipient)
	}
	if (contractVersion !== 'v5') {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNSUPPORTED_CONTRACT_VERSION,
			`Unsupported contract version ${contractVersion}`
		)
	}

	const contract = await peanut.getContract(String(chainId), signer, contractVersion)

	// Need to check information about the link
	const linkDetails = await peanut.getLinkDetails({ link: link })

	// If destinationTokenAddress is not provided, use the tokenAddress from linkDetails
	if (destinationTokenAddress == null) {
		destinationTokenAddress = linkDetails.tokenAddress
	}

	assert(linkDetails.tokenType < 2, 'Only type 0/1 supported for x-chain')

	// TODO: check if the requested tokens are within the routing information available
	// this can be done by checking access using squid.chains and squid.tokens and bailing
	// if they do not appear on the list. Note, we don't have to do this here as when we
	// query the Squid API for a route it will fail if the chain or tokens are not supported

	const claimPayload = await createClaimXChainPayload(
		isTestnet,
		link,
		recipient,
		destinationChainId,
		destinationTokenAddress,
		maxSlippage
	)

	const { params, estimate, transactionRequest } = claimPayload

	if (config.verbose) {
		// print the params
		console.log('params: ', params)
		console.log('hashEIP191: ', claimPayload.hash)
		console.log('signature: ', claimPayload.signature)
	}

	const txOptions = await setFeeOptions({
		provider: signer.provider,
		eip1559: structSigner.eip1559 ?? true,
		maxFeePerGas: structSigner.maxFeePerGas ?? null,
		maxPriorityFeePerGas: structSigner.maxPriorityFeePerGas ?? null,
		gasLimit: structSigner.gasLimit ?? null,
	})
	console.log('txOptions: ', txOptions)

	let valueToSend
	if (linkDetails.tokenType == 0) {
		// Native token handled differently, most of the funds are already in the
		// contract so we only need to send the native token surplus              100000000000000000
		console.log('Link value : ', claimPayload.tokenAmount, typeof claimPayload.tokenAmount)
		console.log('Squid fee  : ', transactionRequest.value, typeof transactionRequest.value)
		// const feeToSend = transactionRequest.value - claimPayload.tokenAmount
		// this code sucks
		const feeToSend = ethers.BigNumber.from(String(transactionRequest.value)).sub(
			ethers.BigNumber.from(String(claimPayload.tokenAmount))
		)
		console.log('Additional to send : ', feeToSend)
		// valueToSend = ethers.utils.formatEther(feeToSend)
		valueToSend = ethers.utils.formatEther(feeToSend)
	} else {
		// For ERC20 tokens the value requested is the entire fee required to
		// pay for the Axelar gas for and Squid swapping
		console.log('Squid fee  : ', transactionRequest.value)
		valueToSend = ethers.utils.formatEther(transactionRequest.value)
	}

	txOptions.value = ethers.utils.parseEther(valueToSend)

	const claimParams = [
		// Peanut link details
		depositIdx,
		recipient,
		// Squid params to mediate execution
		transactionRequest.data,
		transactionRequest.value,
		transactionRequest.target,
		// Auth details
		claimPayload.hash,
		claimPayload.signature,
	]

	config.verbose && console.log('claimParams: ', claimParams)
	config.verbose && console.log('txOptions: ', txOptions)

	config.verbose && console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')
	// config.verbose && console.log('estimate: ', estimate)

	// withdraw the deposit
	const tx = await contract.withdrawDepositXChain(...claimParams, txOptions)
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	const txReceipt = await tx.wait()

	const axelarScanLink = isTestnet
		? 'https://testnet.axelarscan.io/gmp/' + txReceipt.transactionHash
		: 'https://axelarscan.io/gmp/' + txReceipt.transactionHash // replace with mainnet URL if exists
	console.log('Success : ' + axelarScanLink)

	return {
		txHash: txReceipt.transactionHash,
	}
}

/**
 * Gets all deposits for a given signer and chainId.
 *
 */
async function getAllDepositsForSigner({
	signer,
	chainId,
	contractVersion = DEFAULT_CONTRACT_VERSION,
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
			config.verbose && console.log('fetching deposit: ', i)
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

async function createClaimPayload(link: string, recipientAddress: string) {
	/* internal utility function to create the payload for claiming a link */
	const params = getParamsFromLink(link)
	const password = params.password
	const keys = generateKeysFromString(password) // deterministically generate keys from password

	// cryptography
	const addressHash = solidityHashAddress(recipientAddress)
	// ethers.utils.solidityKeccak256(['address'], [address])

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

async function createClaimXChainPayload(
	isTestnet: boolean,
	link: string,
	recipient: string,
	destinationChainId: string,
	destinationToken: string,
	maxSlippage: number
) {
	const linkParams = peanut.getParamsFromLink(link)
	const chainId = linkParams.chainId
	const contractVersion = linkParams.contractVersion
	const depositIdx = linkParams.depositIdx
	const password = linkParams.password

	if (contractVersion !== 'v5') {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNSUPPORTED_CONTRACT_VERSION,
			`Unsupported contract version ${contractVersion}`
		)
	}
	const keys = peanut.generateKeysFromString(password)

	const linkDetails = await peanut.getLinkDetails({ link: link })

	let sourceToken = linkDetails.tokenAddress
	destinationToken = destinationToken

	if (sourceToken == '0x0000000000000000000000000000000000000000') {
		assert(linkDetails.tokenType == 0, 'Native token address passed for non-native token link type')
		// Update for Squid compatibility
		config.verbose && console.log('Source token is 0x0000, converting to 0xEeee..')
		sourceToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	if (destinationToken == '0x0000000000000000000000000000000000000000' || destinationToken == null) {
		config.verbose && console.log('Destination token is 0x0000, converting to 0xEeee..')
		// Update for Squid compatibility
		destinationToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	// get wei of amount being withdrawn and send as string (e.g. "10000000000000000")
	const tokenAmount = parseFloat(linkDetails.tokenAmount) * Math.pow(10, linkDetails.tokenDecimals)
	config.verbose && console.log('Getting squid info..')

	// TODO this can throw and ERROR, needs to be caught
	const route = await getSquidRoute({
		isTestnet,
		fromChain: String(chainId),
		fromToken: sourceToken,
		fromAmount: String(tokenAmount),
		toChain: destinationChainId,
		toToken: destinationToken,
		// TODO: is `fromAddress` correct?
		fromAddress: recipient,
		toAddress: recipient,
		slippage: maxSlippage,
	})

	if (route === null) {
		throw new interfaces.SDKStatus(interfaces.EXChainStatusCodes.ERROR_GETTING_ROUTE, 'Failed to get x-chain route')
	}

	const { params, estimate, transactionRequest } = route

	if (!params || !estimate || !transactionRequest) {
		throw new interfaces.SDKStatus(interfaces.EXChainStatusCodes.ERROR_GETTING_ROUTE, 'Failed to get x-chain route')
	}

	config.verbose && console.log('Squid route calculated :)')
	// config.verbose && console.log('Full route : ', route)

	// cryptography

	const paramsHash = ethers.utils.solidityKeccak256(
		['address', 'address', 'bytes', 'uint256'],
		[recipient, transactionRequest.target, transactionRequest.data, transactionRequest.value]
	) // this works

	async function _signMessage(message: ethers.utils.Bytes, privateKey: string) {
		const wallet = new ethers.Wallet(privateKey)
		const signature = await wallet.signMessage(message)
		console.log(`${signature} (Created by _signMessage without hash)`)
		return signature
	}

	const signature = await _signMessage(ethers.utils.arrayify(paramsHash), keys.privateKey)

	// log all returns
	const result = {
		recipientAddress: recipient,
		tokenAmount: tokenAmount,
		hash: paramsHash,
		signature: signature,
		idx: depositIdx,
		chainId: params.chainId,
		contractVersion: params.contractVersion,
		params: params,
		estimate: estimate,
		transactionRequest: transactionRequest,
	}
	config.verbose && console.log('XChain Payload finalized. Values: ', result)
	return result
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

	let claimed = false
	if (['v2', 'v3', 'v4'].includes(contractVersion)) {
		if (deposit.pubKey20 == '0x0000000000000000000000000000000000000000') {
			claimed = true
		}
		config.verbose && console.log('Pre-v5 claim checking behaviour, claimed:', claimed)
	} else {
		claimed = deposit.claimed
		config.verbose && console.log('v5+ claim checking behaviour, claimed:', claimed)
	}

	let depositDate: Date | null = null
	if (['v4', 'v5'].includes(contractVersion)) {
		if (deposit.timestamp) {
			depositDate = new Date(deposit.timestamp * 1000)
			if (deposit.timestamp == 0) {
				depositDate = null
			}
		} else {
			config.verbose && console.log('No timestamp found in deposit for version', contractVersion)
		}
	}
	//  else if (['v5'].includes(contractVersion)) {
	// 	if (deposit.timestamp) {
	// 		depositDate = new Date(deposit.timestamp * 1000)
	// 		if (deposit.timestamp == 0) {
	// 			depositDate = null
	// 		}
	// 	} else {
	// 		config.verbose && console.log('No timestamp found in deposit for version', contractVersion)
	// 	}
	// }

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

	return {
		link: link,
		chainId: chainId,
		depositIndex: depositIdx,
		contractVersion: contractVersion,
		password: password,
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
	}
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
	config.verbose && console.log('claiming link through Peanut API...')
	config.verbose &&
		console.log('link: ', link, ' recipientAddress: ', recipientAddress, ' apiKey: ', APIKey, ' url: ', baseUrl)
	const payload = await createClaimPayload(link, recipientAddress)
	config.verbose && console.log('payload: ', payload)
	if (baseUrl == 'local') {
		config.verbose && console.log('using local api')
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

	config.verbose && console.log('response status: ', response.status)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	} else {
		const data = await response.json()
		data.txHash = data.tx_hash
		return data
	}
}

/**
 * Claims a link x-chain through the Peanut API
 */
async function claimLinkXChainGasless({
	link,
	recipientAddress,
	APIKey,
	destinationChainId,
	destinationTokenAddress = null,
	baseUrl = 'https://api.peanut.to/claimxchain',
	isTestnet = true,
}: interfaces.IClaimLinkXChainGaslessParams): Promise<interfaces.IClaimLinkXChainGaslessResponse> {
	config.verbose && console.log('claiming link x-chain through Peanut API...')

	// TODO: DRY merge this code with claimLinkXChain
	// Need to check information about the link
	const linkParams = peanut.getParamsFromLink(link)
	const chainId = linkParams.chainId
	const contractVersion = linkParams.contractVersion
	const depositIdx = linkParams.depositIdx

	if (contractVersion !== 'v5') {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNSUPPORTED_CONTRACT_VERSION,
			`Unsupported contract version ${contractVersion}`
		)
	}

	// Need to check information about the link
	const linkDetails = await peanut.getLinkDetails({ link: link })
	assert(linkDetails.tokenType < 2, 'Only type 0/1 supported for x-chain')

	// If destinationTokenAddress is not provided, use the tokenAddress from linkDetails
	if (destinationTokenAddress == null) {
		destinationTokenAddress = linkDetails.tokenAddress
	}

	// TODO slippage
	const claimPayload = await createClaimXChainPayload(
		isTestnet,
		link,
		recipientAddress,
		destinationChainId,
		destinationTokenAddress,
		3.0
	)
	const { params, estimate, transactionRequest } = claimPayload

	// valueToSend is handled in API

	config.verbose && console.log('payload: ', claimPayload)
	if (baseUrl == 'local') {
		config.verbose && console.log('using local api')
		baseUrl = 'http://127.0.0.1:8000/claimxchain'
	}

	const headers = {
		'Content-Type': 'application/json',
	}

	const body = {
		address: claimPayload.recipientAddress,
		address_hash: claimPayload.hash,
		signature: claimPayload.signature,

		squid_data: claimPayload.transactionRequest.data,
		// squid_value: claimPayload.transactionRequest.value,
		squid_value: claimPayload.transactionRequest.value,
		squid_address: claimPayload.transactionRequest.target, // squid router address

		idx: depositIdx,
		chain: chainId,
		destination_chain: destinationChainId,
		destination_token: destinationTokenAddress,
		max_slippage: 1.0,
		version: contractVersion,
		api_key: APIKey,
	}

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
		const data = await response.json()
		data.txHash = data.tx_hash
		return data
	}
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

async function getSquidRouteV1({
	isTestnet,
	fromChain,
	fromToken,
	fromAmount,
	toChain,
	toToken,
	fromAddress,
	toAddress,
	slippage,
}: interfaces.IGetSquidRouteParams): Promise<any> {
	console.warn('WARNING: Using deprecated Squid API v1')
	const url =
		isTestnet === undefined || isTestnet == true
			? 'https://testnet.api.squidrouter.com/v1/route'
			: 'https://api.squidrouter.com/v1/route'
	config.verbose && console.log('Using for squid route call : ', url)

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

	const params = {
		fromChain,
		fromToken,
		fromAmount,
		toChain,
		toToken,
		fromAddress,
		toAddress,
		slippage,
		enableForecall: true, // optional, defaults to true
		enableBoost: true,
		// collect fees
		// collectFees: {
		// 	integratorAddress: '0x6B3751c5b04Aa818EA90115AA06a4D9A36A16f02', // TODO make Peanut address
		// 	fee: 100, // bips
		// },
	}

	try {
		const searchParams = new URLSearchParams()

		for (const key in params) {
			if (params.hasOwnProperty(key)) {
				searchParams.append(key, params[key].toString())
			}
		}

		const fullUrl = `${url}?${searchParams}`

		const response: Response = await fetch(fullUrl, {
			method: 'GET',
			headers: {
				// 'x-integrator-id': 'peanut-api',
				'x-integrator-id': '11CBA45B-5EE9-4331-B146-48CCD7ED4C7C',
			},
		})

		if (!response.ok) {
			const text = await response.text()
			console.error('Squid api called with status: ', response.status)
			console.error('Full response text: ', text)
			throw new interfaces.SDKStatus(interfaces.EXChainStatusCodes.ERROR, text)
		}

		const data = await response.json()

		if (data && data.route) {
			return data.route
		}

		// implicit else
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNDEFINED_DATA,
			'undefined data received from Squid API'
		)
	} catch (error) {
		throw error
	}
}

async function getSquidRoute({
	isTestnet,
	fromChain,
	fromToken,
	fromAmount,
	toChain,
	toToken,
	fromAddress,
	toAddress,
	slippage,
}: interfaces.IGetSquidRouteParams): Promise<any> {
	const url =
		isTestnet === undefined || isTestnet == true
			? 'https://testnet.v2.api.squidrouter.com/v2/route'
			: 'https://v2.api.squidrouter.com/v2/route'
	config.verbose && console.log('Using for squid route call : ', url)

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
			// slippage: 1, // 1% slippage
			autoMode: 1, // ignored if manual slippage is set,
		},
		enableForecall: true, // optional, defaults to true
		enableBoost: true,

		// TODO: needs to be verified in API
		collectFees: {
			integratorAddress: '0x6B3751c5b04Aa818EA90115AA06a4D9A36A16f02',
			fee: 100, // bips
		},
	}

	try {
		const response: Response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				// 'x-integrator-id': 'peanut-api',
				'x-integrator-id': '11CBA45B-5EE9-4331-B146-48CCD7ED4C7C',
			},
			body: JSON.stringify(params),
		})

		if (!response.ok) {
			console.error('Squid api called with status: ', response.status)
			const responseBody = await response.text()
			console.error('Full response body: ', responseBody)
			throw new interfaces.SDKStatus(interfaces.EXChainStatusCodes.ERROR, responseBody)
		}

		const data = await response.json()

		if (data && data.route) {
			config.verbose && console.log('Squid route: ', data.route)
			return data.route
		}

		// implicit else
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNDEFINED_DATA,
			'undefined data received from Squid API'
		)
	} catch (error) {
		throw error
	}
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
function getLatestContractVersion(chainId: string, type: string): string {
	if (type == 'batch') {
		return 'Bv4'
	} else {
		return 'v4'
	}
	// try {
	// 	const data = PEANUT_CONTRACTS

	// 	const chainData = data[chainId as unknown as keyof typeof data]

	// 	// Filter keys starting with "v" and sort them considering major and minor version numbers
	// 	const versions = Object.keys(chainData)
	// 		.filter((key) => key.startsWith(type === 'batch' ? 'Bv' : 'v'))
	// 		.sort((a, b) => {
	// 			const partsA = a.substring(1).split('.').map(Number)
	// 			const partsB = b.substring(1).split('.').map(Number)

	// 			// Compare major version first
	// 			if (partsA[0] !== partsB[0]) {
	// 				return partsB[0] - partsA[0]
	// 			}

	// 			// If major version is the same, compare minor version (if present)
	// 			return (partsB[1] || 0) - (partsA[1] || 0)
	// 		})

	// 	const highestVersion = versions[0]

	// 	config.verbose && console.log('latest contract version: ', highestVersion)
	// 	return highestVersion
	// } catch (error) {
	// 	throw new Error('Failed to get latest contract version')
	// }
}

async function getAllUnclaimedDepositsWithIdxForAddress({
	address,
	chainId,
	peanutContractVersion,
	provider = null,
}: interfaces.IGetAllUnclaimedDepositsWithIdxForAddressParams): Promise<any[]> {
	if (provider == null) {
		provider = await getDefaultProvider(chainId)
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

	const mappedAddressDeposits = (await contract.getAllDepositsForAddress(address))
		.map((deposit: any, idx: number) => {
			return {
				pubKey20: deposit.pubKey20,
				amount: deposit.amount,
				tokenAddress: deposit.tokenAddress,
				contractType: deposit.contractType,
				claimed: deposit.claimed,
				timestamp: deposit.timestamp,
				senderAddress: deposit.senderAddress,
			}
		})
		.filter((transaction) => {
			const amount = BigInt(transaction.amount._hex)
			return !transaction.claimed && amount > BigInt(0)
		}) // get the deposits for the address

	const mappedDeposits = (await contract.getAllDeposits()).map((deposit: any, idx: number) => {
		return {
			pubKey20: deposit.pubKey20,
			amount: deposit.amount,
			tokenAddress: deposit.tokenAddress,
			contractType: deposit.contractType,
			claimed: deposit.claimed,
			timestamp: deposit.timestamp,
			senderAddress: deposit.senderAddress,
		}
	}) // get all the deposits

	mappedDeposits.map((deposit: any, idx) => {
		mappedAddressDeposits.map((addressDeposit: any, addressIdx) => {
			if (compareDeposits(deposit, addressDeposit)) {
				addressDeposit.idx = idx
			}
		})
	}) // map the idxs from all deposits to the address deposits

	return mappedAddressDeposits
}

async function claimAllUnclaimedAsSenderPerChain({
	structSigner,
	peanutContractVersion = null,
}: interfaces.IClaimAllUnclaimedAsSenderPerChainParams): Promise<string[]> {
	const chainId = (await structSigner.signer.getChainId()).toString()
	const address = await structSigner.signer.getAddress()
	const provider = structSigner.signer.provider as ethers.providers.JsonRpcProvider

	if (peanutContractVersion == null) {
		peanutContractVersion = getLatestContractVersion(chainId, 'normal')
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

const peanut = {
	CHAIN_DETAILS,
	DEFAULT_BATCHER_VERSION,
	DEFAULT_CONTRACT_VERSION,
	ERC1155_ABI,
	ERC20_ABI,
	ERC721_ABI,
	PEANUT_ABI_V3,
	PEANUT_ABI_V4,
	PEANUT_ABI_V5,
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
	claimLinkXChain,
	claimLinkXChainGasless,
	createClaimPayload,
	createClaimXChainPayload,
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
	getSquidTokens,
	getXChainOptionsForLink,
	greeting,
	hash_string,
	interfaces,
	prepareTxs,
	resetProviderCache,
	setFeeOptions,
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
}

export default peanut
export {
	peanut,
	CHAIN_DETAILS,
	DEFAULT_BATCHER_VERSION,
	DEFAULT_CONTRACT_VERSION,
	ERC1155_ABI,
	ERC20_ABI,
	ERC721_ABI,
	PEANUT_ABI_V3,
	PEANUT_ABI_V4,
	PEANUT_ABI_V5,
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
	claimLinkXChain,
	claimLinkXChainGasless,
	createClaimPayload,
	createClaimXChainPayload,
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
	getSquidTokens,
	getXChainOptionsForLink,
	greeting,
	hash_string,
	interfaces,
	prepareTxs,
	resetProviderCache,
	setFeeOptions,
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
}
