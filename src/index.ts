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
	ERC721_ABI,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	VERSION,
	DEFAULT_CONTRACT_VERSION,
	DEFAULT_BATCHER_VERSION,
	TOKEN_TYPES,
	VERBOSE,
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

async function checkRpc(rpc: string): Promise<boolean> {
	const verbose = VERBOSE
	verbose && console.log('checkRpc rpc:', rpc)

	try {
		// Use the timeout function to wrap the fetchGetBalance call and give it a timeout.
		const response = await timeout(2000, fetchGetBalance(rpc))

		// If the JSON RPC response contains an error, we can consider it a failure.
		if (response.error) {
			verbose && console.log('JSON RPC Error for:', rpc, response.error.message)
			return false
		}

		// check balance is larger than 0
		// TODO:

		// This will be a successful RPC if the result (the balance in this case) is returned.
		return true
	} catch (error) {
		console.log('Error checking provider:', rpc, 'Error:', error)
		return false
	}
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
 * Returns the default provider for a given chainId
 */
async function getDefaultProvider(chainId: string, verbose = false): Promise<ethers.providers.JsonRpcProvider> {
	verbose = VERBOSE
	verbose && console.log('Getting default provider for chainId ', chainId)
	const rpcs = CHAIN_DETAILS[chainId as keyof typeof CHAIN_DETAILS].rpc

	verbose && console.log('rpcs', rpcs)

	// this code goes through all RPCs. If any one of them is alive, the promise is resolved and a valid provider is returned.
	// If all of them fail, the promise is rejected.
	const checkPromises = rpcs.map((rpc) => {
		return new Promise<{ isValid: boolean; rpc: string }>(async (resolve, reject) => {
			try {
				// If the RPC string contains a placeholder for the API key, replace it.
				rpc = rpc.replace('${INFURA_API_KEY}', '4478656478ab4945a1b013fb1d8f20fd') // for workshop
				const isValid = await checkRpc(rpc)

				verbose && console.log('RPC checked:', rpc, isValid ? 'Valid' : 'Invalid')

				// Only resolve when the RPC is valid.
				if (isValid) {
					resolve({ isValid, rpc })
				}
			} catch (err) {
				// Do nothing here, because we only want to resolve if the RPC is valid.
			}
		})
	})

	return new Promise(async (resolve, reject) => {
		// Use Promise.race to get the first valid RPC.
		Promise.race(checkPromises)
			.then(async (result) => {
				if (result && result.isValid) {
					verbose && console.log('Valid RPC found:', result.rpc)
					const provider = new ethers.providers.JsonRpcProvider({
						url: result.rpc,
						skipFetchSetup: true,
					})
					// const provider = new ethers.providers.JsonRpcProvider(result.rpc)
					// await provider.ready
					resolve(provider)
				}
			})
			.catch(() => {
				// Do nothing here. This catch block will not be triggered.
			})

		// Fallback: If none of the RPCs are valid after they've all been checked.
		Promise.allSettled(checkPromises).then(() => {
			reject(new Error('No alive provider found for chainId ' + chainId))
		})
	})
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

async function getApproved(
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
		console.error('Error fetching approval:', error)
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
	const allowance = await getAllowance(tokenContract, spender, address, defaultProvider)
	if (allowance.gte(amount)) {
		console.log('Allowance already enough, no need to approve more (allowance: ' + allowance.toString() + ')')
		return null
	}

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
    const tokenContract = new ethers.Contract(tokenAddress, ERC721_ABI, defaultProvider);

	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	console.log('Checking approval for ' + tokenAddress + ' token ID: ' + tokenId);
    // Check if approval is already sufficient
    const currentApproval = await getApproved(tokenContract, tokenId, defaultProvider);
    if (currentApproval.toLowerCase() === spender.toLowerCase()) {
        console.log('Approval already granted to the spender for token ID: ' + tokenId);
        return null;
    }
	else{
		console.log('Approval granted to different address: ' + currentApproval + ' for token ID: ' + tokenId);
	}

    // Prepare the transaction to approve the spender for the specified token ID
    const tx = tokenContract.populateTransaction.approve(spender, tokenId, { from: address });
    return tx;
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
	const verbose = VERBOSE // TODO: move this to initializing the sdk
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
	const chainDetails = CHAIN_DETAILS[chainId]

	if (chainId == 137) {
		maxPriorityFeePerGas = ethers.utils.parseUnits('30', 'gwei')
		verbose && console.log('Setting maxPriorityFeePerGas to 30 gwei')
	}

	// Check if EIP-1559 is supported
	verbose && console.log('checking if eip1559 is supported...')
	if (chainDetails && chainDetails.features) {
		eip1559 = chainDetails.features.some((feature: any) => feature.name === 'EIP1559')
		verbose && console.log('Setting eip1559 to false chainid:', chainId)
	} else {
		verbose && console.log('Setting eip1559 to false chainid:', chainId)
		eip1559 = false
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
		VERBOSE && console.log('called estimate gas limit. contract.address:', contract.address, params, txOptions)
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
	const verbose = VERBOSE
	try {
		linkDetails = validateLinkDetails(linkDetails, passwords, numberOfLinks)
	} catch (error) {
		console.error(error)
		return {
			unsignedTxs: [],
			status: new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
				'Error validating link details: please make sure all required fields are provided and valid'
			),
		}
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
			console.error(error)
			return {
				unsignedTxs: [],
				status: new interfaces.SDKStatus(
					interfaces.EPrepareCreateTxsStatusCodes.ERROR_GETTING_DEFAULT_PROVIDER,
					'Error getting the default provider'
				),
			}
		}
	}

	if (linkDetails.tokenType == 0) {
		txOptions = {
			...txOptions,
			value: totalTokenAmount,
		}
	} else if (linkDetails.tokenType == 1) {
		VERBOSE && console.log('checking allowance...')
		try {
			const approveTx = await prepareApproveERC20Tx(
				address,
				String(linkDetails.chainId),
				linkDetails.tokenAddress!,
				tokenAmountBigNum,
				linkDetails.tokenDecimals,
				true,
				peanutContractVersion,
				provider
			)
			approveTx && unsignedTxs.push(approveTx)
		} catch (error) {
			console.error(error)
			return {
				unsignedTxs: [],
				status: new interfaces.SDKStatus(
					interfaces.EPrepareCreateTxsStatusCodes.ERROR_PREPARING_APPROVE_ERC20_TX,
					'Error preparing the approve ERC20 tx, please make sure you have enough balance and have approved the contract to spend your tokens'
				),
			}
		}
	} else if (linkDetails.tokenType == 2) {
		VERBOSE && console.log('checking ERC721 allowance...')
		try {
			const approveTx = await prepareApproveERC721Tx(
				address,
				String(linkDetails.chainId),
				linkDetails.tokenAddress!,
				linkDetails.tokenId)

			approveTx && unsignedTxs.push(approveTx)
		} catch (error) {
			console.error(error)
			return {
				unsignedTxs: [],
				status: new interfaces.SDKStatus(
					interfaces.EPrepareCreateTxsStatusCodes.ERROR_PREPARING_APPROVE_ERC721_TX,
					'Error preparing the approve ERC721 tx, please make sure you have enough balance and have approved the contract to spend your tokens'
				)
			}
		}
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
		// 	verbose && console.log('Error estimating gas limit:', error)
		// }
		try {
			depositTx = await contract.populateTransaction.makeDeposit(...depositParams, txOptions)
		} catch (error) {
			console.error(error)
			return {
				unsignedTxs: [],
				status: new interfaces.SDKStatus(
					interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
					'Error making the deposit to the contract'
				),
			}
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
			console.error(error)
			return {
				unsignedTxs: [],
				status: new interfaces.SDKStatus(
					interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
					'Error making the deposit to the contract'
				),
			}
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
			console.error(error)
			return {
				unsignedTxs: [],
				status: new interfaces.SDKStatus(
					interfaces.EPrepareCreateTxsStatusCodes.ERROR_GETTING_TX_COUNT,
					'Error getting the transaction count'
				),
			}
		}

		unsignedTxs.forEach((tx, i) => (tx.nonce = nonce + i))
	}

	return { status: new interfaces.SDKStatus(interfaces.EPrepareCreateTxsStatusCodes.SUCCESS), unsignedTxs }
}

async function signAndSubmitTx({
	structSigner,
	unsignedTx,
}: interfaces.ISignAndSubmitTxParams): Promise<interfaces.ISignAndSubmitTxResponse> {
	const verbose = VERBOSE
	verbose && console.log('unsigned tx: ', unsignedTx)

	// Set the transaction options using setFeeOptions
	const txOptions = await setFeeOptions({
		provider: structSigner.signer.provider,
		eip1559: true, // or any other value you want to set
		// set other options as needed
	})

	// Merge the transaction options into the unsigned transaction
	unsignedTx = { ...unsignedTx, ...txOptions }

	let tx: ethers.providers.TransactionResponse
	try {
		tx = await structSigner.signer.sendTransaction(unsignedTx)
	} catch (error) {
		console.error(error)
		return {
			txHash: '',
			tx: null,
			status: new interfaces.SDKStatus(interfaces.ESignAndSubmitTx.ERROR_SENDING_TX, 'Error sending the Tx'),
		}
	}

	verbose && console.log('tx: ', tx)
	return { txHash: tx.hash, tx, status: new interfaces.SDKStatus(interfaces.ESignAndSubmitTx.SUCCESS) }
}

// async function signAndSubmitTx({
// 	structSigner,
// 	unsignedTx,
// }: interfaces.ISignAndSubmitTxParams): Promise<interfaces.ISignAndSubmitTxResponse> {
// 	const verbose = VERBOSE
// 	verbose && console.log('unsigned tx: ', unsignedTx)

// 	let tx: ethers.providers.TransactionResponse
// 	try {
// 		tx = await structSigner.signer.sendTransaction(unsignedTx)
// 	} catch (error) {
// 		console.error('Error estimating gas, sending with a predefined gas limit: ', error)
// 		unsignedTx.gasLimit = ethers.utils.hexlify(300000) // Set a predefined gas limit here
// 		tx = await structSigner.signer.sendTransaction(unsignedTx)
// 	}

// 	verbose && console.log('tx: ', tx)
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
		console.error(error)
		return {
			links: [],
			status: new interfaces.SDKStatus(
				interfaces.EGetLinkFromTxStatusCodes.ERROR_GETTING_TX_RECEIPT_FROM_HASH,
				'Error getting the transaction receipt from the hash'
			),
		}
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
		status: new interfaces.SDKStatus(interfaces.EGetLinkFromTxStatusCodes.SUCCESS),
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

	if (numberOfLinks > 1) {
		assert(
			passwords.length === numberOfLinks,
			'when creating multiple links, passwords must be an array of length numberOfLinks'
		)
	}

	assert(
		linkDetails.tokenType == 0 || linkDetails.tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-ETH tokens'
	)
	if (linkDetails.tokenType == 2) {
		assert(numberOfLinks == 1, 'can only send one ERC721 at a time')
	}
	assert(
		!(linkDetails.tokenType == 1 || linkDetails.tokenType == 3) || linkDetails.tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
	)

	if (linkDetails.tokenType !== 0 && linkDetails.tokenAddress === '0x000000cl0000000000000000000000000000000000') {
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
}: interfaces.ICreateLinkParams): Promise<interfaces.ICreateLinkResponse> {
	const verbose = VERBOSE
	const password = await getRandomString(16)
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
	if (prepareTxsResponse.status.code != interfaces.EPrepareCreateTxsStatusCodes.SUCCESS) {
		return {
			createdLink: { link: '', txHash: '' },
			status: prepareTxsResponse.status,
		}
	}

	// Sign and submit the transactions sequentially
	const signedTxs = []
	for (const unsignedTx of prepareTxsResponse.unsignedTxs) {
		const signedTx = await signAndSubmitTx({ structSigner, unsignedTx })
		signedTxs.push(signedTx)
		// wait for the transaction to be mined before sending the next one
		// we could bundle both in one block, but only works if we set custom gas limits.
		try {
			await signedTx.tx.wait()
		} catch (error) {
			console.error(error)
			return {
				createdLink: { link: '', txHash: '' },
				status: new interfaces.SDKStatus(
					interfaces.ESignAndSubmitTx.ERROR_SENDING_TX,
					'Error waiting for the transaction'
				),
			}
		}
	}
	// await signedTxs[signedTxs.length - 1].tx.wait() // rpcs not fast enough

	// Get the links from the transactions
	const linksFromTxResp = await getLinksFromTx({
		linkDetails,
		txHash: signedTxs[signedTxs.length - 1].txHash,
		passwords: [password],
		provider: provider,
	})

	if (linksFromTxResp.status.code != interfaces.EGetLinkFromTxStatusCodes.SUCCESS) {
		return { createdLink: { link: '', txHash: '' }, status: linksFromTxResp.status }
	}
	return {
		createdLink: { link: linksFromTxResp.links, txHash: signedTxs[signedTxs.length - 1].txHash },
		status: new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.SUCCESS),
	}
}

async function createLinks({
	structSigner,
	linkDetails,
	numberOfLinks = 2,
	peanutContractVersion = DEFAULT_CONTRACT_VERSION,
}: interfaces.ICreateLinksParams): Promise<interfaces.ICreateLinksResponse> {
	const verbose = VERBOSE
	const passwords = await Promise.all(Array.from({ length: numberOfLinks }, () => getRandomString(16)))
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
	if (prepareTxsResponse.status.code != interfaces.EPrepareCreateTxsStatusCodes.SUCCESS) {
		return {
			createdLinks: [],
			status: prepareTxsResponse.status,
		}
	}

	verbose && console.log('prepareTxsResponse: ', prepareTxsResponse)
	// Sign and submit the transactions
	const signedTxs = []
	for (const unsignedTx of prepareTxsResponse.unsignedTxs) {
		const signedTx = await signAndSubmitTx({ structSigner, unsignedTx })
		signedTxs.push(signedTx)
	}
	if (signedTxs.some((tx) => tx.status.code !== peanut.interfaces.ESignAndSubmitTx.SUCCESS)) {
		return {
			createdLinks: [],
			status: new interfaces.SDKStatus(
				interfaces.ESignAndSubmitTx.ERROR_SENDING_TX,
				'Error signing and submitting the transaction'
			),
		}
	}

	await signedTxs[signedTxs.length - 1].tx.wait()
	if (signedTxs.some((tx) => tx.status.code !== peanut.interfaces.ESignAndSubmitTx.SUCCESS)) {
		return {
			createdLinks: [],
			status: new interfaces.SDKStatus(
				interfaces.ESignAndSubmitTx.ERROR_SENDING_TX,
				'Error waiting for the transaction'
			),
		}
	}

	verbose && console.log('signedTxs: ', signedTxs)

	const linksFromTxResp = await getLinksFromTx({
		linkDetails,
		txHash: signedTxs[signedTxs.length - 1].txHash,
		passwords: passwords,
		provider,
	})
	if (linksFromTxResp.status.code != interfaces.EGetLinkFromTxStatusCodes.SUCCESS) {
		return { createdLinks: [], status: linksFromTxResp.status }
	}
	const createdLinks = linksFromTxResp.links.map((link) => {
		return { link: link, txHash: signedTxs[signedTxs.length - 1].txHash }
	})

	return { createdLinks: createdLinks, status: new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.SUCCESS) }
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
	const verbose = VERBOSE
	// TODO: split into 2

	const signer = structSigner.signer
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
		// eip1559,
		// maxFeePerGas,
		// maxPriorityFeePerGas,
		// gasLimit,
		// verbose,
	})

	const claimParams = [depositIdx, recipient, addressHashEIP191, signature]
	verbose && console.log('claimParams: ', claimParams)
	verbose && console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')

	// withdraw the deposit
	const tx = await contract.withdrawDeposit(...claimParams, txOptions)
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	const txReceipt = await tx.wait()

	return {
		status: new interfaces.SDKStatus(interfaces.EClaimLinkStatusCodes.SUCCESS),
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
	const verbose = VERBOSE // TODO: move this to initializing the SDK
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

	let tokenAmount = "0"
	let symbol = "?"
	let name = "?"
	
	if (tokenType == 1) {
		// ERC20 tokens exist in details colelction
		const chainDetails = TOKEN_DETAILS.find((chain) => chain.chainId === String(chainId))
		if (!chainDetails) {
			throw new Error('Chain details not found')
		}

		// Find the token within the tokens array of the chain
		const tokenDetails = chainDetails.tokens.find((token) => token.address.toLowerCase() === tokenAddress.toLowerCase())
		if (!tokenDetails) {
			throw new Error('Token details not found')
		}

		symbol = tokenDetails.symbol
		name = tokenDetails.name

		// Format the token amount
		tokenAmount = ethers.utils.formatUnits(deposit.amount, tokenDetails.decimals)
	}
	else if (tokenType == 2) {
		// get name and symbol from ERC721 contract directly
		try {
			const contract721 = new ethers.Contract(tokenAddress, ERC721_ABI, provider)
			name = await contract721.name()
			symbol = await contract721.symbol()
		} catch (error) {
			console.error('Error fetching ERC721 info:', error)
		}
		tokenAmount = "1"
	}

	// TODO: Fetch token price using API

	return {
		link: link,
		chainId: chainId,
		depositIndex: depositIdx,
		contractVersion: contractVersion,
		password: password,
		tokenType: deposit.contractType,
		tokenAddress: deposit.tokenAddress,
		tokenSymbol: symbol,
		tokenName: name,
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
	const verbose = VERBOSE
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
	prepareTxs,
	signAndSubmitTx,
	getLinksFromTx,
	formatNumberAvoidScientific,
	trim_decimal_overflow,
	VERSION,
	version: VERSION,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	TOKEN_TYPES,
	DEFAULT_CONTRACT_VERSION,
	PEANUT_CONTRACTS,
	interfaces,
}

console.log('peanut-sdk version: ', VERSION)

export default peanut
export {
	peanut,
	greeting,
	getRandomString,
	getLinkFromParams,
	getParamsFromLink,
	getParamsFromPageURL,
	prepareTxs,
	signAndSubmitTx,
	getLinksFromTx,
	createLink,
	createLinks,
	claimLink,
	claimLinkGasless,
	VERSION,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	TOKEN_TYPES,
	DEFAULT_CONTRACT_VERSION,
	PEANUT_CONTRACTS,
}
