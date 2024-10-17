import { createRequestLink, getRequestLinkDetails, submitRequestLinkFulfillment } from '../../src/request'

const mockFetch = jest.fn()

beforeEach(() => {
	jest.spyOn(global, 'fetch').mockImplementation(mockFetch)
})

afterEach(() => {
	jest.restoreAllMocks()
	jest.clearAllMocks()
})

describe('Request', () => {
	describe('createRequestLink', () => {
		it('should complete apiUrl if not provided', async () => {
			mockFetch.mockResolvedValueOnce({
				json: jest.fn().mockResolvedValueOnce({
					link: 'https://peanut.to/request/pay?id=123456789',
				}),
				status: 200,
			})

			await createRequestLink({
				chainId: '137',
				tokenAddress: '0x0000000000000000000000000000000000000000',
				tokenAmount: '0.1',
				tokenType: 0,
				tokenDecimals: '18',
				recipientAddress: '0x0000000000000000000000000000000000000000',
			})

			expect(mockFetch).toHaveBeenCalledWith('https://api.peanut.to/request-links', expect.anything())
		})
	})

	describe('getRequestLinkDetails', () => {
		it('should complete apiUrl if not provided', async () => {
			const linkUuid = 'ee3b904d-9809-4b97-b82b-34de1d1a7314'
			mockFetch.mockResolvedValueOnce({
				json: jest.fn().mockResolvedValueOnce({
					uuid: linkUuid,
					link: `https://peanut.to/request/pay?id=${linkUuid}`,
					chainId: '137',
					recipientAddress: '0x0000000000000000000000000000000000000000',
					tokenAmount: '0.1',
					tokenAddress: '0x0000000000000000000000000000000000000000',
					tokenDecimals: 18,
					tokenType: 0,
					createdAt: '2023-05-24T15:00:00.000Z',
					updatedAt: '2023-05-24T15:00:00.000Z',
					status: 'pending',
				}),
				status: 200,
			})

			await getRequestLinkDetails({
				link: `https://peanut.to/request/pay?id=${linkUuid}`,
			})

			expect(mockFetch).toHaveBeenCalledWith(`https://api.peanut.to/request-links/${linkUuid}`, expect.anything())
		})
	})

	describe('submitRequestLinkFulfillment', () => {
		it('should complete apiUrl if not provided', async () => {
			const linkUuid = 'ee3b904d-9809-4b97-b82b-34de1d1a7314'
			mockFetch.mockResolvedValueOnce({
				json: jest.fn().mockResolvedValueOnce({
					success: true,
				}),
				status: 200,
			})

			await submitRequestLinkFulfillment({
				chainId: '137',
				hash: '0x0000000000000000000000000000000000000000',
				payerAddress: '0x0000000000000000000000000000000000000000',
				signedTx: '0x0000000000000000000000000000000000000000',
				link: `https://peanut.to/request/pay?id=${linkUuid}`,
				amountUsd: '0.1',
			})

			expect(mockFetch).toHaveBeenCalledWith(`https://api.peanut.to/request-links/${linkUuid}`, expect.anything())
		})
	})
})
