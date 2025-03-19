import { normalizePath, prepareXchainFromAmountCalculation, stringToFixed } from '../../src/util'

const mockFetch = jest.fn()

describe('util', () => {
	describe('normalizePath', () => {
		it.each([
			['https://example.com/', 'https://example.com/'],
			['https://example.com/foo', 'https://example.com/foo'],
			['https://example.com//foo', 'https://example.com/foo'],
			['https://example.com//foo/bar', 'https://example.com/foo/bar'],
			['https://example.com/foo//bar/', 'https://example.com/foo/bar/'],
			['/api/v1/foo//bar/', '/api/v1/foo/bar/'],
			['//api/v1/foo//bar//', '/api/v1/foo/bar/'],
		])('should normalize %s to %s', (url, normalizedUrl) => {
			expect(normalizePath(url)).toBe(normalizedUrl)
		})
	})

	describe.only('prepareXchainFromAmountCalculation', () => {
		beforeEach(() => {
			jest.spyOn(global, 'fetch').mockImplementation(mockFetch)
		})

		afterEach(() => {
			jest.restoreAllMocks()
			jest.clearAllMocks()
		})
		it('should return price with correct decimals', async () => {
			const fromToken = {
				chainId: '534352',
				address: '0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4',
				decimals: 6,
			}
			const toToken = {
				chainId: '8453',
				address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
				decimals: 18,
			}
			const fromTokenPrice = 0.999842
			const toTokenPrice = 2453.66
			const toAmount = '0.00408'
			const expectedFromAmount = '10.042552'
			const slippagePercentage = 0.3

			// Update the mock to return the correct structure that matches the actual API
			mockFetch.mockImplementation((url: string) => {
				const tokenAddress = new URL(url).searchParams.get('tokenAddress')
				let price: number
				if (tokenAddress === fromToken.address) {
					price = fromTokenPrice
				} else if (tokenAddress === toToken.address) {
					price = toTokenPrice
				} else {
					price = 0
				}
				return Promise.resolve({
					json: () =>
						Promise.resolve({
							token: {
								usdPrice: price,
							},
						}),
				})
			})

			const fromAmount = await prepareXchainFromAmountCalculation({
				fromToken,
				toToken,
				toAmount,
				slippagePercentage,
			})

			expect(mockFetch).toHaveBeenCalledTimes(2)
			expect(fromAmount).toBe(expectedFromAmount)
		})
	})

	describe('stringToFixed', () => {
		it.each([
			['0.001', '0.00', 2],
			['0.01', '0.01', 2],
			['0.1', '0.10', 2],
			['1', '1', 2],
			['10.1', '10.10', 2],
			['10.123456', '10.123', 3],
		])('should convert %s to %s with precision %s', (numStr, expected, precision) => {
			expect(stringToFixed(numStr, precision)).toBe(expected)
		})
	})
})
