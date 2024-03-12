import * as peanut from '../../src/index'

describe('getTokenBalance', function () {
	it('get erc20 token balance with type and decimals', async () => {
		const tokenAddress = '0xe9bc9ad74cca887aff32ba09a121b1256fc9f052'
		const walletAddress = '0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918'
		const chainId = '137'
		const tokenType = peanut.interfaces.EPeanutLinkType.erc20
		const tokenDecimals = 18

		const result = await peanut.getTokenBalance({ tokenAddress, walletAddress, chainId, tokenType, tokenDecimals })

		expect(Number(result)).toBeGreaterThan(0)
	}, 1000000000)

	it('get erc20 token balance with type', async () => {
		const tokenAddress = '0xe9bc9ad74cca887aff32ba09a121b1256fc9f052'
		const walletAddress = '0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918'
		const chainId = '137'
		const tokenType = peanut.interfaces.EPeanutLinkType.erc20

		const result = await peanut.getTokenBalance({ tokenAddress, walletAddress, chainId, tokenType })

		expect(Number(result)).toBeGreaterThan(0)
	}, 1000000000)

	it('get erc20 token balance with decimals', async () => {
		const tokenAddress = '0xe9bc9ad74cca887aff32ba09a121b1256fc9f052'
		const walletAddress = '0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918'
		const chainId = '137'
		const tokenDecimals = 18
		const result = await peanut.getTokenBalance({ tokenAddress, walletAddress, chainId, tokenDecimals })

		expect(Number(result)).toBeGreaterThan(0)
	}, 1000000000)

	it('get erc20 token balance without type and decimals', async () => {
		const tokenAddress = '0xe9bc9ad74cca887aff32ba09a121b1256fc9f052'
		const walletAddress = '0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918'
		const chainId = '137'

		const result = await peanut.getTokenBalance({ tokenAddress, walletAddress, chainId })

		expect(Number(result)).toBeGreaterThan(0)
	}, 1000000000)

	it('get native token balance without type and decimals', async () => {
		const tokenAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
		const walletAddress = '0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918'
		const chainId = '137'

		const result = await peanut.getTokenBalance({ tokenAddress, walletAddress, chainId })

		expect(Number(result)).toBeGreaterThan(0)
	}, 1000000000)

	it('get native token balance without type and decimals', async () => {
		const tokenAddress = '0x0000000000000000000000000000000000000000'
		const walletAddress = '0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918'
		const chainId = '137'

		const result = await peanut.getTokenBalance({ tokenAddress, walletAddress, chainId })

		expect(Number(result)).toBeGreaterThan(0)
	}, 1000000000)
})
