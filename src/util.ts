import { ethers } from 'ethersv5' // v5
import { CHAIN_MAP } from './data'

export function assert(condition: any, message: string) {
	if (!condition) {
		throw new Error(message || 'Assertion failed')
	}
}

/**
 * Prints a greeting message to the console.
 */
export function greeting() {
	console.log(
		'🥜 Hello & thanks for using the Peanut SDK! If you run into any issues, dm @hugomont on telegram or hop on the Peanut Protocol discord'
	)
}

/**
 * Generates a deterministic key pair from an arbitrary length string
 *
 * @param {string} string - The string to generate a key pair from
 * @returns {Object} - An object containing the address and privateKey
 */
export function generateKeysFromString(string: string) {
	const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(string)) // v5
	const wallet = new ethers.Wallet(privateKey)
	return {
		address: wallet.address,
		privateKey: privateKey,
	}
}

/**
 * Converts a string to bytes, pads it to 32 bytes and hashes it
 *
 * @param {string} str - The string to convert and hash
 * @returns {string} - The hashed string
 */
export function hash_string(str: string) {
	const hash = ethers.utils.toUtf8Bytes(str) // v5
	const hexedHash = ethers.utils.hexlify(hash) // v5
	const res = ethers.utils.hexZeroPad(hexedHash, 32) // v5
	return ethers.utils.keccak256(res) // v5
}

/**
 * Signs a message with a private key and returns the signature
 * THIS SHOULD BE AN UNHASHED, UNPREFIXED MESSAGE
 *
 * @param {string} message - The message to sign
 * @param {string} privateKey - The private key to use for signing
 * @returns {string} - The signature
 */
export async function signMessageWithPrivatekey(message: string, privateKey: string) {
	const signer = new ethers.Wallet(privateKey)
	return signer.signMessage(message) // this calls ethers.hashMessage and prefixes the hash
}

/**
 * Verifies a signature with a public key and returns true if valid
 *
 * @param {string} message - The message that was signed
 * @param {string} signature - The signature to verify
 * @param {string} address - The public key to use for verification
 * @returns {boolean} - True if the signature is valid, false otherwise
 */
export function verifySignature(message: string, signature: string, address: string) {
	const messageSigner = ethers.utils.verifyMessage(message, signature) // v5
	return messageSigner == address
}

/**
 * Adds the EIP191 prefix to a message and hashes it same as solidity
 *
 * @param {Uint8Array} bytes - The bytes to prefix and hash
 * @returns {string} - The hashed bytes
 */
export function solidityHashBytesEIP191(bytes: Uint8Array) {
	return ethers.utils.hashMessage(bytes) // v5
}

/**
 * Hashes an address to a 32 byte hex string
 *
 * @param {string} address - The address to hash
 * @returns {string} - The hashed address
 */
export function solidityHashAddress(address: string) {
	return ethers.utils.solidityKeccak256(['address'], [address]) // v5
}

/**
 * Hashes a plain address, adds an Ethereum message prefix, hashes it again and then signs it
 *
 * @param {string} string - The plain address to hash and sign
 * @param {string} privateKey - The private key to use for signing
 * @returns {string} - The signature
 */
export async function signAddress(string: string, privateKey: string) {
	const stringHash = ethers.utils.solidityKeccak256(['address'], [string]) // v5
	const stringHashbinary = ethers.utils.arrayify(stringHash) // v5
	const signer = new ethers.Wallet(privateKey)
	const signature = await signer.signMessage(stringHashbinary) // this calls ethers.hashMessage and prefixes the hash
	return signature
}

/**
 * Generates a random string of the specified length
 *
 * @param {number} length - The length of the string to generate
 * @returns {string} - The generated string
 */
export function getRandomString(length: number) {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
	let result_str = ''
	for (let i = 0; i < length; i++) {
		result_str += chars[Math.floor(Math.random() * chars.length)]
	}
	return result_str
}

/**
 * Returns the parameters from the current page url
 *
 * @returns {Object} - The parameters
 */
export function getParamsFromPageURL() {
	/* returns the parameters from the current page url */
	const params = new URLSearchParams(window.location.search)
	const chainIdString = params.get('c') // can be chain name or chain id
	const chainId = CHAIN_MAP[String(chainIdString) as keyof typeof CHAIN_MAP]
	const contractVersion = params.get('v')
	const depositIdxString = params.get('i') ?? ''
	const depositIdx = parseInt(depositIdxString)
	const password = params.get('p')

	return { chainId, contractVersion, depositIdx, password }
}

/**
 * Returns the parameters from a link
 *
 * @param {string} link - The link to get the parameters from
 *
 * @returns {Object} - The parameters from the link
 */
export function getParamsFromLink(link: string) {
	/* returns the parameters from a link */
	const url = new URL(link)
	let search = url.search

	// If there is no search params, try to get params after hash
	if (search === '') {
		search = url.hash.startsWith('#?') ? url.hash.substring(1) : ''
	}

	const params = new URLSearchParams(search)

	const chainIdString = params.get('c') ?? '' // can be chain name or chain id
	let chainId
	// if can be casted to int, then it's a chain id
	if (parseInt(chainIdString)) {
		chainId = parseInt(chainIdString)
	} else {
		// otherwise it's a chain name
		chainId = CHAIN_MAP[String(chainId) as keyof typeof CHAIN_MAP]
	}

	const contractVersion = params.get('v')
	const depositIdx = parseInt(params.get('i') ?? '')
	const password = params.get('p')
	let trackId = '' // optional
	if (params.get('t')) {
		trackId = params.get('t') ?? ''
	}

	return { chainId, contractVersion, depositIdx, password, trackId }
}

/**
 * Returns a link from the given parameters
 *
 * @param {number|string} chainId - The chainId to use for the link
 * @param {string} contractVersion - The contract version to use for the link
 * @param {number} depositIdx - The deposit index to use for the link
 * @param {string} password - The password to use for the link
 * @param {string} baseUrl - The base URL to use for the link
 * @param {string} trackId - The trackId to use for the link
 * @returns {string} - The generated link
 */
export function getLinkFromParams(
	chainId: number | string,
	contractVersion: number,
	depositIdx: string,
	password: string,
	baseUrl = 'https://peanut.to/claim',
	trackId = ''
) {
	/* returns a link from the given parameters */

	const link = baseUrl + '#?c=' + chainId + '&v=' + contractVersion + '&i=' + depositIdx + '&p=' + password

	if (trackId != '') {
		return link + '&t=' + trackId
	}
	return link
}

/**
 * Returns the deposit index from a tx receipt
 *
 * @param {Object} txReceipt - The transaction receipt to get the deposit index from
 * @param {number|string} chainId - The chainId of the contract
 * @returns {number} - The deposit index
 */
export function getDepositIdx(txReceipt: any, chainId: number | string) {
	/* returns the deposit index from a tx receipt */
	const logs = txReceipt.logs
	// const chainId = txReceipt.chainId;
	let depositIdx
	let logIndex
	if (chainId == 137 || chainId == 80001) {
		// why do you have to be this way?
		logIndex = logs.length - 2
	} else {
		logIndex = logs.length - 1 // last log is the deposit event
	}
	// only works if EventLog. If Log, then need to look at data, and first uint256 is depositIdx.
	try {
		depositIdx = logs[logIndex].args[0]
	} catch (error) {
		// get uint256 from data (first 32 bytes)
		const data = logs[logIndex].data
		const depositIdxHex = data.slice(0, 66)
		depositIdx = BigInt(depositIdxHex) // should this be int or bigint? decide wen TS.
	}
	return depositIdx
}

/**
 * Returns an array of deposit indices from a batch transaction receipt
 *
 * @param {Object} txReceipt - The transaction receipt to get the deposit indices from
 * @param {number|string} chainId - The chainId of the contract
 * @param {string} contractAddress - The contract address
 * @returns {Array} - The deposit indices
 */
export function getDepositIdxs(txReceipt: any, chainId: number | string, contractAddress: string) {
	/* returns an array of deposit indices from a batch transaction receipt */
	const logs = txReceipt.logs
	const depositIdxs = []
	// loop through all the logs and extract the deposit index from each
	for (const log of logs) {
		// check if the log was emitted by our contract
		if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
			if (chainId == 137) {
				depositIdxs.push(log.args[0])
			} else {
				depositIdxs.push(log.args[0])
			}
		}
	}
	return depositIdxs
}
