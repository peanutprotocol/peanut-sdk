import { expect, describe, it, beforeEach } from '@jest/globals'
import peanut from '../../src/index' // import directly from source code

describe('getSquidRouterUrl', () => {
	it('should return the correct Squid route URL for mainnet and Peanut API', () => {
		const isMainnet = true
		const usePeanutApi = true
		const expectedUrl = peanut.peanutSquidRouteUrlMainnet

		const result = peanut.getSquidRouterUrl(isMainnet, usePeanutApi)

		expect(result).toBe(expectedUrl)
	})

	it('should return the correct Squid route URL for testnet and Peanut API', () => {
		const isMainnet = false
		const usePeanutApi = true
		const expectedUrl = peanut.peanutSquidRouteUrlTestnet

		const result = peanut.getSquidRouterUrl(isMainnet, usePeanutApi)

		expect(result).toBe(expectedUrl)
	})

	it('should return the correct Squid route URL for mainnet and Squid API', () => {
		const isMainnet = true
		const usePeanutApi = false
		const expectedUrl = `${peanut.squidBaseUrlMainnet}/route`

		const result = peanut.getSquidRouterUrl(isMainnet, usePeanutApi)

		expect(result).toBe(expectedUrl)
	})

	it('should return the correct Squid route URL for mainnet and Peanut API when isMainnet is false', () => {
		const isMainnet = false
		const usePeanutApi = true
		const expectedUrl = peanut.peanutSquidRouteUrlTestnet

		const result = peanut.getSquidRouterUrl(isMainnet, usePeanutApi)

		expect(result).toBe(expectedUrl)
	})

	it('should return the correct Squid route URL for testnet and Peanut API when isMainnet is true', () => {
		const isMainnet = true
		const usePeanutApi = true
		const expectedUrl = peanut.peanutSquidRouteUrlMainnet

		const result = peanut.getSquidRouterUrl(isMainnet, usePeanutApi)

		expect(result).toBe(expectedUrl)
	})

	it('should return the correct Squid route URL for mainnet and Squid API when usePeanutApi is true', () => {
		const isMainnet = true
		const usePeanutApi = false
		const expectedUrl = `${peanut.squidBaseUrlMainnet}/route`

		const result = peanut.getSquidRouterUrl(isMainnet, usePeanutApi)

		expect(result).toBe(expectedUrl)
	})
})
