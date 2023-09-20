import { ethers } from 'ethersv5' // v5
import { CHAIN_MAP, PEANUT_CONTRACTS, VERBOSE } from './data.ts'

import crypto from 'crypto'

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
 */
export function hash_string(str: string) {
	//@HUGO: I've added in a .toString() here, but I'm not sure if it's good
	let hash = ethers.utils.toUtf8Bytes(str).toString() // v5
	hash = ethers.utils.hexlify(hash) // v5
	hash = ethers.utils.hexZeroPad(hash, 32) // v5
	hash = ethers.utils.keccak256(hash) // v5
	return hash
}

/**
 * Signs a message with a private key and returns the signature
 * THIS SHOULD BE AN UNHASHED, UNPREFIXED MESSAGE
 */
export async function signMessageWithPrivatekey(message: string, privateKey: string) {
	const signer = new ethers.Wallet(privateKey)
	return signer.signMessage(message) // this calls ethers.hashMessage and prefixes the hash
}

/**
 * Verifies a signature with a public key and returns true if valid
 */
export function verifySignature(message: string, signature: string, address: string) {
	const messageSigner = ethers.utils.verifyMessage(message, signature) // v5
	return messageSigner == address
}

/**
 * Adds the EIP191 prefix to a message and hashes it same as solidity
 */
export function solidityHashBytesEIP191(bytes: any) {
	return ethers.utils.hashMessage(bytes) // v5
}

/**
 * Hashes an address to a 32 byte hex string
 */
export function solidityHashAddress(address: string) {
	return ethers.utils.solidityKeccak256(['address'], [address]) // v5
}

/**
 * Hashes a plain address, adds an Ethereum message prefix, hashes it again and then signs it
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
 */
export function getRandomString(n: number = 18): string {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	const charsetLength = charset.length
	const maxByteValue = 256 // Each byte has 256 possible values
	const maxUnbiasedByte = maxByteValue - (maxByteValue % charsetLength)

	// need to avoid bias: https://gist.github.com/joepie91/7105003c3b26e65efcea63f3db82dfba#so-how-do-i-obtain-random-values-securely
	// h/t to Nanak Nihal from Holonym

	let randomString = ''
	while (randomString.length < n) {
		const randomBytes = crypto.randomBytes(n - randomString.length)
		for (const byte of randomBytes) {
			if (byte < maxUnbiasedByte) {
				const randomIndex = byte % charsetLength
				randomString += charset.charAt(randomIndex)
			}
		}
	}

	return randomString
}

/**
 * Returns the parameters from the current page url
 */
export function getParamsFromPageURL() {
	/* returns the parameters from the current page url */
	const params = new URLSearchParams(window.location.search)
	let chainId = params.get('c') // can be chain name or chain id
	chainId = CHAIN_MAP[String(chainId) as keyof typeof CHAIN_MAP].toString()
	const contractVersion = params.get('v')
	let depositIdx = params.get('i') ?? ''
	depositIdx = parseInt(depositIdx).toString()
	const password = params.get('p')

	return { chainId, contractVersion, depositIdx, password }
}

/**
 * Returns the parameters from a link
 */
export function getParamsFromLink(link: string): {
	chainId: number
	contractVersion: string
	depositIdx: number
	password: string
	trackId: string
} {
	/* returns the parameters from a link */
	const url = new URL(link)
	let search = url.search

	// If there is no search params, try to get params after hash
	if (search === '') {
		search = url.hash.startsWith('#?') ? url.hash.substring(1) : ''
	}

	const params = new URLSearchParams(search)

	const _chainId: string | number = params.get('c') ?? '' // can be chain name or chain id
	let chainId: number = 0
	// if can be casted to int, then it's a chain id
	if (parseInt(_chainId)) {
		chainId = parseInt(_chainId)
	} else {
		// otherwise it's a chain name
		chainId = CHAIN_MAP[String(_chainId) as keyof typeof CHAIN_MAP]
	}

	const contractVersion = params.get('v') ?? ''
	let depositIdx: string | number = params.get('i') ?? ''
	depositIdx = parseInt(depositIdx)
	const password = params.get('p') ?? ''
	let trackId = '' // optional
	if (params.get('t')) {
		trackId = params.get('t') ?? ''
	}

	return { chainId, contractVersion, depositIdx, password, trackId }
}

/**
 * Returns a link from the given parameters
 */
export function getLinkFromParams(
	chainId: number | string,
	contractVersion: string,
	depositIdx: number,
	password: string,
	baseUrl: string = 'https://peanut.to/claim',
	trackId: string = ''
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
 */
export function getDepositIdx(txReceipt: any, chainId: number | string, contractVersion: string) {
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
			//@HUGO: I've removed the parseInt here since it's already a bigInt
			depositIdx = BigInt(depositIdxHex)
		}
	} else if (contractVersion === 'v4') {
		// In v5, the index is now an indexed topic rather than part of the log data
		try {
			// Based on the etherscan example, the index is now the 1st topic.
			//@HUGO: I've removed the parseInt here since it's already a bigInt
			depositIdx = BigInt(`0x${logs[logIndex].topics[1].slice(2)}`)
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
 */
export function getDepositIdxs(txReceipt: any, chainId: number | string, contractVersion: string): number[] {
	const verbose = VERBOSE
	const logs = txReceipt.logs
	const depositIdxs = []

	// events
	// event DepositEvent(
	//     uint256 indexed _index, uint8 indexed _contractType, uint256 _amount, address indexed _senderAddress
	// );
	// const logTopic = ethers.utils.id('Deposit(uint256,address,uint64,uint8,uint64,uint256)') // Update with correct event signature
	const logTopic = ethers.utils.id('DepositEvent(uint256,uint8,uint256,address)') // Update with correct event signature

	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const contractAddress = _PEANUT_CONTRACTS[chainId][contractVersion]
	verbose && console.log(contractAddress, contractVersion, chainId)

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
