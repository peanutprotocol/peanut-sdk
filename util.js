import { ethers } from 'ethersv5' // v5
import { CHAIN_MAP, PEANUT_CONTRACTS } from './data.js'

export function assert(condition, message) {
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
export function generateKeysFromString(string) {
	var privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(string)) // v5
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
export function hash_string(str) {
	let hash = ethers.utils.toUtf8Bytes(str) // v5
	hash = ethers.utils.hexlify(hash) // v5
	hash = ethers.utils.hexZeroPad(hash, 32) // v5
	hash = ethers.utils.keccak256(hash) // v5
	return hash
}

/**
 * Signs a message with a private key and returns the signature
 * THIS SHOULD BE AN UNHASHED, UNPREFIXED MESSAGE
 *
 * @param {string} message - The message to sign
 * @param {string} privateKey - The private key to use for signing
 * @returns {string} - The signature
 */
export async function signMessageWithPrivatekey(message, privateKey) {
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
export function verifySignature(message, signature, address) {
	const messageSigner = ethers.utils.verifyMessage(message, signature) // v5
	return messageSigner == address
}

/**
 * Adds the EIP191 prefix to a message and hashes it same as solidity
 *
 * @param {Uint8Array} bytes - The bytes to prefix and hash
 * @returns {string} - The hashed bytes
 */
export function solidityHashBytesEIP191(bytes) {
	return ethers.utils.hashMessage(bytes) // v5
}

/**
 * Hashes an address to a 32 byte hex string
 *
 * @param {string} address - The address to hash
 * @returns {string} - The hashed address
 */
export function solidityHashAddress(address) {
	return ethers.utils.solidityKeccak256(['address'], [address]) // v5
}

/**
 * Hashes a plain address, adds an Ethereum message prefix, hashes it again and then signs it
 *
 * @param {string} string - The plain address to hash and sign
 * @param {string} privateKey - The private key to use for signing
 * @returns {string} - The signature
 */
export async function signAddress(string, privateKey) {
	const stringHash = ethers.utils.solidityKeccak256(['address'], [string]) // v5
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
export function getRandomString(length) {
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
	var chainId = params.get('c') // can be chain name or chain id
	chainId = CHAIN_MAP[String(chainId)]
	const contractVersion = params.get('v')
	var depositIdx = params.get('i')
	depositIdx = parseInt(depositIdx)
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
export function getParamsFromLink(link) {
	/* returns the parameters from a link */
	const url = new URL(link)
	let search = url.search

	// If there is no search params, try to get params after hash
	if (search === '') {
		search = url.hash.startsWith('#?') ? url.hash.substring(1) : ''
	}

	const params = new URLSearchParams(search)

	var chainId = params.get('c') // can be chain name or chain id
	// if can be casted to int, then it's a chain id
	if (parseInt(chainId)) {
		chainId = parseInt(chainId)
	} else {
		// otherwise it's a chain name
		chainId = CHAIN_MAP[String(chainId)]
	}

	const contractVersion = params.get('v')
	var depositIdx = params.get('i')
	depositIdx = parseInt(depositIdx)
	const password = params.get('p')
	let trackId = '' // optional
	if (params.get('t')) {
		trackId = params.get('t')
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
	chainId,
	contractVersion,
	depositIdx,
	password,
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
export function getDepositIdx(txReceipt, chainId, contractVersion) {
	/* returns the deposit index from a tx receipt */
	const logs = txReceipt.logs
	let depositIdx
	let logIndex

	// Identify the logIndex based on chainId
	if (chainId === 137 || chainId === 80001) {
		logIndex = logs.length - 2
	} else {
		logIndex = logs.length - 1
	}

	// Handle the deposit index extraction based on contract version
	if (contractVersion === 'v3') {
		try {
			depositIdx = logs[logIndex].args[0]
		} catch (error) {
			// get uint256 from data (first 32 bytes)
			const data = logs[logIndex].data
			const depositIdxHex = data.slice(0, 66)
			depositIdx = parseInt(BigInt(depositIdxHex))
		}
	} else if (contractVersion === 'v4') {
		// In v5, the index is now an indexed topic rather than part of the log data
		try {
			// Based on the etherscan example, the index is now the 1st topic.
			depositIdx = parseInt(BigInt(`0x${logs[logIndex].topics[1].slice(2)}`))
		} catch (error) {
			console.error('Error parsing deposit index from v5 logs:', error)
		}
	} else {
		console.error('Unsupported contract version:', contractVersion)
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
export function getDepositIdxs(txReceipt, chainId, contractVersion) {
	const logs = txReceipt.logs
	const depositIdxs = []

	// events
	// event DepositEvent(
	//     uint256 indexed _index, uint8 indexed _contractType, uint256 _amount, address indexed _senderAddress
	// );
	// const logTopic = ethers.utils.id('Deposit(uint256,address,uint64,uint8,uint64,uint256)') // Update with correct event signature
	const logTopic = ethers.utils.id('DepositEvent(uint256,uint8,uint256,address)') // Update with correct event signature

	const contractAddress = PEANUT_CONTRACTS[chainId][contractVersion]
	console.log('contractAddress: ', contractAddress)

	for (let i = 0; i < logs.length; i++) {
		if (logs[i].address.toLowerCase() === contractAddress.toLowerCase() && logs[i].topics[0] === logTopic) {
			const depositIdx = ethers.BigNumber.from(logs[i].topics[1]).toNumber()
			depositIdxs.push(depositIdx)
		}
	}

	return depositIdxs
}
// export function getDepositIdxs(txReceipt, chainId, contractAddress) {
/* returns an array of deposit indices from a batch transaction receipt */
// const logs = txReceipt.logs
// var depositIdxs = []
// // loop through all the logs and extract the deposit index from each
// for (var i = 0; i < logs.length; i++) {
// 	// check if the log was emitted by our contract
// 	if (logs[i].address.toLowerCase() === contractAddress.toLowerCase()) {
// 		if (chainId == 137) {
// 			depositIdxs.push(logs[i].args[0])
// 		} else {
// 			depositIdxs.push(logs[i].args[0])
// 		}
// 	}
// }
// return depositIdxs
// OLD CODE. Get inspiration from new getDepositIdx function, or merge them together potentially
// }
