import { ContractReceipt, Event, ethers } from 'ethersv5'
import {
	CHAIN_DETAILS,
	CHAIN_MAP,
	ChainDetailKey,
	ChainMapKey,
	PEANUT_CONTRACTS,
	chainDetailKeys,
	chainMapKeys,
} from '.'
import {
	LinkParams
} from './utils'

export function assert(condition: boolean, message: string) {
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
 * @param {string} str - The input to generate a key pair from
 * @returns {Object} - An object containing the address and privateKey
 */
export function generateKeysFromString(str: string) {
	var privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(str)) // v5
	var wallet = new ethers.Wallet(privateKey)
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
	let hash = ethers.utils.toUtf8Bytes(str) // v5
	let hashString = ethers.utils.hexlify(hash) // v5
	hashString = ethers.utils.hexZeroPad(hashString, 32) // v5
	hashString = ethers.utils.keccak256(hashString) // v5
	return hashString
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
	var signer = new ethers.Wallet(privateKey)
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
 * @param {string} str - The plain address to hash and sign
 * @param {string} privateKey - The private key to use for signing
 * @returns {string} - The signature
 */
export async function signAddress(str: string, privateKey: string) {
	const stringHash = ethers.utils.solidityKeccak256(['address'], [str]) // v5
	const stringHashbinary = ethers.utils.arrayify(stringHash) // v5
	var signer = new ethers.Wallet(privateKey)
	var signature = await signer.signMessage(stringHashbinary) // this calls ethers.hashMessage and prefixes the hash
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
export function getParamsFromPageURL(): LinkParams {
	/* returns the parameters from the current page url */
	return getParamsFromLink(window.location.search)
}

/**
 * Returns the parameters from a link
 *
 * @param {string} link - The link to get the parameters from
 *
 * @returns {Object} - The parameters from the link
 */
export function getParamsFromLink(link: string): LinkParams {
	/* returns the parameters from a link */
	const url = new URL(link)
	let search = url.search

	// If there is no search params, try to get params after hash
	if (search === '') {
		search = url.hash.startsWith('#?') ? url.hash.substring(1) : ''
	}

	const params = new URLSearchParams(search)

	const chainIdParam = params.get('c') // can be chain name or chain id
	if (!chainIdParam) {
		throw new Error("chainId missing in url")
	}
	const chainId = chainMapKeys.includes(chainIdParam ?? "") ? CHAIN_MAP[chainIdParam as ChainMapKey] : parseInt(chainIdParam)

	const contractVersion = params.get('v')
	const depositIdxParam = params.get('i')
	if (!depositIdxParam) {
		throw new Error("depositIdx missing in url")
	}
	const depositIdx = parseInt(depositIdxParam!)
	const password = params.get('p')
	let trackId = '' // optional
	if (params.get('t')) {
		trackId = params.get('t')!
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
	chainId: string | number,
	contractVersion: string,
	depositIdx: number,
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
export function getDepositIdx(txReceipt: ContractReceipt, chainId: string | number) {
	/* returns the deposit index from a tx receipt */
	const logs = txReceipt.logs
	// const chainId = txReceipt.chainId;
	var depositIdx: number
	var logIndex
	if (chainId == 137 || chainId == 80001) {
		// why do you have to be this way?
		logIndex = logs.length - 2
	} else {
		logIndex = logs.length - 1 // last log is the deposit event
	}
	// only works if EventLog. If Log, then need to look at data, and first uint256 is depositIdx.
	if ((logs[logIndex] as Event).args?.length) {
		depositIdx = (logs[logIndex] as Event).args![0]
	} else {
		// get uint256 from data (first 32 bytes)
		const data = logs[logIndex].data
		const depositIdxHex = data.slice(0, 66)
		depositIdx = parseInt(BigInt(depositIdxHex).toString()) // should this be int or bigint? decide wen TS.
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
export function getDepositIdxs(txReceipt: ContractReceipt, chainId: number | string, contractAddress: string) {
	/* returns an array of deposit indices from a batch transaction receipt */
	const logs = txReceipt.logs
	var depositIdxs: number[] = []
	// loop through all the logs and extract the deposit index from each
	for (var i = 0; i < logs.length; i++) {
		if (!(logs[i] as Event).args?.length) {
			continue
		}
		const eventLog = logs[i] as Event
		// check if the log was emitted by our contract
		if (eventLog.address.toLowerCase() === contractAddress.toLowerCase() && eventLog.args?.[0]) {
			if (chainId == 137) {
				depositIdxs.push(eventLog.args![0])
			} else {
				depositIdxs.push(eventLog.args![0])
			}
		}
	}
	return depositIdxs
}

export function getChainDetailsRpc(chainId: string) {
	if (chainDetailKeys.includes(chainId)) {
		return CHAIN_DETAILS[chainId as ChainDetailKey]?.rpc || []
	}
	return []
}

export function getPeanutContractAdress(chainId: string, version: string) {
	//TODO: refactor contracts.json to have a standard interface per chain so it can be typed
	return (PEANUT_CONTRACTS as any)[chainId]?.[version]?.address as string || ""
}