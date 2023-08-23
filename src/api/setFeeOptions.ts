import { FeeData } from '@ethersproject/abstract-provider'
import { BigNumberish, ethers } from 'ethersv5'
import { TxFeeOptions } from './txOptions'

export async function setFeeOptions({
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
}: TxFeeOptions = {}) {
	let feeData: FeeData
	// if not txOptions, create it (oneliner)
	txOptions = txOptions || {}
	if (!provider) {
		throw new Error("setFeeOptions: provider missing")
	}
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

	if (eip1559) {
		verbose && console.log('Setting eip1559 tx options...', txOptions)
		txOptions.maxFeePerGas =
			maxFeePerGas ||
			(BigInt(feeData.maxFeePerGas?.toString() || "0") * BigInt(Math.round(maxFeePerGasMultiplier * 10))) / BigInt(10)
		txOptions.maxPriorityFeePerGas =
			maxPriorityFeePerGas ||
			(BigInt(feeData.maxPriorityFeePerGas?.toString() || "0") *
				BigInt(Math.round(maxPriorityFeePerGasMultiplier * 10))) /
			BigInt(10)

		// ensure maxPriorityFeePerGas is less than maxFeePerGas
		if (txOptions.maxPriorityFeePerGas > txOptions.maxFeePerGas) {
			txOptions.maxPriorityFeePerGas = txOptions.maxFeePerGas
		}
	} else {
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
		const proposedGasPrice = ((gasPrice || BigInt(0)) * BigInt(Math.round(gasPriceMultiplier * 10))) / BigInt(10)
		txOptions.gasPrice = proposedGasPrice.toString()
	}

	verbose && console.log('FINAL txOptions:', txOptions)

	return txOptions
}
