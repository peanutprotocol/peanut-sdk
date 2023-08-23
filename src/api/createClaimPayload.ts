import { ethers } from 'ethersv5'
import {
	generateKeysFromString,
	getParamsFromLink,
	signAddress,
	solidityHashAddress,
	solidityHashBytesEIP191,
} from '../common/index'

export async function createClaimPayload(link: string, recipientAddress: string) {
	/* internal utility function to create the payload for claiming a link */
	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const password = params.password
	if (!password) {
		throw new Error("createClaimPayload no password provided")
	}
	const keys = generateKeysFromString(password) // deterministically generate keys from password

	// cryptography
	var addressHash = solidityHashAddress(recipientAddress)
	// var addressHashBinary = ethers.getBytes(addressHash); // v6
	var addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	var signature = await signAddress(recipientAddress, keys.privateKey) // sign with link keys

	return {
		recipientAddress: recipientAddress,
		addressHash: addressHashEIP191,
		signature: signature,
		idx: params.depositIdx,
		chainId: params.chainId,
		contractVersion: params.contractVersion,
	}
}
