import * as ethers from 'ethersv5'

import * as consts from '../consts/index.ts'
import * as config from '../config/config.ts'
import * as utils from './index.ts'

/**
 * Generates a deterministic key pair from an arbitrary length string
 *
 * @param {string} string - The string to generate a key pair from
 * @returns {Object} - An object containing the address and privateKey
 */
export function generateKeysFromString(string: string) {
	const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(string))
	const wallet = new ethers.Wallet(privateKey)
	return {
		address: wallet.address,
		privateKey: privateKey,
	}
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
	const messageSigner = ethers.utils.verifyMessage(message, signature)
	return messageSigner == address
}

/**
 * Hashes an address to a 32 byte hex string
 */
export function solidityHashAddress(address: string) {
	return ethers.utils.solidityKeccak256(['address'], [address])
}

/**
 * Hashes a plain address, adds an Ethereum message prefix, hashes it again and then signs it
 */
export async function signAddress(string: string, privateKey: string) {
	const stringHash = ethers.utils.solidityKeccak256(['address'], [string]) // v4
	const stringHashbinary = ethers.utils.arrayify(stringHash) // v4
	const signer = new ethers.Wallet(privateKey)
	const signature = await signer.signMessage(stringHashbinary) // this calls ethers.hashMessage and prefixes the hash
	return signature
}

/**
 * Adds the EIP191 prefix to a message and hashes it same as solidity
 */
export function solidityHashBytesEIP191(bytes: any) {
	return ethers.utils.hashMessage(bytes)
}

/**
 * Hashes & signs a withdrawal message for peanut vault
 * @returns a fully ready list of claim params to be passed to the withdrawal function
 */
export async function signWithdrawalMessage(
	vaultVersion: string,
	chainId: string,
	vaultAddress: string,
	depositIdx: number,
	recipient: string,
	privateKey: string,
	onlyRecipientMode?: boolean // only for v4.2
) {
	let claimParams: any[]
	if (vaultVersion == 'v4.2') {
		const extraData = onlyRecipientMode ? consts.RECIPIENT_WITHDRAWAL_MODE : consts.ANYONE_WITHDRAWAL_MODE
		const stringHash = ethers.utils.solidityKeccak256(
			['bytes32', 'uint256', 'address', 'uint256', 'address', 'bytes32'],
			[consts.PEANUT_SALT, parseInt(chainId), vaultAddress, depositIdx, recipient, extraData]
		)
		const stringHashbinary = ethers.utils.arrayify(stringHash)
		const signer = new ethers.Wallet(privateKey)
		const signature = await signer.signMessage(stringHashbinary) // this calls ethers.hashMessage and prefixes the hash
		claimParams = [depositIdx, recipient, signature]
	} else {
		const addressHash = utils.solidityHashAddress(recipient)
		const addressHashBinary = ethers.utils.arrayify(addressHash)
		config.config.verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
		const addressHashEIP191 = utils.solidityHashBytesEIP191(addressHashBinary)
		const signature = await utils.signAddress(recipient, privateKey) // sign with link keys
		claimParams = [depositIdx, recipient, addressHashEIP191, signature]
	}

	return claimParams
}

/**
 * Signs a hash
 */
export async function signHash(stringHash: string, privateKey: string) {
	const stringHashbinary = ethers.utils.arrayify(stringHash)
	const signer = new ethers.Wallet(privateKey)
	const signature = await signer.signMessage(stringHashbinary) // this calls ethers.hashMessage and prefixes the hash
	return signature
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
