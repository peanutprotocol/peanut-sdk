import { ethers } from 'ethersv5'
import { expect, it, describe, jest } from '@jest/globals'
import peanut from '../src/index'

describe('createClaimXChainPayload tests', function () {
	it('should create a cross-chain payload', async function () {
		const isTestnet = true
		const link = 'https://peanut.to/claim#?c=5&v=v5&i=10&p=msCPhhYRImNbTZC7&t=ui'
		const recipient = '0x6B3751c5b04Aa818EA90115AA06a4D9A36A16f02'
		const destinationChainId = '420'
		const destinationToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
		const maxSlippage = 10 // 10%

		// Mock the getLinkDetails function to return a predefined result
		// const mockGetLinkDetails = jest.spyOn(peanut, 'getLinkDetails')
		// mockGetLinkDetails.mockResolvedValue({
		// 	link: 'test-link',
		// 	chainId: 5,
		// 	depositIndex: 1,
		// 	contractVersion: 'v5',
		// 	password: 'test-password',
		// 	tokenType: 0,
		// 	tokenAddress: '0xToken',
		// 	tokenDecimals: 18,
		// 	tokenSymbol: 'TEST',
		// 	tokenName: 'Test Token',
		// 	tokenAmount: '1',
		// 	tokenId: 1,
		// 	claimed: false,
		// 	depositDate: new Date(),
		// 	tokenURI: 'https://test.com',
		// 	metadata: null,
		// })

		// Mock the getSquidRoute function to return a predefined result
		// const mockGetSquidRoute = jest.spyOn(peanut, 'getSquidRoute')
		// mockGetSquidRoute.mockResolvedValue({
		// 	params: { chainId: '5', contractVersion: 'v5' },
		// 	estimate: '1',
		// 	transactionRequest: { to: '0xRecipient', value: ethers.utils.parseEther('1') },
		// })

		peanut.toggleVerbose(true)
		const payload = await peanut.createClaimXChainPayload(
			isTestnet,
			link,
			recipient,
			destinationChainId,
			destinationToken,
			maxSlippage
		)
		console.log(payload)

		expect(payload).toBeDefined()
		expect(payload.recipientAddress).toBe(recipient)
		expect(payload.tokenAmount).toBe(ethers.utils.parseEther('1').toString())
		expect(payload.chainId).toBe(destinationChainId)
		expect(payload.contractVersion).toBe('v5')
		peanut.toggleVerbose(false)

		// Clean up the mocks
		// mockGetLinkDetails.mockRestore()
		// mockGetSquidRoute.mockRestore()
	})
})
