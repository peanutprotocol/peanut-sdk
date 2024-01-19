import peanut from '../../src/index' // import directly from source code
import { expect, it, describe } from '@jest/globals'
import { ethers } from 'ethersv5' // v5
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY ?? ''
const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '' ?? '')

describe('should sign a message with the privatekey', function () {
	it('should produce the same signature for the same message and private key', async function () {
		const message = 'test'
		const signature1 = await peanut.signMessageWithPrivatekey(message, TEST_WALLET_PRIVATE_KEY ?? '' ?? '')
		const signature2 = await peanut.signMessageWithPrivatekey(message, TEST_WALLET_PRIVATE_KEY ?? '' ?? '')
		expect(signature1).toBe(signature2)

		// assert that the signature is valid
		const validSignature1 = peanut.verifySignature(message, signature1, wallet.address)
		expect(validSignature1).toBe(true)

		// generate some new keys from random string
		const keys1 = peanut.generateKeysFromString(await peanut.getRandomString(16))

		// sign a message with the private key
		const randomMessage = await peanut.getRandomString(16)
		const signature3 = await peanut.signMessageWithPrivatekey(randomMessage, keys1.privateKey)
		const signature4 = await peanut.signMessageWithPrivatekey(randomMessage, keys1.privateKey)

		// assert that the signatures are the same
		expect(signature3).toBe(signature4)

		// assert that the signatures are valid
		const validSignature3 = peanut.verifySignature(randomMessage, signature3, keys1.address)
		expect(validSignature3).toBe(true)
	})

	it('should produce a different signature for a different message and the same private key', async function () {
		const message1 = 'test'
		const message2 = 'test2'
		const signature1 = await peanut.signMessageWithPrivatekey(message1, TEST_WALLET_PRIVATE_KEY ?? '')
		const signature2 = await peanut.signMessageWithPrivatekey(message2, TEST_WALLET_PRIVATE_KEY ?? '')
		expect(signature1).not.toBe(signature2)
	})
})
