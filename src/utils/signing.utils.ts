import * as ethers from 'ethersv5'

import * as consts from '../consts/index.ts'
import * as config from '../config/config.ts'
import * as utils from './index.ts'

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
			[consts.PEANUT_SALT, chainId, vaultAddress, depositIdx, recipient, extraData]
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
