import { ethers } from 'ethersv5'
import { expect, describe, it, beforeEach } from '@jest/globals'
import chainDetails from '../../src/data/chainDetails.json'
import peanut, { resetProviderCache } from '../../src/index'

beforeEach(() => {
	resetProviderCache()
})

describe('test getDefaultProvider on EVERY chain', function () {
	test.each(Object.keys(chainDetails))(
		'should return a provider for chain %s',
		async function (chainId) {
			// if (chainId !== '100') return
			// else peanut.toggleVerbose(true)
			const provider = await peanut.getDefaultProvider(chainId)
			expect(provider).toBeInstanceOf(ethers.providers.JsonRpcProvider)

			const network = await provider.getNetwork()
			expect(network.chainId).toBe(parseInt(chainId))
		},
		10000
	)
})

describe('getDefaultProvider tests', function () {
	it('should throw an error for an unsupported chainId', async function () {
		const chainId = '99999929' // Unsupported chainId
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

describe('getDefaultProvider caching tests', function () {
	it('should return the same provider for the same chainId', async function () {
		const chainId = '1' // Mainnet

		const provider1 = await peanut.getDefaultProvider(chainId)
		const provider2 = await peanut.getDefaultProvider(chainId)

		// Check that the providers are the same (i.e., the provider was cached)
		expect(provider1).toBe(provider2)
	})

	it('should not return the same provider for different chainIds', async function () {
		const chainId1 = '1' // Mainnet
		const chainId2 = '137' // Polygon

		const provider1 = await peanut.getDefaultProvider(chainId1)
		const provider2 = await peanut.getDefaultProvider(chainId2)

		// Check that the providers are different
		expect(provider1).not.toBe(provider2)
	})
})

describe('getDefaultProvider latency tests', function () {
	it('should measure the latency of getDefaultProvider', async function () {
		const chainId = '1' // Mainnet

		const start = Date.now()
		await peanut.getDefaultProvider(chainId)
		const end = Date.now()

		const latency = end - start
		console.log(`Latency for getDefaultProvider: ${latency} ms`)
	})

	it('should measure the latency of cached getDefaultProvider', async function () {
		const chainId = '1' // Mainnet

		// Call once to cache the provider
		await peanut.getDefaultProvider(chainId)

		const start = Date.now()
		await peanut.getDefaultProvider(chainId)
		const end = Date.now()

		const latency = end - start
		console.log(`Latency for cached getDefaultProvider: ${latency} ms`)
	})
})

describe('getDefaultProvider latency tests', function () {
	it('should measure and compare the latency of getDefaultProvider and cached getDefaultProvider', async function () {
		const chainId = '1' // Mainnet

		// Measure latency of the first call
		const start1 = Date.now()
		await peanut.getDefaultProvider(chainId)
		const end1 = Date.now()

		const latency1 = end1 - start1
		console.log(`Latency for the first getDefaultProvider call: ${latency1} ms`)

		// Measure latency of the second (cached) call
		const start2 = Date.now()
		await peanut.getDefaultProvider(chainId)
		const end2 = Date.now()

		const latency2 = end2 - start2
		console.log(`Latency for the second (cached) getDefaultProvider call: ${latency2} ms`)

		// Check that the second call was faster
		expect(latency2).toBeLessThan(latency1)
	})
})
