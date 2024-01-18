import * as ethers from 'ethersv5'
import { TransactionReceipt } from '@ethersproject/abstract-provider'

import * as consts from '../consts'
import * as functions from '../functions'
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
 * Converts a string to bytes, pads it to 32 bytes and hashes it
 */
export function hash_string(str: string) {
	//@HUGO: I've added in a .toString() here, but I'm not sure if it's good
	let hash = ethers.utils.toUtf8Bytes(str).toString()
	hash = ethers.utils.hexlify(hash)
	hash = ethers.utils.hexZeroPad(hash, 32)
	hash = ethers.utils.keccak256(hash)
	return hash
}

/**
 * Generates a random string of the specified length
 *  need to avoid bias: https://gist.github.com/joepie91/7105003c3b26e65efcea63f3db82dfba#so-how-do-i-obtain-random-values-securely
 * h/t to Nanak Nihal from Holonym
 * browser: tries to use secure generateKey if available, otherwise falls back to getRandomValues
 * node: uses secure crypto.randomBytes
 */
export async function getRandomString(n: number = 16): Promise<string> {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' //TODO: change
	const charsetLength = charset.length
	const maxByteValue = 256 // Each byte has 256 possible values
	const maxUnbiasedByte = maxByteValue - (maxByteValue % charsetLength)

	let randomString = ''

	const generateKeyRandomBytes = async (length: number): Promise<Uint8Array> => {
		if (crypto.subtle) {
			try {
				// Use generateKey to generate a symmetric key of sufficient length
				const key = await crypto.subtle.generateKey(
					{
						name: 'AES-GCM',
						length: 256, // length * 8, // Convert byte length to bit length
						// TODO: non 16/32 length passwords?
					},
					true,
					['encrypt', 'decrypt']
				)
				// Export the key to raw bytes
				const keyBuffer = await crypto.subtle.exportKey('raw', key)
				return new Uint8Array(keyBuffer)
			} catch (error) {
				console.warn('Failed to use generateKey. Falling back to getRandomValues.', error)
			}
		}
		return getRandomValuesRandomBytes(length)
	}

	const getRandomValuesRandomBytes = async (length: number): Promise<Uint8Array> => {
		if (crypto.getRandomValues) {
			// Browser
			const array = new Uint8Array(length)
			crypto.getRandomValues(array)
			return array
		} else {
			// Node
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const crypto = await import('node:crypto')
			return crypto.randomBytes(length)
		}
	}

	while (randomString.length < n) {
		const randomBytes = await generateKeyRandomBytes(n - randomString.length)
		for (const byte of randomBytes) {
			if (byte < maxUnbiasedByte) {
				const randomIndex = byte % charsetLength
				randomString += charset.charAt(randomIndex)
			}
		}
	}

	return randomString.substring(0, n) // Return only the first 'n' characters
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

export function compareDeposits(deposit1: any, deposit2: any) {
	if (
		deposit1.pubKey20 == deposit2.pubKey20 &&
		BigInt(deposit1.amount._hex) == BigInt(deposit2.amount._hex) &&
		deposit1.tokenAddress == deposit2.tokenAddress &&
		deposit1.contractType == deposit2.contractType &&
		deposit1.claimed == deposit2.claimed &&
		(ethers.BigNumber.isBigNumber(deposit1.timestamp) ? BigInt(deposit1.timestamp._hex) : deposit1.timestamp) ==
			(ethers.BigNumber.isBigNumber(deposit2.timestamp) ? BigInt(deposit2.timestamp._hex) : deposit2.timestamp) &&
		deposit1.senderAddress == deposit2.senderAddress
	) {
		return true
	} else return false
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

/**
 * Gets all deposits for a given signer and chainId.
 *
 */
export async function getAllDepositsForSigner({
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
		functions.getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}
	const contract = await functions.getContract(chainId, signer, contractVersion)
	const address = await signer.getAddress()
	return await contract.getAllDepositsForAddress(address)
}

export function toggleVerbose(verbose?: boolean) {
	if (verbose !== undefined) {
		config.config.verbose = verbose
	} else {
		config.config.verbose = !config.config.verbose
	}
	console.log('Peanut-SDK: toggled verbose mode to: ', config.config.verbose)
}
