import peanut from '../../src/index'
import { ethers } from 'ethersv5'
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('getLinkDetails', function () {
	describe('v4', function () {
		it('v4 should include timestamp', async function () {
			const link = 'https://peanut.to/claim#?c=137&v=v4&i=297&p=zoOnfUtvnMX1xt8A&t=ui'
			// const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', goerliProvider)
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			// should not be empty
			expect(linkDetails).not.toBe(undefined)
			expect(linkDetails.depositDate).not.toBe(undefined)
			console.log(linkDetails.depositDate)
		}, 1000000)

		it('v4 with different trackId (p in trackId) should have password', async function () {
			const link = 'https://smold.app/peanut/claim?c=137&v=v4.2&i=237&t=smoldapp#p=wkCqiUWH07D4VGbk'
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			expect(linkDetails.password).toBe('wkCqiUWH07D4VGbk')
		}, 1000000)

		it('should include senderAddress', async function () {
			const link = 'https://peanut.to/claim#?c=137&v=v4&i=297&p=zoOnfUtvnMX1xt8A&t=ui'
			// const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', goerliProvider)
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			// should not be empty
			expect(linkDetails).not.toBe(undefined)
			expect(linkDetails.senderAddress).toBe('0x9647BB6a598c2675310c512e0566B60a5aEE6261')
			console.log(linkDetails.senderAddress)
		}, 1000000)

		it('timestamp should be null if link already claimed', async function () {
			const link = 'https://peanut.to/claim#?c=42161&v=v4&i=21&p=BJkAqGmZNYCZFBEH&t=sdk'
			// const CHAIN_ID = 42161
			// const RPC_URL = peanut.CHAIN_DETAILS[String(CHAIN_ID)].rpc[0].replace(
			// 	'${INFURA_API_KEY}',
			// 	process.env.INFURA_API_KEY
			// )
			// const CHAIN_NAME = peanut.CHAIN_DETAILS[String(CHAIN_ID)].name
			// const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
			// const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)

			// should not be empty
			expect(linkDetails).not.toBe(undefined)
			// should have null depositDate
			expect(linkDetails.depositDate).toBe(null)
		}, 1000000)
	})

	// TODO: test with unsupported erc20

	// TODO: test with unsupported chain
})

describe.skip('getLinkDetails for NFT', function () {
	it('should work for NFT', async function () {
		const link = 'https://peanut.to/claim#?c=5&v=v4&i=1271&p=6ZPOKZdIZzGItRq4&t=sdk'
		const linkDetails = await peanut.getLinkDetails({ link })

		console.log(linkDetails)

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
	}, 100000)
}) // TODO: add nft test
