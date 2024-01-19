import * as ethers from 'ethersv5'
import { TransactionReceipt } from '@ethersproject/abstract-provider'

import * as consts from '../consts'
import * as functions from '../modules'
import * as config from '../config'
/**
 * Prints a greeting message to the console.
 */
export function greeting() {
	console.log(
		'🥜 Hello & thanks for using the Peanut SDK! Currently running version ' +
			consts.VERSION +
			'. Support available at https://discord.com/invite/BX9Ak7AW28'
	)
}

/*
 * Function to assert a value
 */
export function assert(condition: any, message: string) {
	if (!condition) {
		throw new Error(message || 'Assertion failed')
	}
}

/**
 * Returns an object with the keys in lowerCase
 */
export function toLowerCaseKeys(obj: any): any {
	let newObj: any = {}
	Object.keys(obj).forEach((key) => {
		// Convert only the top-level keys to lowercase
		let lowerCaseKey = key.toLowerCase()
		newObj[lowerCaseKey] = obj[key]
	})
	return newObj
}

export async function resolveToENSName({
	address,
	provider = null,
}: {
	address: string
	provider?: ethers.providers.Provider
}) {
	if (provider == null) {
		provider = await functions.getDefaultProvider('1')
	}
	const ensName = await provider.lookupAddress(address)
	return ensName
}

export async function getTxReceiptFromHash(
	txHash: string,
	chainId: string,
	provider?: ethers.providers.Provider
): Promise<TransactionReceipt> {
	provider = provider ?? (await functions.getDefaultProvider(String(chainId)))
	const txReceipt = await provider.getTransactionReceipt(txHash)
	// throw error if txReceipt is null
	if (txReceipt == null) {
		throw new Error('Could not fetch transaction receipt')
	}
	return txReceipt
}

export function toggleVerbose(verbose?: boolean) {
	if (verbose !== undefined) {
		config.config.verbose = verbose
	} else {
		config.config.verbose = !config.config.verbose
	}
	console.log('Peanut-SDK: toggled verbose mode to: ', config.config.verbose)
}
