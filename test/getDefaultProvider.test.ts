import peanut from '../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, describe, it } from '@jest/globals'

describe('getDefaultProvider tests', function () {
	it('should return the default provider for a given chainId', async function () {
		const chainId = '5' // Goerli testnet
		const provider = await peanut.getDefaultProvider(chainId)

		// Check that the provider is an instance of ethers.providers.JsonRpcProvider
		expect(provider).toBeInstanceOf(ethers.providers.JsonRpcProvider)

		// Check that the provider's network matches the expected chainId
		const network = await provider.getNetwork()
		expect(network.chainId).toBe(parseInt(chainId))
	})

	it('should throw an error for an unsupported chainId', async function () {
		const chainId = '9999' // Unsupported chainId
		await expect(peanut.getDefaultProvider(chainId)).rejects.toThrow(`Chain ID ${chainId} not supported yet`)
	})

	it('should return different providers for different chainIds', async function () {
		const chainId1 = '1' // Mainnet
		const chainId2 = '137' // Polygon

		const provider1 = await peanut.getDefaultProvider(chainId1)
		const provider2 = await peanut.getDefaultProvider(chainId2)

		// Check that the providers are different
		expect(provider1).not.toBe(provider2)

		// Check that the providers' networks match the expected chainIds
		const network1 = await provider1.getNetwork()
		const network2 = await provider2.getNetwork()
		expect(network1.chainId).toBe(parseInt(chainId1))
		expect(network2.chainId).toBe(parseInt(chainId2))
	})
})
