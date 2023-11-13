import { getSquidChains, getSquidTokens } from '../../src/index'
import { expect, it, describe } from '@jest/globals'

describe('getSquidChains tests', function () {
	it('should get chains from Squid API', async function () {
		const chains = await getSquidChains({ isTestnet: true })
		console.log('chains: ' + JSON.stringify(chains))
		expect(chains).toBeDefined()
		expect(Array.isArray(chains)).toBe(true)
		expect(chains.length).toBeGreaterThan(0)
	}, 10000) // Increase timeout as we're making actual HTTP requests
})

describe('getSquidTokens tests', function () {
	it('should get tokens from Squid API', async function () {
		const tokens = await getSquidTokens({ isTestnet: true })
		console.log('tokens: ' + JSON.stringify(tokens))
		expect(tokens).toBeDefined()
		expect(Array.isArray(tokens)).toBe(true)
		expect(tokens.length).toBeGreaterThan(0)
	}, 10000) // Increase timeout as we're making actual HTTP requests
})
