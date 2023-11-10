import { ethers } from 'ethersv5'

const messagePrefix = '\x19Ethereum Signed Message:\n'

function hashMessage(message: ethers.utils.Bytes | string): string {
	if (typeof message === 'string') {
		message = ethers.utils.toUtf8Bytes(message)
	}
	return ethers.utils.keccak256(
		ethers.utils.concat([
			ethers.utils.toUtf8Bytes(messagePrefix),
			ethers.utils.toUtf8Bytes(String(message.length)),
			message,
		])
	)
}

async function signMessage(message: ethers.utils.Bytes | string, privateKey: string) {
	const wallet = new ethers.Wallet(privateKey)
	const messageHash = hashMessage(message)
	const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash))
	console.log(`${signature} (Created by signMessage with hash)`)
	return signature
}

async function signMessageNoHash(message: ethers.utils.Bytes | string, privateKey: string) {
	const wallet = new ethers.Wallet(privateKey)
	const signature = await wallet.signMessage(message)
	console.log(`${signature} (Created by signMessageNoHash without hash)`)
	return signature
}

async function signMessageWithPersonalSign(message: ethers.utils.Bytes | string, privateKey: string) {
	const wallet = new ethers.Wallet(privateKey)
	const messageHash = hashMessage(message)
	const signature = await wallet._signingKey().signDigest(ethers.utils.arrayify(messageHash))
	console.log(`${signature} (Created by signMessageWithPersonalSign with personal_sign)`)
	return signature
}

async function testSignatures(paramsHash: string, keys: { privateKey: string }) {
	const wallet = new ethers.Wallet(keys.privateKey)
	console.log('wallet address: ', wallet.address)
	console.log('paramsHash: ', paramsHash)
	console.log('privateKey: ', keys.privateKey)
	console.log('\n')

	// try using hashMessage
	const message1 = hashMessage(paramsHash)
	const signature1 = await signMessage(message1, keys.privateKey)
	const signer1 = ethers.utils.verifyMessage(ethers.utils.arrayify(message1), signature1)
	console.log(`Signer1: ${signer1}`)

	// try without arrayify
	const signature2 = await signMessageNoHash(message1, keys.privateKey)
	const signer2 = ethers.utils.verifyMessage(message1, signature2)
	console.log(`Signer2: ${signer2}`)

	// try with arrayify
	const message2 = ethers.utils.arrayify(paramsHash)
	const signature3 = await signMessage(message2, keys.privateKey)
	const signer3 = ethers.utils.verifyMessage(ethers.utils.arrayify(message2), signature3)
	console.log(`Signer3: ${signer3}`)

	// try without arrayify
	const signature4 = await signMessageNoHash(message2, keys.privateKey)
	const signer4 = ethers.utils.verifyMessage(ethers.utils.hexlify(message2), signature4)
	console.log(`Signer4: ${signer4}`)

	// try with personal_sign
	const signature5 = await signMessageWithPersonalSign(paramsHash, keys.privateKey)
	const signer5 = ethers.utils.verifyMessage(paramsHash, signature5)
	console.log(`Signer5: ${signer5}`)
}

// Call the main function
testSignatures(
	// hash that we need to sign and recover in solidity
	// in solidity, we use this code: ECDSA.recover(_hash, signature);
	'0xea57aa36ce131a8f7da5da10e1f26f510ab89ac9ca5105bb1cfdad5443fc5270',

	// private key to sign with ( we need to verify that the signature is correct )
	// has address: 0x4F925dd74125446b786D3D4FA44668627B50FA94
	{
		privateKey: '0xcde8c607167b73c0147be824f67a09d5ba508e52059bceeb98ab703aa003958c',
	}
)
