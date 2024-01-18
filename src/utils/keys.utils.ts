import * as ethers from 'ethersv5'

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
