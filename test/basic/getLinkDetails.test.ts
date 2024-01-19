import peanut from '../../src/index'
import { expect, it, describe } from '@jest/globals'

describe('getLinkDetails', function () {
	describe('v4', function () {
		it('should return all link details', async function () {
			const link = 'https://peanut.to/claim#?c=137&v=v4&i=297&p=zoOnfUtvnMX1xt8A&t=ui'
			const linkDetails = await peanut.getLinkDetails({ link })

			expect(linkDetails).toStrictEqual({
				link: 'https://peanut.to/claim#?c=137&v=v4&i=297&p=zoOnfUtvnMX1xt8A&t=ui',
				chainId: '137',
				depositIndex: 297,
				contractVersion: 'v4',
				password: 'zoOnfUtvnMX1xt8A',
				senderAddress: '0x9647BB6a598c2675310c512e0566B60a5aEE6261',
				tokenType: 0,
				tokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
				tokenDecimals: 18,
				tokenSymbol: 'MATIC',
				tokenName: 'MATIC',
				tokenAmount: '0.18955082141848462',
				tokenId: 0,
				claimed: false,
				depositDate: new Date('2023-10-17T11:19:44.000Z'),
				tokenURI: null,
				metadata: null,
				rawOnchainDepositInfo: {
					pubKey20: '0xb3CB36BBAd9fCa7575eeEEF123377Aa2522aDAa6',
					amount: '189550821418484620',
					tokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
					contractType: '0',
					tokenId: '0',
					senderAddress: '0x9647BB6a598c2675310c512e0566B60a5aEE6261',
					timestamp: '1697541584',
				},
			})
		})
		it('v4 should include timestamp', async function () {
			const link = 'https://peanut.to/claim#?c=137&v=v4&i=297&p=zoOnfUtvnMX1xt8A&t=ui'
			const linkDetails = await peanut.getLinkDetails({ link })

			// should not be empty
			expect(linkDetails).not.toBe(undefined)
			expect(linkDetails.depositDate).not.toBe(undefined)
		}, 1000000)

		it('v4 with different trackId and baseUrl', async function () {
			const link = 'https://smold.app/peanut/claim?c=137&v=v4.2&i=237&t=smoldapp#p=wkCqiUWH07D4VGbk'
			const linkDetails = await peanut.getLinkDetails({ link })

			expect(linkDetails).toStrictEqual({
				link: 'https://smold.app/peanut/claim?c=137&v=v4.2&i=237&t=smoldapp#p=wkCqiUWH07D4VGbk',
				chainId: '137',
				depositIndex: 237,
				contractVersion: 'v4.2',
				password: 'wkCqiUWH07D4VGbk',
				senderAddress: '0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918',
				tokenType: 0,
				tokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
				tokenDecimals: 18,
				tokenSymbol: 'MATIC',
				tokenName: 'MATIC',
				tokenAmount: '0.001',
				tokenId: 0,
				claimed: false,
				depositDate: new Date('2024-01-16T13:48:40.000Z'),
				tokenURI: null,
				metadata: null,
				rawOnchainDepositInfo: {
					pubKey20: '0xC1095Ff64C71d292464Db9711ab80eEa129A71cd',
					amount: '1000000000000000',
					tokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
					contractType: '0',
					claimed: 'false',
					timestamp: '1705412920',
					tokenId: '0',
					senderAddress: '0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918',
				},
			})
		}, 1000000)

		it('should include senderAddress', async function () {
			const link = 'https://peanut.to/claim#?c=137&v=v4&i=297&p=zoOnfUtvnMX1xt8A&t=ui'
			const linkDetails = await peanut.getLinkDetails({ link })
			expect(linkDetails).not.toBe(undefined)
			expect(linkDetails.senderAddress).toBe('0x9647BB6a598c2675310c512e0566B60a5aEE6261')
			console.log(linkDetails.senderAddress)
		}, 1000000)

		it('timestamp should be null if link already claimed', async function () {
			const link = 'https://peanut.to/claim#?c=42161&v=v4&i=21&p=BJkAqGmZNYCZFBEH&t=sdk'
			const linkDetails = await peanut.getLinkDetails({ link })

			// should not be empty
			expect(linkDetails).not.toBe(undefined)
			expect(linkDetails.depositDate).toBe(null)
		}, 1000000)
	})

	it('should work for Polygon Mumbai', async function () {
		const links = [
			'https://peanut.to/claim#?c=80001&v=v4&i=2&p=MepA9d6moFYDn0F2&t=sdk',
			'https://peanut.to/claim#?c=80001&v=v4&i=0&p=8uJZLLhlTBicKhEY&t=sdk',
		]

		for (const link of links) {
			const linkDetails = await peanut.getLinkDetails({ link })

			console.log(linkDetails)

			// Add your expectations here
			expect(linkDetails).not.toBe(undefined)
			expect(linkDetails.link).toBe(link)
			expect(linkDetails.chainId).toBe('80001')
			// Add more expectations based on your requirements
		}
	}, 20000)
})

describe('getLinkDetails for NFT', function () {
	it('should work for NFT', async function () {
		const link = 'https://peanut.to/claim#?c=5&v=v4&i=1271&p=6ZPOKZdIZzGItRq4&t=sdk'
		const linkDetails = await peanut.getLinkDetails({ link })

		// Add your expectations here
		expect(linkDetails).not.toBe(undefined)
		expect(linkDetails.link).toBe(link)
		expect(linkDetails.chainId).toBe('5')
		expect(linkDetails.depositIndex).toBe(1271)
		expect(linkDetails.contractVersion).toBe('v4')
		expect(linkDetails.password).toBe('6ZPOKZdIZzGItRq4')
		expect(linkDetails.tokenType).toBe(2)
		expect(linkDetails.tokenAddress).toBe('0x932Ca55B9Ef0b3094E8Fa82435b3b4c50d713043')
		expect(linkDetails.tokenSymbol).toBe('G_NFTS')
		expect(linkDetails.tokenName).toBe('Goerli_NFTS')
		expect(linkDetails.tokenAmount).toBe('1')
		expect(linkDetails.claimed).toBe(false)
		expect(linkDetails.tokenURI).not.toBe(undefined)
		expect(linkDetails.metadata).not.toBe(undefined)
		//@ts-ignore
		expect(linkDetails.metadata.token).toBe('26770')
		//@ts-ignore
		expect(linkDetails.metadata.image).not.toBe(undefined)
		//@ts-ignore
		expect(linkDetails.metadata.attributes[0].trait_type).toBe('Type')
		//@ts-ignore
		expect(linkDetails.metadata.attributes[0].value).toBe('crimson')
	}, 10000)
})
