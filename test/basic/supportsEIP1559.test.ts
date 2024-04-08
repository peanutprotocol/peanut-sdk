import { ethers } from 'ethersv5' // v5

import { peanut } from '../../src/index'
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('supportsEIP1559', function () {
	it('should return true for a provider that supports EIP-1559', async () => {
		// Use a provider that supports EIP-1559
		const provider = await peanut.getDefaultProvider('1') // ethereum
		const result = await peanut.supportsEIP1559(provider)
		expect(result).toBe(true)
	})

	it('should return true for a provider that does support EIP-1559', async () => {
		// Use a provider that does support EIP-1559 (bnb)
		const provider = await peanut.getDefaultProvider('56')
		const result = await peanut.supportsEIP1559(provider)
		expect(result).toBe(true)
	})

	it('should return false for a provider that does not support EIP-1559', async () => {
		// Use a provider that does not support EIP-1559 (mantle) EDIT: mantle now supports it. Lmao
		// we'd need to use smth like ethereum classic (chainId 61)
		const provider = new ethers.providers.JsonRpcProvider('https://besu-oc.etc-network.info	')
		const result = await peanut.supportsEIP1559(provider)
		expect(result).toBe(false)
	})

	it('should throw an error for an invalid provider', async () => {
		// Use an invalid provider
		const provider = {} as ethers.providers.Provider
		await expect(peanut.supportsEIP1559(provider)).rejects.toThrow()
	})
})
