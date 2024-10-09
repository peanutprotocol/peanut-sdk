////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. This library is compatible with ethers v5, and
//  supports both node and browser environments.
//
/////////////////////////////////////////////////////////

import { BigNumber, constants, ethers, utils } from 'ethersv5'
import { Provider, TransactionReceipt } from '@ethersproject/abstract-provider'
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
	PEANUT_ABI_V4_3,
	PEANUT_BATCHER_ABI_V4_2,
	PEANUT_BATCHER_ABI_V4_3,
	PEANUT_ABI_V4_4,
	PEANUT_BATCHER_ABI_V4_4,
	VAULT_CONTRACTS_V4_2_ANDUP,
	LATEST_EXPERIMENTAL_BATCHER_VERSION,
	VAULT_CONTRACTS_V4_ANDUP,
	VAULT_CONTRACTS_WITH_FLEXIBLE_DEPOSITS,
	ROUTER_CONTRACTS_WITH_MFA,
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
	getRawParamsFromLink,
	getDepositIdx,
	getDepositIdxs,
	getLinksFromMultilink,
	createMultiLinkFromLinks,
	isShortenedLink,
	shortenMultilink,
	expandMultilink,
	combineRaffleLink,
	compareDeposits,
	signAddress,
	getSquidRouterUrl,
	toLowerCaseKeys,
	ethersV5ToPeanutTx,
	peanutToEthersV5Tx,
	validateUserName,
	compareVersions,
} from './util.ts'

import * as interfaces from './consts/interfaces.consts.ts'
import { SQUID_ADDRESS } from './consts/misc.ts'
import {
	EIP3009Tokens,
	GaslessReclaimTypes,
	VAULT_CONTRACTS_WITH_EIP_3009,
	VAULT_CONTRACTS_WITH_GASLESS_REVOKE,
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
	// let infuraRpc = rpcs.find((rpc) => rpc.includes('infura.io'))
	const INFURA_API_KEY = '4478656478ab4945a1b013fb1d8f20fd'
	// if (infuraRpc) {
	// 	infuraRpc = infuraRpc.replace('${INFURA_API_KEY}', INFURA_API_KEY)
	// 	config.verbose && console.log('Infura RPC found:', infuraRpc)
	// 	const provider = await createValidProvider(infuraRpc)
	// 	if (provider) {
	// 		providerCache[chainId] = provider
	// 		return provider
	// 	}
	// }

	// If no valid Infura RPC, continue with the current behavior
	let providerPromises
	try {
		providerPromises = rpcs.map((rpcUrl) =>
			createValidProvider(rpcUrl.replace('${INFURA_API_KEY}', INFURA_API_KEY)).catch((error) => null)
		)
	} catch (error) {
		// Handle errors silently
	}

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
		const provider = new ethers.providers.JsonRpcProvider({ url: rpcUrl })

		const balance = await provider.getBalance('0x04B5f21facD2ef7c7dbdEe7EbCFBC68616adC45C')
		if (!balance) {
			throw new interfaces.SDKStatus(
				interfaces.EGenericErrorCodes.GENERIC_ERROR,
				'Invalid RPC',
				`Invalid RPC: ${rpcUrl}`
			)
		}

		return provider
	} catch (error) {
		try {
			if (error.code === 'NETWORK_ERROR') {
				const provider = new ethers.providers.JsonRpcProvider({
					url: rpcUrl,
					skipFetchSetup: true,
				})

				// Check if the RPC is valid by calling fetchGetBalance
				const balance = await provider.getBalance('0x04B5f21facD2ef7c7dbdEe7EbCFBC68616adC45C')

				if (!balance) {
					throw new interfaces.SDKStatus(
						interfaces.EGenericErrorCodes.GENERIC_ERROR,
						'Invalid RPC',
						`Invalid RPC: ${rpcUrl}`
					)
				}

				return provider
			} else {
				// Introduce a delay before throwing the error. This is necessary so that the Promise.any
				// call in getDefaultProvider doesn't immediately reject the promise and instead waits for a success.
				await new Promise((resolve) => setTimeout(resolve, 5000))
				throw new interfaces.SDKStatus(
					interfaces.EGenericErrorCodes.GENERIC_ERROR,
					error,
					`Invalid RPC: ${rpcUrl}`
				)
			}
		} catch (error) {
			await new Promise((resolve) => setTimeout(resolve, 5000))
			throw new interfaces.SDKStatus(interfaces.EGenericErrorCodes.GENERIC_ERROR, error, `Invalid RPC: ${rpcUrl}`)
		}
	}
}

function getContractAddress(chainId: string, version: string) {
	// Find the contract address based on the chainId and version provided
	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const contractAddress = _PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][version]
	return contractAddress
}

async function getContract(chainId: string, signerOrProvider: any, version = null) {
	if (signerOrProvider == null) {
		config.verbose && console.log('signerOrProvider is null, getting default provider...')
		signerOrProvider = await getDefaultProvider(chainId)
	}
	if (version == null) {
		version = getLatestContractVersion({ chainId, type: 'normal' })
	}

	// Determine which ABI version to use based on the version provided
	config.verbose && console.log('finding contract for ', 'version', version, 'chainId', chainId)
	// TODO: this code is annoying to update
	let CONTRACT_ABI: any
	switch (version) {
		case 'v4':
			CONTRACT_ABI = PEANUT_ABI_V4
			break
		case 'v4.2':
			CONTRACT_ABI = PEANUT_ABI_V4_2
			break
		case 'v4.3':
			CONTRACT_ABI = PEANUT_ABI_V4_3
			break
		case 'v4.4':
			CONTRACT_ABI = PEANUT_ABI_V4_4
			break
		case 'Bv4':
			CONTRACT_ABI = PEANUT_BATCHER_ABI_V4
			break
		case 'Bv4.3':
			CONTRACT_ABI = PEANUT_BATCHER_ABI_V4_3
			break
		case 'Bv4.4':
			CONTRACT_ABI = PEANUT_BATCHER_ABI_V4_4
			break
		case 'Bv4.2':
			CONTRACT_ABI = PEANUT_BATCHER_ABI_V4_2
			break
		case 'Rv4.2':
			CONTRACT_ABI = PEANUT_ROUTER_ABI_V4_2
			break
		case 'Rv4.3':
			CONTRACT_ABI = PEANUT_ABI_V4_3

		default:
			throw new Error('Unable to find Peanut contract for this version, check for correct version or updated SDK')
	}

	const contractAddress = getContractAddress(chainId, version)

	// If the contract address is not found, throw an error
	if (!contractAddress) {
		throw new Error(`Contract ${version} not deployed on chain ${chainId}`)
	}

	const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signerOrProvider)

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
		return BigNumber.from(0)
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
		return constants.AddressZero
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
		return false
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
): Promise<interfaces.IPeanutUnsignedTransaction | null> {
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

	const tx = await tokenContract.populateTransaction.approve(spender, amount)
	return ethersV5ToPeanutTx(tx)
}

async function prepareApproveERC721Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	tokenId: number,
	provider?: any,
	spenderAddress?: string | undefined,
	contractVersion = null
): Promise<interfaces.IPeanutUnsignedTransaction | null> {
	if (contractVersion == null) {
		contractVersion = getLatestContractVersion({ chainId, type: 'normal' })
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
	const tx = await tokenContract.populateTransaction.approve(spender, tokenId, { from: address })
	return ethersV5ToPeanutTx(tx)
}

async function prepareApproveERC1155Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	provider?: any,
	spenderAddress?: string | undefined,
	contractVersion = null
): Promise<interfaces.IPeanutUnsignedTransaction | null> {
	if (contractVersion == null) {
		contractVersion = getLatestContractVersion({ chainId, type: 'normal' })
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
	const tx = await tokenContract.populateTransaction.setApprovalForAll(spender, true, { from: address })
	config.verbose && console.log('Approval needed for operator')
	return ethersV5ToPeanutTx(tx)
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
 * Estimate gas price. If unsignedTx is supplied, also estimate the gas limit.
 * @dev This function does not override provided gas options in txOptions.
 * @returns struct with gas info
 */
async function setFeeOptions({
	txOptions,
	unsignedTx,
	provider = undefined,
	chainId = undefined,
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
	unsignedTx?: interfaces.IPeanutUnsignedTransaction
	provider?: Provider | undefined
	chainId?: string | undefined
	eip1559?: boolean
	maxFeePerGas?: ethers.BigNumber | null
	maxFeePerGasMultiplier?: number
	gasLimit?: ethers.BigNumber | null
	gasPriceMultiplier?: number
	maxPriorityFeePerGas?: ethers.BigNumber | null
	maxPriorityFeePerGasMultiplier?: number
	gasLimitMultiplier?: number
}) {
	//TODO: Technically, if the provided tx Options have all the data filled out, we wouldn't have to check chainid or provider, because there's nth to do. Maybe Implememt an entry check for that
	config.verbose && console.log('Setting tx options...')

	let _chainId: string = chainId || ''

	if (!provider && !chainId) {
		throw new interfaces.SDKStatus(
			interfaces.ESetFeeOptionsStatusCodes.ERROR_PROVIDER_OR_CHAINID_REQUIRED,
			'Either provider or chainId must be provided'
		)
	} else if (chainId && !provider) {
		_chainId = chainId
		provider = await getDefaultProvider(chainId)
	} else if (!chainId && provider) {
		// if chainId and provider are both provided, check if they match
		const network = await provider.getNetwork()
		_chainId = network.chainId.toString()
	}

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
	const chainDetails = CHAIN_DETAILS[_chainId]

	if (gasLimit) {
		txOptions.gasLimit = gasLimit
	} else if (unsignedTx) {
		try {
			const gasLimitRaw = await provider.estimateGas(peanutToEthersV5Tx(unsignedTx))
			txOptions.gasLimit = gasLimitRaw.mul(gasLimitMultiplier)
		} catch (error: any) {
			const errLower = String(error).toLowerCase()
			if (
				errLower.includes('insufficient funds') ||
				errLower.includes('insufficient_funds') ||
				errLower.includes('gas required exceeds allowance')
			) {
				throw new interfaces.SDKStatus(interfaces.ESignAndSubmitTx.ERROR_INSUFFICIENT_NATIVE_TOKEN)
			}
			// implicit else
			throw error
		}
	}
	config.verbose && console.log('checking if eip1559 is supported...')

	// Check if EIP-1559 is supported
	// if on milkomeda or bnb or linea, set eip1559 to false
	// Even though linea is eip1559 compatible, it is more reliable to use the good old gasPrice
	if (['2001', '200101', '56', '59144', '59140', '534352', '5000'].includes(_chainId)) {
		eip1559 = false
		config.verbose && console.log('Chain includes unreliable eip1559 chains. Using legacy gas calculation.')
	} else if (chainDetails && chainDetails.features && chainDetails.features.length > 0) {
		eip1559 = chainDetails.features.some((feature: any) => feature.name === 'EIP1559')
		config.verbose && console.log('EIP1559 support determined from chain features:', eip1559)
	} else {
		config.verbose && console.log('Chain features not available or empty, checking EIP1559 support via feeData...')
		try {
			eip1559 = 'maxFeePerGas' in feeData && feeData.maxFeePerGas !== null && feeData.maxFeePerGas !== undefined
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
				if (!['59144', '59140'].includes(_chainId)) {
					if (BigInt(txOptions.maxPriorityFeePerGas) > lastBaseFeePerGas) {
						txOptions.maxPriorityFeePerGas = lastBaseFeePerGas.toString()
					}
				}

				// for polygon (137), set priority fee to min 40 gwei (they have a minimum of 30 for spam prevention)
				if (_chainId == '137') {
					const minPriorityFee = ethers.utils.parseUnits('40', 'gwei')
					if (ethers.BigNumber.from(txOptions.maxPriorityFeePerGas).lt(minPriorityFee)) {
						txOptions.maxPriorityFeePerGas = minPriorityFee.toString()
					}
				}
				// for gnosis (100), minimum 1 gwei gas fee
				if (_chainId == '100') {
					const minPriorityFee = ethers.utils.parseUnits('1', 'gwei')
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
		// Only initialize gasPrice if it's not already provided in txOptions
		if (!txOptions.gasPrice) {
			const gasPrice = feeData.gasPrice ? BigInt(feeData.gasPrice.toString()) : null

			if (gasPrice !== null) {
				// Apply the gasPriceMultiplier to calculate the proposed gas price
				let proposedGasPrice = (gasPrice * BigInt(Math.round(gasPriceMultiplier * 100))) / BigInt(100)

				/////// CHAIN EXCEPTIONS /////////
				// Exception for Gnosis (chain ID 100) to ensure a minimum gas price of 1 gwei
				if (_chainId === '100') {
					const minGnosisGasPrice = ethers.utils.parseUnits('1', 'gwei')
					if (ethers.BigNumber.from(proposedGasPrice.toString()).lt(minGnosisGasPrice)) {
						proposedGasPrice = BigInt(minGnosisGasPrice.toString())
					}
				}
				// polgon (137) has a minimum gas price of 30 gwei
				if (_chainId === '137') {
					const minPolygonGasPrice = ethers.utils.parseUnits('30', 'gwei')
					if (ethers.BigNumber.from(proposedGasPrice.toString()).lt(minPolygonGasPrice)) {
						proposedGasPrice = BigInt(minPolygonGasPrice.toString())
					}
				}

				// Set the calculated proposed gas price in txOptions if not already provided
				txOptions.gasPrice = ethers.BigNumber.from(proposedGasPrice.toString())
			} else {
				// Handle the case where gasPrice could not be determined
				console.error('Failed to determine gas price for legacy transaction')
				// Optionally, set a default gas price here
			}
		}
	}
	// cast values to string (hex) instead of objects to be maximally compatible with all libraries
	// don't have them as ethers BigNumber objects
	// if (txOptions.gasPrice !== undefined) {
	// 	txOptions.gasPrice = txOptions.gasPrice.toString()
	// 	// ensure it's hex
	// 	txOptions.gasPrice = ethers.utils.hexlify(txOptions.gasPrice)
	// }
	// if (txOptions.maxFeePerGas !== undefined) {
	// 	txOptions.maxFeePerGas = txOptions.maxFeePerGas.toString()
	// }
	// if (txOptions.maxPriorityFeePerGas !== undefined) {
	// 	txOptions.maxPriorityFeePerGas = txOptions.maxPriorityFeePerGas.toString()
	// }
	// if (txOptions.value !== undefined) {
	// 	txOptions.value = txOptions.value.toString()
	// }
	// if (txOptions.gasLimit !== undefined) {
	// 	txOptions.gasLimit = txOptions.gasLimit.toString()
	// }
	// if (txOptions.nonce !== undefined) {
	// 	txOptions.nonce = txOptions.nonce.toString()
	// }

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

function getStringAmount(amount: interfaces.IPeanutLinkDetails['tokenAmount'], decimals: number) {
	if (typeof amount === 'string') {
		return amount
	} else {
		return trim_decimal_overflow(amount, decimals)
	}
}

/**
 * Returns an array of transactions necessary to create a link (e.g. 1. approve, 2. makeDeposit)
 * all values obligatory.
 * @notice It's crucial to execute transactions in the order that they are returned in!
 * @param address - The senders wallet address. This is NOT the token contract address.
 */
async function prepareDepositTxs({
	address,
	linkDetails,
	peanutContractVersion = null,
	batcherContractVersion = LATEST_STABLE_BATCHER_VERSION,
	numberOfLinks = 1,
	passwords = [],
	provider,
	recipient = constants.AddressZero,
	reclaimableAfter = 0,
}: interfaces.IPrepareDepositTxsParams): Promise<interfaces.IPrepareDepositTxsResponse> {
	if (!provider) {
		provider = await getDefaultProvider(linkDetails.chainId)
	}

	if (peanutContractVersion == null) {
		peanutContractVersion = getLatestContractVersion({ chainId: linkDetails.chainId, type: 'normal' })
	}

	try {
		linkDetails = await validateLinkDetails(linkDetails, passwords, numberOfLinks, provider)
	} catch (error) {
		console.error({ 'Error validating link details:': error })
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: please make sure all required fields are provided and valid'
		)
	}
	const tokenAmountString = getStringAmount(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals)
	const totalTokenAmount = tokenAmountBigNum.mul(numberOfLinks)

	const unsignedTxs: interfaces.IPeanutUnsignedTransaction[] = []
	let txOptions: interfaces.ITxOptions = {}
	if (!provider) {
		try {
			provider = await getDefaultProvider(linkDetails.chainId)
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
			let approveTx: interfaces.IPeanutUnsignedTransaction
			if (numberOfLinks == 1) {
				approveTx = await prepareApproveERC20Tx(
					address,
					linkDetails.chainId,
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
					linkDetails.chainId,
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
				linkDetails.chainId,
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
			const approveTx = await prepareApproveERC1155Tx(address, linkDetails.chainId, linkDetails.tokenAddress!)

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
	let depositTx: interfaces.IPeanutUnsignedTransaction
	if (numberOfLinks == 1) {
		try {
			if (VAULT_CONTRACTS_WITH_FLEXIBLE_DEPOSITS.includes(peanutContractVersion)) {
				// Using the new, powerful and flexible deposit function!
				depositParams = [
					linkDetails.tokenAddress,
					linkDetails.tokenType,
					tokenAmountBigNum,
					linkDetails.tokenId,
					keys[0].address, // pub key
					address, // the depositor
					false, // no MFA
					recipient, // for recipient-bound deposits
					reclaimableAfter, // for recipient-bound deposits
					false, // not a gasless 3009 deposit
					0, // not a gasless 3009 deposit
				]
				contract = await getContract(linkDetails.chainId, provider, peanutContractVersion) // get the contract instance

				const depositTxRequest = await contract.populateTransaction.makeCustomDeposit(
					...depositParams,
					txOptions
				)
				depositTx = ethersV5ToPeanutTx(depositTxRequest)
			} else {
				// Using the old, more limited function
				depositParams = [
					linkDetails.tokenAddress,
					linkDetails.tokenType,
					tokenAmountBigNum,
					linkDetails.tokenId,
					keys[0].address, // pub key
				]
				contract = await getContract(linkDetails.chainId, provider, peanutContractVersion) // get the contract instance

				const depositTxRequest = await contract.populateTransaction.makeDeposit(...depositParams, txOptions)
				depositTx = ethersV5ToPeanutTx(depositTxRequest)
			}
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
				error,
				'Error making the deposit to the contract'
			)
		}
	} else {
		if (recipient !== constants.AddressZero || reclaimableAfter !== 0) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
				'Recipient-bound deposits are not supported for batch deposits'
			)
		}
		depositParams = [
			PEANUT_CONTRACTS[linkDetails.chainId][peanutContractVersion], // The address of the PeanutV4 contract
			linkDetails.tokenAddress,
			linkDetails.tokenType,
			tokenAmountBigNum,
			linkDetails.tokenId,
			keys.map((key) => key.address),
		]
		contract = await getContract(linkDetails.chainId, provider, batcherContractVersion) // get the contract instance

		try {
			const depositTxRequest = await contract.populateTransaction.batchMakeDeposit(...depositParams, txOptions)
			depositTx = ethersV5ToPeanutTx(depositTxRequest)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
				'Error making the deposit to the contract'
			)
		}
	}

	unsignedTxs.push(depositTx)
	config.verbose && console.log('unsignedTxs: ', unsignedTxs)

	return {
		unsignedTxs,
	}
}

async function signAndSubmitTx({
	structSigner,
	unsignedTx,
}: interfaces.ISignAndSubmitTxParams): Promise<interfaces.ISignAndSubmitTxResponse> {
	config.verbose && console.log('unsigned tx: ', unsignedTx)
	let _unsignedTx = { ...unsignedTx, value: unsignedTx.value ? BigNumber.from(unsignedTx.value) : null }

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
	} catch (error: any) {
		if (error instanceof interfaces.SDKStatus) throw error // propagate

		// else throw a more generic error
		throw new interfaces.SDKStatus(
			interfaces.ESignAndSubmitTx.ERROR_SETTING_FEE_OPTIONS,
			'Error setting the fee options',
			error
		)
	}

	// Merge the transaction options into the unsigned transaction
	_unsignedTx = { ..._unsignedTx, ...txOptions }

	let tx: ethers.providers.TransactionResponse
	try {
		config.verbose && console.log('broadcasting tx: ', _unsignedTx)
		tx = await structSigner.signer.sendTransaction(_unsignedTx)
		config.verbose && console.log('broadcasted tx...')
	} catch (error) {
		const errLower = String(error).toLowerCase()
		if (
			errLower.includes('insufficient funds') ||
			errLower.includes('insufficient_funds') ||
			errLower.includes('gas required exceeds allowance')
		) {
			throw new interfaces.SDKStatus(interfaces.ESignAndSubmitTx.ERROR_INSUFFICIENT_NATIVE_TOKEN)
		}

		throw new interfaces.SDKStatus(
			interfaces.ESignAndSubmitTx.ERROR_BROADCASTING_TX,
			error,
			'Error broadcasting the transaction'
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

/**
 *  takes in a tx hash and linkDetails and returns an array of one or many links (if batched)
 */
async function getLinksFromTx({
	linkDetails,
	txHash,
	passwords,
	provider,
}: interfaces.IGetLinkFromTxParams): Promise<interfaces.IGetLinkFromTxResponse> {
	let txReceipt
	const maxRetries = 5
	const retryDelay = 1000 // in ms

	const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			config.verbose && console.log(txHash, linkDetails.chainId, provider)
			txReceipt = await getTxReceiptFromHash(txHash, linkDetails.chainId, provider)
			break
		} catch (error) {
			if (attempt === maxRetries) {
				throw new interfaces.SDKStatus(
					interfaces.EGetLinkFromTxStatusCodes.ERROR_GETTING_TX_RECEIPT_FROM_HASH,
					'Error getting the transaction receipt from the hash'
				)
			}
			console.log(`Attempt ${attempt} failed. Retrying in ${retryDelay}ms...`)
			await delay(retryDelay)
		}
	}

	// if we get here and the txReceipt is still undefined, throw an error
	if (!txReceipt) {
		throw new interfaces.SDKStatus(
			interfaces.EGetLinkFromTxStatusCodes.ERROR_GETTING_TX_RECEIPT_FROM_HASH,
			'Error getting the transaction receipt from the hash'
		)
	}

	const peanutContractVersion = detectContractVersionFromTxReceipt(txReceipt, linkDetails.chainId)
	const idxs: number[] = getDepositIdxs(txReceipt, linkDetails.chainId, peanutContractVersion)
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
	chainId: string,
	provider?: ethers.providers.Provider
): Promise<TransactionReceipt> {
	provider = provider ?? (await getDefaultProvider(chainId))
	let txReceipt: TransactionReceipt
	try {
		txReceipt = await provider.waitForTransaction(txHash, 1, 10000)
	} catch (e: any) {
		throw new Error('Could not fetch transaction receipt')
	}
	return txReceipt
}

/**
 * function that validates all the details of the link.
 * TODO: rename to something that indicates that it also updates the linkDetails
 */
async function validateLinkDetails(
	linkDetails: interfaces.IPeanutLinkDetails,
	passwords: string[],
	numberOfLinks: number,
	provider: ethers.providers.Provider
): Promise<interfaces.IPeanutLinkDetails> {
	linkDetails.tokenAddress = linkDetails.tokenAddress ?? '0x0000000000000000000000000000000000000000'

	// TODO: this should be rewritten to be more efficient/clear
	if (linkDetails.tokenDecimals == undefined || linkDetails.tokenType == undefined) {
		if (
			linkDetails.tokenType == interfaces.EPeanutLinkType.erc20 ||
			linkDetails.tokenType == interfaces.EPeanutLinkType.native ||
			linkDetails.tokenType == undefined
		) {
			try {
				const contractDetails = await getTokenContractDetails({
					address: linkDetails.tokenAddress,
					provider: provider,
				})

				linkDetails.tokenType = contractDetails.type
				contractDetails.decimals && (linkDetails.tokenDecimals = contractDetails.decimals)
			} catch (error) {
				throw new Error('Contract type not supported')
			}
		}
	}

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
	) // this can be removed since we do the check at the top for decimals and

	if (
		linkDetails.tokenType !== interfaces.EPeanutLinkType.native &&
		linkDetails.tokenAddress === '0x000000cl0000000000000000000000000000000000'
	) {
		throw new Error('need to provide tokenAddress if tokenType is not 0')
	}

	const tokenAmountString = getStringAmount(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
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
	recipient,
	reclaimableAfter,
}: interfaces.ICreateLinkParams): Promise<interfaces.ICreatedPeanutLink> {
	if (peanutContractVersion == null) {
		getLatestContractVersion({ chainId: linkDetails.chainId, type: 'normal' })
	}
	password = password || (await getRandomString(16))
	linkDetails = await validateLinkDetails(linkDetails, [password], 1, structSigner.signer.provider)
	const provider = structSigner.signer.provider

	// Prepare the transactions
	let prepareDepositTxsResponse
	try {
		prepareDepositTxsResponse = await prepareDepositTxs({
			address: await structSigner.signer.getAddress(),
			linkDetails,
			peanutContractVersion,
			numberOfLinks: 1,
			passwords: [password],
			provider: provider,
			recipient,
			reclaimableAfter,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_PREPARING_TX, error)
	}

	// Sign and submit the transactions sequentially
	const signedTxs = []
	for (const unsignedTx of prepareDepositTxsResponse.unsignedTxs) {
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
		getLatestContractVersion({ chainId: linkDetails.chainId, type: 'normal' })
	}
	passwords = passwords || (await Promise.all(Array.from({ length: numberOfLinks }, () => getRandomString(16))))
	linkDetails = await validateLinkDetails(linkDetails, passwords, numberOfLinks, structSigner.signer.provider)
	const provider = structSigner.signer.provider

	// Prepare the transactions
	let prepareDepositTxsResponse
	try {
		prepareDepositTxsResponse = await prepareDepositTxs({
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
	for (const unsignedTx of prepareDepositTxsResponse.unsignedTxs) {
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
	const contract = await getContract(chainId, signer, contractVersion)

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

	const txOptions2 = { ...txOptions, ...claimParams }

	config.verbose && console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')
	config.verbose && console.log('Full tx:', txOptions2)
	config.verbose && console.log('Full tx:', claimParams, txOptions)

	// withdraw the deposit
	const tx = await contract.withdrawDeposit(...claimParams, txOptions)
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	const txReceipt = await tx.wait()

	return {
		txHash: txReceipt.transactionHash,
	}
}

/**
 * Prepares a transaction to claim a link. Broadcasting the transaction is not handled by this function.
 * @param link: the link to claim
 * @param recipientAddress: the address to send the link's contents
 * @param provider: the provider to use for the transaction
 * @returns the prepared transaction in the form of an IPeanutUnsignedTransaction
 */
async function prepareClaimTx({
	link,
	recipientAddress,
	provider = undefined,
}: {
	recipientAddress: string
	link: string
	provider?: ethers.providers.JsonRpcProvider // TODO: update to not use ethers.providers.JsonRpcProvider but just a url
}): Promise<interfaces.IPeanutUnsignedTransaction> {
	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password

	if (!provider) {
		provider = await getDefaultProvider(chainId)
	}

	const keys = generateKeysFromString(password)
	const contract = await getContract(chainId, provider, contractVersion)

	const claimParams = await signWithdrawalMessage(
		contractVersion,
		chainId,
		contract.address,
		depositIdx,
		recipientAddress,
		keys.privateKey
	)

	const tx = await contract.populateTransaction.withdrawDeposit(...claimParams)

	const peanutUnsignedTransaction: interfaces.IPeanutUnsignedTransaction = {
		data: tx?.data,
		to: tx?.to,
	}

	return peanutUnsignedTransaction
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
	const chainId = String(await signer.getChainId())

	if (contractVersion == null) {
		contractVersion = getLatestContractVersion({ chainId, type: 'normal' })
	}

	const contract = await getContract(chainId, signer, contractVersion)

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
		if (error instanceof interfaces.SDKStatus) throw error // propagate

		// else throw a more generic error
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

async function prepareClaimLinkSenderTx({
	depositIndex,
	provider = undefined,
	chainId,
	contractVersion = null,
}: {
	depositIndex: number
	provider?: ethers.providers.JsonRpcProvider // TODO: update to not use ethers.providers.JsonRpcProvider but just a url
	chainId: string
	contractVersion?: string
}) {
	try {
		if (!provider) {
			provider = await getDefaultProvider(chainId)
		}

		if (contractVersion == null) {
			contractVersion = getLatestContractVersion({ chainId, type: 'normal' })
		}

		const contract = await getContract(chainId, provider, contractVersion)

		const tx = await contract.populateTransaction.withdrawDepositSender(depositIndex)

		const convertedTx = ethersV5ToPeanutTx(tx)

		return convertedTx
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.EClaimLinkStatusCodes.ERROR, error)
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
		getLatestContractVersion({ chainId, type: 'normal' })
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

	if (!VAULT_CONTRACTS_V4_2_ANDUP.includes(contractVersion)) {
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
	const tokenAmount = utils.parseUnits(linkDetails.tokenAmount, linkDetails.tokenDecimals)
	const peanutFee = BigNumber.from(0)
	config.verbose && console.log('Getting squid info..')
	const route = await getSquidRoute({
		squidRouterUrl,
		fromChain: chainId,
		fromToken: linkDetails.tokenAddress,
		fromAmount: tokenAmount.toString(),
		toChain: destinationChainId,
		toToken: destinationToken,
		fromAddress: recipient,
		toAddress: recipient,
		slippage,
	})

	config.verbose && console.log('Squid route calculated :)', { route })

	// cryptography
	// TODO: deal with contract upgrades better SOP.md contract upgrads
	const routerContractVersion = ROUTER_CONTRACTS_WITH_MFA[ROUTER_CONTRACTS_WITH_MFA.length - 1] // Always using the latest supported version
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
		peanutFee,
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
		peanutFee,
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
}: interfaces.IPopulateXChainClaimTxParams): Promise<interfaces.IPeanutUnsignedTransaction> {
	if (!provider) provider = await getDefaultProvider(payload.chainId)
	const contract = await getContract(payload.chainId, provider, payload.contractVersion) // get the contract instance
	const preparedArgs: any[] = [
		payload.peanutAddress,
		payload.depositIndex,
		payload.withdrawalSignature,
		payload.squidFee,
		payload.peanutFee,
		payload.squidData,
		payload.routingSignature,
	]
	let unsignedTx: interfaces.IPeanutUnsignedTransaction
	try {
		const txRequest = await contract.populateTransaction.withdrawAndBridge(...preparedArgs)
		unsignedTx = {
			to: txRequest.to,
			data: txRequest.data,
			value: BigInt(payload.squidFee.toString()),
		}
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR,
			error,
			'Error making a withdrawAndBridge transaction'
		)
	}
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
	provider = provider || (await getDefaultProvider(chainId))
	// check that chainID and provider network are the same, else console log warning
	const network = await provider.getNetwork()
	if (network.chainId != Number(chainId)) {
		console.warn('WARNING: chainId and provider network are different')
	}
	const contract = await getContract(chainId, provider, contractVersion)

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
	if (VAULT_CONTRACTS_V4_ANDUP.includes(contractVersion)) {
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
		const chainDetails = TOKEN_DETAILS.find((chain) => chain.chainId === chainId)
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

			try {
				const response = await fetch(tokenURI)
				if (response.ok) {
					metadata = await response.json()
				}
			} catch (err: any) {
				console.warn(
					`Could not fetch metadata at uri ${tokenURI} for a ERC-721 token ${tokenAddress} due to`,
					err
				)
			}

			tokenDecimals = null
		} catch (error) {
			console.error('Error fetching ERC721 info:', error)
		}
		tokenAmount = '1'
	} else if (tokenType == interfaces.EPeanutLinkType.erc1155) {
		try {
			const contract1155 = new ethers.Contract(tokenAddress, ERC1155_ABI, provider)
			const fetchedTokenURI = await contract1155.uri(deposit.tokenId)
			tokenURI = fetchedTokenURI

			try {
				const response = await fetch(tokenURI)
				if (response.ok) {
					metadata = await response.json()
				}
			} catch (err: any) {
				console.warn(
					`Could not fetch metadata at uri ${tokenURI} for a ERC-1155 token ${tokenAddress} due to`,
					err
				)
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
		chainId,
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
		recipient: deposit.recipient,
		reclaimableAfter: deposit.reclaimableAfter,
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

async function resolveFromEnsName({ ensName }: { ensName: string }): Promise<string | undefined> {
	const provider = await getDefaultProvider('1')
	const x = await provider.resolveName(ensName)

	return x ? x : undefined
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
		chainId: payload.chainId,
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
		recipientAddress: recipientAddress,
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
	if (data.error) {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR,
			`Got error ${data.error} from the API while claiming x-chain`
		)
	}
	return { txHash: data.txHash }
}

async function getSquidChains({ isTestnet }: { isTestnet: boolean }): Promise<interfaces.ISquidChain[]> {
	// TODO rate limits? Caching?
	const url = isTestnet
		? 'https://testnet.apiplus.squidrouter.com/v2/chains'
		: 'https://apiplus.squidrouter.com/v2/chains'
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
		? 'https://testnet.apiplus.squidrouter.com/v2/tokens'
		: 'https://apiplus.squidrouter.com/v2/tokens'

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

	const isSourceChainSupported = supportedChains.some((chain) => chain.chainId === sourceChainId)

	if (!isSourceChainSupported) {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNSUPPORTED_CHAIN,
			'Unsupported chain - can not bridge from this chain'
		)
	}

	const supportedTokens = await getSquidTokens({ isTestnet })

	const supportedTokensMap = new Map<string, interfaces.ISquidToken[]>()

	supportedTokens.forEach(({ chainId, address, name, symbol, logoURI }) => {
		if (!supportedTokensMap.has(chainId)) {
			supportedTokensMap.set(chainId, [])
		}
		supportedTokensMap.get(chainId)?.push({ chainId, address, name, symbol, logoURI })
	})

	const destinationChains = supportedChains
		.filter((chain) => chain.chainType === 'evm')
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
		slippage: slippage,
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
			to: data.route.transactionRequest.target,
			txEstimation: data.route.estimate,
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
TODO: handle router contract versions in this function too
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
		config.verbose && console.log('getting LatestContractVersion:', chainId, type, experimental)
		const data = PEANUT_CONTRACTS
		const chainData = data[chainId as unknown as keyof typeof data]

		// Filter keys starting with "v" or "Bv" based on type
		// sorts contract versions by descending order. Example: [v4.3, v6.7, v2.1] --> [v6.7, v4.3, v2.1]
		let versions = Object.keys(chainData)
			.filter((key) => key.startsWith(type === 'batch' ? 'Bv' : 'v'))
			.sort((a, b) => {
				const partsA =
					type === 'batch' ? a.substring(2).split('.').map(Number) : a.substring(1).split('.').map(Number)
				const partsB =
					type === 'batch' ? b.substring(2).split('.').map(Number) : b.substring(1).split('.').map(Number)

				// Compare major version first
				if (partsA[0] !== partsB[0]) {
					return partsB[0] - partsA[0]
				}

				// If major version is the same, compare minor version (if present)
				return (partsB[1] || 0) - (partsA[1] || 0)
			})

		config.verbose && console.log('Contract Versions found:', versions)
		let _versions = versions
		// Adjust the filtering logic based on the experimental flag and contract version variables
		if (!experimental) {
			//check if the latest version is an experimental version. On some chains, we've deployed 4.4 but not 4.3. In this case, we want to return 4.4 as latest contract version.
			if (type === 'normal') {
				if (versions[0] === LATEST_EXPERIMENTAL_CONTRACT_VERSION) {
					_versions = versions.filter((version) => version !== LATEST_EXPERIMENTAL_CONTRACT_VERSION)
				}
			} else if (type === 'batch') {
				if (versions[0] === LATEST_EXPERIMENTAL_BATCHER_VERSION) {
					_versions = versions.filter((version) => version !== LATEST_EXPERIMENTAL_BATCHER_VERSION)
				}
			}

			if (_versions.length === 0) {
				_versions = versions
			}
		}

		const highestVersion = _versions[0]

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

	if (!VAULT_CONTRACTS_V4_ANDUP.includes(peanutContractVersion)) {
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

	config.verbose && console.log(addressDeposits)

	// filter out deposits not made by the address
	addressDeposits = addressDeposits.filter((deposit: any) => {
		return deposit.senderAddress.toString() == address.toString()
	})

	config.verbose && console.log(addressDeposits)

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

	config.verbose && console.log(mappedDeposits)

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
		peanutContractVersion = getLatestContractVersion({ chainId, type: 'normal' })
	}

	const addressDepositsWithIdx = await getAllUnclaimedDepositsWithIdxForAddress({
		address: address,
		chainId,
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
	if (!VAULT_CONTRACTS_WITH_EIP_3009.includes(contractVersion)) {
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

	const peanutContract = await getContract(linkDetails.chainId, null, contractVersion)
	const uintAmount = ethers.utils.parseUnits(linkDetails.tokenAmount.toString(), linkDetails.tokenDecimals)
	const randomNonceInt = Math.floor(Math.random() * 1e12)
	const randomNonceHex = '0x' + randomNonceInt.toString(16).padStart(64, '0')

	const { address: pubKey20 } = generateKeysFromString(password)
	const nonceWithPubKeyHex = ethers.utils.solidityKeccak256(['address', 'bytes32'], [pubKey20, randomNonceHex])

	const nowSeconds = Math.floor(Date.now() / 1000)

	// Make a large window of 2 days to ensure the validity
	// during transaction simulation and execution
	const validAfter = BigNumber.from(nowSeconds - 24 * 3600)
	const validBefore = BigNumber.from(nowSeconds + 24 * 3600)

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
}: interfaces.IPrepareGaslessDepositTxParams): Promise<interfaces.IPeanutUnsignedTransaction> {
	if (!provider) provider = await getDefaultProvider(payload.chainId)

	const contract = await getContract(payload.chainId, provider, payload.contractVersion) // get the contract instance
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
	let unsignedTx: interfaces.IPeanutUnsignedTransaction
	try {
		const txRequest = await contract.populateTransaction.makeDepositWithAuthorization(...preparedPayload)
		unsignedTx = ethersV5ToPeanutTx(txRequest)
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
	if (!VAULT_CONTRACTS_WITH_GASLESS_REVOKE.includes(contractVersion)) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: this Peanut version does not support gasless revocations'
		)
	}
	const peanutVault = await getContract(chainId, null, contractVersion)

	const payload: interfaces.IGaslessReclaimPayload = {
		chainId,
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
}: interfaces.IPrepareGaslessReclaimTxParams): Promise<interfaces.IPeanutUnsignedTransaction> {
	if (!provider) provider = await getDefaultProvider(payload.chainId)

	const contract = await getContract(payload.chainId, provider, payload.contractVersion) // get the contract instance
	const preparedPayload: any[] = [[payload.depositIndex], payload.signer, signature]
	console.log('Prepared payload', { preparedPayload })
	let unsignedTx: interfaces.IPeanutUnsignedTransaction
	try {
		const txRequest = await contract.populateTransaction.withdrawDepositSenderGasless(...preparedPayload)
		unsignedTx = ethersV5ToPeanutTx(txRequest)
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

/**
 * gets the contract type
 */
async function getTokenContractType({
	provider,
	address,
}: {
	provider: ethers.providers.Provider
	address: string
}): Promise<interfaces.EPeanutLinkType> {
	const minimalABI = [
		'function supportsInterface(bytes4) view returns (bool)',
		'function totalSupply() view returns (uint256)',
		'function balanceOf(address) view returns (uint256)',
	]

	// Interface Ids for ERC721 and ERC1155
	const ERC721_INTERFACE_ID = '0x80ac58cd' // ERC721
	const ERC1155_INTERFACE_ID = '0xd9b67a26' // ERC1155

	const contract = new ethers.Contract(address, minimalABI, provider)

	const isERC721 = await supportsInterface(contract, ERC721_INTERFACE_ID)
	const isERC1155 = await supportsInterface(contract, ERC1155_INTERFACE_ID)
	let isERC20 = false

	// Check for ERC20 if it's not ERC721 or ERC1155
	if (!isERC721 && !isERC1155) {
		isERC20 = await contract
			.totalSupply()
			.then(() => true)
			.catch(() => false)
	}

	if (address.toLowerCase() === ethers.constants.AddressZero.toLowerCase()) return 0
	if (isERC20) return 1
	if (isERC721) return 2
	if (isERC1155) return 3
}

async function supportsInterface(contract, interfaceId) {
	try {
		return await contract.supportsInterface(interfaceId)
	} catch (error) {
		return false
	}
}

async function getTokenContractDetails({
	address,
	provider,
}: {
	address: string
	provider: ethers.providers.Provider
}): Promise<{ type: interfaces.EPeanutLinkType; decimals?: number; name?: string; symbol?: string }> {
	//@ts-ignore
	const batchProvider = new ethers.providers.JsonRpcBatchProvider(provider.connection.url)

	//get the contract type
	const contractType = await getTokenContractType({ address: address, provider: batchProvider })

	config.verbose && console.log('contractType: ', contractType)
	switch (contractType) {
		case 0: {
			return {
				type: 0,
				decimals: 18,
			}
		}
		case 1: {
			const contract = new ethers.Contract(address, ERC20_ABI, batchProvider)
			const [name, symbol, decimals] = await Promise.all([
				contract.name(),
				contract.symbol(),
				contract.decimals(),
			])
			config.verbose && console.log('details: ', [name, symbol, decimals])
			return {
				type: 1,
				name: name,
				symbol: symbol,
				decimals: decimals,
			}
		}
		case 2: {
			const contract = new ethers.Contract(address, ERC721_ABI, batchProvider)
			const [fetchedName, fetchedSymbol] = await Promise.all([contract.name(), contract.symbol()])
			config.verbose && console.log('details: ', [fetchedName, fetchedSymbol])
			return {
				type: 2,
				name: fetchedName,
				symbol: fetchedSymbol,
			}
		}
		case 3: {
			const contract = new ethers.Contract(address, ERC1155_ABI, batchProvider)
			const [fetchedName, fetchedSymbol] = await Promise.all([contract.name(), contract.symbol()])
			config.verbose && console.log('details: ', [fetchedName, fetchedSymbol])
			return {
				type: 3,
				name: fetchedName,
				symbol: fetchedSymbol,
				decimals: null,
			}
		}
	}
}

/**
 * Function to get the balance of a token
 * Not working for ERC721 and ERC1155 tokens yet
 */
async function getTokenBalance({
	tokenAddress,
	walletAddress,
	chainId,
	tokenType = undefined,
	tokenDecimals = undefined,
	tokenId = undefined,
	provider = undefined,
}: {
	tokenAddress: string
	walletAddress: string
	chainId: string
	tokenType?: interfaces.EPeanutLinkType
	tokenDecimals?: number
	tokenId?: string
	provider?: ethers.providers.Provider // TODO: make this optional URL if we decide to remove ethers dependency
}): Promise<String> {
	try {
		if (!provider) provider = await getDefaultProvider(chainId)

		if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
			tokenAddress = ethers.constants.AddressZero.toLowerCase()
		}

		if (!tokenType || !tokenDecimals) {
			const tokenDetails = await getTokenContractDetails({ address: tokenAddress, provider: provider })
			tokenType = tokenDetails.type
			tokenDecimals = tokenDetails.decimals
		}

		if (tokenType === interfaces.EPeanutLinkType.native) {
			const balance = await provider.getBalance(walletAddress)
			return ethers.utils.formatUnits(balance, tokenDecimals)
		} else {
			let contractABI
			switch (tokenType) {
				case interfaces.EPeanutLinkType.erc20: {
					contractABI = ERC20_ABI
					break
				}
				case interfaces.EPeanutLinkType.erc721: {
					throw new interfaces.SDKStatus(
						interfaces.EGenericErrorCodes.ERROR_UNSUPPORTED_TOKEN,
						'This token type is not supported for fetching balance'
					)
				}
				case interfaces.EPeanutLinkType.erc1155: {
					throw new interfaces.SDKStatus(
						interfaces.EGenericErrorCodes.ERROR_UNSUPPORTED_TOKEN,
						'This token type is not supported for fetching balance'
					)
				}
			}

			const contract = new ethers.Contract(tokenAddress, contractABI, provider)

			const balance = await contract.balanceOf(walletAddress)
			return ethers.utils.formatUnits(balance, tokenDecimals)
		}
	} catch (error) {
		console.error(error)
		if (error instanceof interfaces.SDKStatus) {
			throw error
		} else {
			throw new interfaces.SDKStatus(
				interfaces.EGenericErrorCodes.ERROR_GETTING_TOKENBALANCE,
				'Error fetching token balance',
				error.message
			)
		}
	}
}

/**
 * @deprecated Use prepareDepositTxs instead. prepareTxs will be removed in February 2024.
 */
const prepareTxs = prepareDepositTxs

import * as raffle from './raffle.ts'
import * as request from './request.ts'
export * from './raffle.ts'

const peanut = {
	CHAIN_DETAILS,
	LATEST_STABLE_BATCHER_VERSION,
	LATEST_STABLE_CONTRACT_VERSION,
	LATEST_EXPERIMENTAL_CONTRACT_VERSION,
	VAULT_CONTRACTS_WITH_EIP_3009,
	VAULT_CONTRACTS_WITH_GASLESS_REVOKE,
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
	prepareClaimTx,
	claimLinkGasless,
	claimLinkSender,
	prepareClaimLinkSenderTx,
	claimLinkXChainGasless,
	config,
	createClaimPayload,
	createClaimXChainPayload,
	populateXChainClaimTx,
	createLink,
	createLinks,
	createMultiLinkFromLinks,
	shortenMultilink,
	expandMultilink,
	combineRaffleLink,
	detectContractVersionFromTxReceipt,
	estimateGasLimit,
	ethersV5ToPeanutTx,
	formatNumberAvoidScientific,
	generateKeysFromString,
	getAllDepositsForSigner,
	getAllUnclaimedDepositsWithIdxForAddress,
	getContract,
	getContractAddress,
	getDefaultProvider,
	getDefaultProviderUrl,
	getDepositIdx,
	getDepositIdxs,
	getEIP1559Tip,
	getLatestContractVersion,
	getLinkDetails,
	getLinkFromParams,
	getLinksFromMultilink,
	isShortenedLink,
	getLinksFromTx,
	getParamsFromLink,
	getRawParamsFromLink,
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
	peanutToEthersV5Tx,
	prepareTxs,
	prepareDepositTxs,
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
	resolveFromEnsName,
	makeGaslessDepositPayload,
	prepareApproveERC20Tx,
	prepareGaslessDepositTx,
	makeGaslessReclaimPayload,
	prepareGaslessReclaimTx,
	EIP3009Tokens,
	getTokenContractType,
	getTokenContractDetails,
	validateUserName,
	getTxReceiptFromHash,
	getTokenBalance,
	compareVersions,
	...raffle,
	...request,
}

export default peanut
export {
	peanut,
	CHAIN_DETAILS,
	LATEST_STABLE_BATCHER_VERSION,
	LATEST_STABLE_CONTRACT_VERSION,
	LATEST_EXPERIMENTAL_CONTRACT_VERSION,
	VAULT_CONTRACTS_WITH_EIP_3009,
	VAULT_CONTRACTS_WITH_GASLESS_REVOKE,
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
	prepareClaimTx,
	claimLinkGasless,
	claimLinkSender,
	prepareClaimLinkSenderTx,
	claimLinkXChainGasless,
	config,
	createClaimPayload,
	createClaimXChainPayload,
	populateXChainClaimTx,
	createLink,
	createLinks,
	createMultiLinkFromLinks,
	shortenMultilink,
	expandMultilink,
	combineRaffleLink,
	detectContractVersionFromTxReceipt,
	estimateGasLimit,
	ethersV5ToPeanutTx,
	formatNumberAvoidScientific,
	generateKeysFromString,
	getAllDepositsForSigner,
	getAllUnclaimedDepositsWithIdxForAddress,
	getContract,
	getContractAddress,
	getDefaultProvider,
	getDefaultProviderUrl,
	getDepositIdx,
	getDepositIdxs,
	getEIP1559Tip,
	getLatestContractVersion,
	getLinkDetails,
	getLinkFromParams,
	getLinksFromMultilink,
	isShortenedLink,
	getLinksFromTx,
	getParamsFromLink,
	getRawParamsFromLink,
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
	peanutToEthersV5Tx,
	prepareTxs,
	prepareApproveERC20Tx,
	prepareDepositTxs,
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
	resolveFromEnsName,
	makeGaslessDepositPayload,
	prepareGaslessDepositTx,
	makeGaslessReclaimPayload,
	prepareGaslessReclaimTx,
	EIP3009Tokens,
	getTokenContractType,
	getTokenContractDetails,
	validateUserName,
	getTxReceiptFromHash,
	getTokenBalance,
	compareVersions,
	getStringAmount,
}
