import peanut from '../../src/index' // import directly from source code
import { expect, it, describe } from '@jest/globals'

describe('generateKeysFromString function', () => {
	it('should generate deterministic keys', () => {
		const keys1 = peanut.generateKeysFromString('test')
		const keys2 = peanut.generateKeysFromString('test')

		// Check that the address and private key are the same for the same input
		expect(keys1.address).toBe(keys2.address)
		expect(keys1.privateKey).toBe(keys2.privateKey)
	})

	it('should generate different keys for different inputs', () => {
		const keys1 = peanut.generateKeysFromString('test')
		const keys2 = peanut.generateKeysFromString('different-test')

		// Check that the address or private key are not the same for different inputs
		expect(keys1.address).not.toBe(keys2.address)
		expect(keys1.privateKey).not.toBe(keys2.privateKey)
	})
})
