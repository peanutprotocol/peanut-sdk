// import peanut from '@squirrel-labs/peanut-sdk'; // v6
// import peanut from '@squirrel-labs/peanut-sdk'; // v5
import peanut from '../index'; // import directly from source code
// import { ethers } from 'ethersv6'; // v6
import { ethers } from 'ethersv5'; // v5
import dotenv from 'dotenv';
dotenv.config();

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;
const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY);

describe('Unit tests', function () {
	// test wallet from private key should have address 0x6B3751c5b04Aa818EA90115AA06a4D9A36A16f02
	describe('test wallet from private key', function () {
		it('should have address 0x6B3751c5b04Aa818EA90115AA06a4D9A36A16f02', function () {
			const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;
			const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY);
			expect(wallet.address).toBe('0x6B3751c5b04Aa818EA90115AA06a4D9A36A16f02');
		});
	});

	describe('generateKeysFromString function', () => {
		it('should generate deterministic keys', () => {
			const keys1 = peanut.generateKeysFromString('test');
			const keys2 = peanut.generateKeysFromString('test');

			// Check that the address and private key are the same for the same input
			expect(keys1.address).toBe(keys2.address);
			expect(keys1.privateKey).toBe(keys2.privateKey);
		});

		it('should generate different keys for different inputs', () => {
			const keys1 = peanut.generateKeysFromString('test');
			const keys2 = peanut.generateKeysFromString('different-test');

			// Check that the address or private key are not the same for different inputs
			expect(keys1.address).not.toBe(keys2.address);
			expect(keys1.privateKey).not.toBe(keys2.privateKey);
		});
	});

	// signMessageWithPrivatekey should produce the same signature for the same message and private key
	describe('signMessageWithPrivatekey()', function () {
		it('should produce the same signature for the same message and private key', async function () {
			const message = 'test';
			const signature1 = await peanut.signMessageWithPrivatekey(message, TEST_WALLET_PRIVATE_KEY);
			const signature2 = await peanut.signMessageWithPrivatekey(message, TEST_WALLET_PRIVATE_KEY);
			expect(signature1).toBe(signature2);

			// assert that the signature is valid
			const validSignature1 = peanut.verifySignature(message, signature1, wallet.address);
			expect(validSignature1).toBe(true);

			// generate some new keys from random string
			const keys1 = peanut.generateKeysFromString(peanut.getRandomString(16));

			// sign a message with the private key
			const randomMessage = peanut.getRandomString(16);
			const signature3 = await peanut.signMessageWithPrivatekey(randomMessage, keys1.privateKey);
			const signature4 = await peanut.signMessageWithPrivatekey(randomMessage, keys1.privateKey);

			// assert that the signatures are the same
			expect(signature3).toBe(signature4);

			// assert that the signatures are valid
			const validSignature3 = peanut.verifySignature(randomMessage, signature3, keys1.address);
			expect(validSignature3).toBe(true);
		});

		it('should produce a different signature for a different message and the same private key', async function () {
			const message1 = 'test';
			const message2 = 'test2';
			const signature1 = await peanut.signMessageWithPrivatekey(message1, TEST_WALLET_PRIVATE_KEY);
			const signature2 = await peanut.signMessageWithPrivatekey(message2, TEST_WALLET_PRIVATE_KEY);
			expect(signature1).not.toBe(signature2);
		});
	});

	describe('Link Tests', function () {
		describe('getParamsFromLink()', function () {
			it('should return the correct params from a link', function () {
				let link = 'https://peanut.to/claim?c=5&v=v3&i=52&p=super_secret_password';
				let params = peanut.getParamsFromLink(link);
				// assert.equal(params.chainId, 5);
				// assert.equal(params.contractVersion, "v3");
				// assert.equal(params.depositIdx, 52);
				// assert.equal(params.password, "super_secret_password");
				// assert.equal(params.trackId, "");
				// move to expect
				expect(params.chainId).toBe(5);
				expect(params.contractVersion).toBe('v3');
				expect(params.depositIdx).toBe(52);
				expect(params.password).toBe('super_secret_password');
				expect(params.trackId).toBe('');
			});
			it('should return the correct params from a link with a trackId', function () {
				let link = 'https://peanut.to/claim?c=5&v=v3&i=52&p=super_secret_password&t=123456789';
				let params = peanut.getParamsFromLink(link);
				expect(params.chainId).toBe(5);
				expect(params.contractVersion).toBe('v3');
				expect(params.depositIdx).toBe(52);
				expect(params.password).toBe('super_secret_password');
				expect(params.trackId).toBe('123456789');
			});
		});
	});
});
