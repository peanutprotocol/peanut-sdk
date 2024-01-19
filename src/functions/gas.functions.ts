import * as ethers from 'ethersv5'
import { Provider, TransactionReceipt, TransactionRequest } from '@ethersproject/abstract-provider'

import * as consts from '../consts'
import * as utils from '../utils'
import * as config from '../config'
import * as data from '../data'
import * as functions from './index'
import * as interfaces from '../interfaces'

export async function supportsEIP1559(provider: ethers.providers.Provider): Promise<boolean> {
	const block = await provider.getBlock('latest')
	// EIP-1559 compatible blocks include a baseFeePerGas field.
	return block.baseFeePerGas !== undefined
}

export async function getEIP1559Tip(chainId: string): Promise<ethers.BigNumber | null> {
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
export async function setFeeOptions({
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
	config.config.verbose && console.log('Setting tx options...')
	let feeData
	// if not txOptions, create it (oneliner)
	txOptions = txOptions || {}
	try {
		config.config.verbose && console.log('getting Fee data')
		// TODO: skip fetching fee data if provided
		feeData = await provider.getFeeData()
		config.config.verbose && console.log('Fetched gas price from provider:', feeData)
	} catch (error) {
		console.error('Failed to fetch gas price from provider:', error)
		throw error
	}

	const chainId = (await provider.getNetwork().then((network) => network.chainId)).toString()
	const chainDetails = data.CHAIN_DETAILS[chainId]

	if (gasLimit) {
		txOptions.gasLimit = gasLimit
	} else if (txRequest) {
		const gasLimitRaw = await provider.estimateGas(txRequest)
		txOptions.gasLimit = gasLimitRaw.mul(gasLimitMultiplier)
	}
	config.config.verbose && console.log('checking if eip1559 is supported...')

	// Check if EIP-1559 is supported
	// if on milkomeda or bnb or linea, set eip1559 to false
	// Even though linea is eip1559 compatible, it is more reliable to use the good old gasPrice
	if (chainId === '2001' || chainId === '200101' || chainId === '56' || chainId === '59144' || chainId === '59140') {
		eip1559 = false
		config.config.verbose && console.log('Setting eip1559 to false as an exception')
	} else if (chainDetails && chainDetails.features) {
		eip1559 = chainDetails.features.some((feature: any) => feature.name === 'EIP1559')
		config.config.verbose && console.log('EIP1559 support determined from chain features:', eip1559)
	} else {
		config.config.verbose && console.log('Chain features not available, checking EIP1559 support via feeData...')
		try {
			eip1559 = 'maxFeePerGas' in feeData
			config.config.verbose && console.log('EIP1559 support determined from feeData:', eip1559)
		} catch (error) {
			console.error('Failed to determine EIP1559 support from feeData:', error)
			eip1559 = false
		}
	}

	if (eip1559) {
		try {
			config.config.verbose && console.log('Setting eip1559 tx options...', txOptions)
			config.config.verbose && console.log('feeData:', feeData)

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
				if (!['59144', '59140'].includes(chainId)) {
					if (BigInt(txOptions.maxPriorityFeePerGas) > lastBaseFeePerGas) {
						txOptions.maxPriorityFeePerGas = lastBaseFeePerGas.toString()
					}
				}

				// for polygon (137), set priority fee to min 40 gwei (they have a minimum of 30 for spam prevention)
				if (chainId == '137') {
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

	config.config.verbose && console.log('FINAL txOptions:', txOptions)

	return txOptions
}

export async function estimateGasLimit(
	contract: any,
	functionName: string,
	params: any,
	txOptions: any,
	multiplier = 1.3
) {
	try {
		config.config.verbose &&
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
