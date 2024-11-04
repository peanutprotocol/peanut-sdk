import { normalizePath, prepareXchainFromAmountCalculation } from '../../src/util'

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

	describe('prepareXchainFromAmountCalculation', () => {
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
					json: () => Promise.resolve({ price }),
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
})
