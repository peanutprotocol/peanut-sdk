import peanut from '../../src/index'
import { ethers } from 'ethersv5'
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY
const INFURA_API_KEY = process.env.INFURA_API_KEY

describe('getLinkDetails', function () {
	describe('v3', function () {
		it('USDC on polygon link should have 1 usdc inside', async function () {
			/** simple usdc test */
			const link = 'https://peanut.to/claim?c=137&v=v3&i=1479&p=NMuAQpGTV7KvtGQD'
			const polygonProviderUrl = 'https://polygon-mainnet.infura.io/v3/' + INFURA_API_KEY
			console.log('url', polygonProviderUrl)
			const polygonProvider = new ethers.providers.JsonRpcProvider(polygonProviderUrl)
			const defaultProvider = await peanut.getDefaultProvider('137')
			const polygonWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', polygonProvider)
			// test default provider by getting blocknumber and wallet balance
			const blockNumber = await defaultProvider.getBlockNumber()
			console.log(blockNumber)
			const walletBalance = await defaultProvider.getBalance(polygonWallet.address)
			console.log(walletBalance)
			// should have 1 usdc inside
			const linkDetails = await peanut.getLinkDetails({
				link, // this works
				// link // this doesn't work
			})
			// expect that tokenDecimals is 6
			expect(linkDetails.tokenDecimals).toBe(6)
			console.log(linkDetails)
		}, 1000000)

		it('provider instead of signer should work', async function () {
			/** simple usdc test */
			const link = 'https://peanut.to/claim?c=137&v=v3&i=1479&p=NMuAQpGTV7KvtGQD'
			// const polygonProviderUrl = 'https://polygon-mainnet.infura.io/v3/' + INFURA_API_KEY
			// const polygonProvider = new ethers.providers.JsonRpcProvider(polygonProviderUrl)
			// should have 1 usdc inside
			const linkDetails = await peanut.getLinkDetails({ link })
			expect(linkDetails.tokenDecimals).toBe(6)
			console.log(linkDetails)
		}, 1000000)

		it('should have 1 goerli eth inside', async function () {
			// const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', goerliProvider)
			const link = 'https://peanut.to/claim?c=5&v=v3&i=314&p=FjEditsxpzOx6IrI'
			// should have 1 goerli eth inside
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			// linkdetails.tokenAmount should be 1
			expect(linkDetails.tokenAmount).toBe('1.0')
		}, 1000000)
		// it('Eco optimism link should have 0.1 eco inside', async function () {
		// 	/** Should fail, no eco on optimism yet */
		// 	// edit: works with fallback now!
		// 	expect.assertions(1) // Expecting one assertion to be called
		// 	const link = 'https://peanut.to/claim?c=10&v=v3&i=307&p=1VNvLYMOG14xr0fO'
		// 	// const optimismProviderUrl = 'https://optimism-mainnet.infura.io/v3/' + INFURA_API_KEY
		// 	// const optimismProvider = new ethers.providers.JsonRpcProvider(optimismProviderUrl)
		// 	// const optimismWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', optimismProvider)
		// 	await expect(peanut.getLinkDetails({ link })).rejects.toThrow()
		// })
		it('Localhost should work', async function () {
			const link = 'http://localhost:3000/claim#?c=5&v=v3&i=415&p=pCEABanDLd9kReTW&t=sdk'
			// const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', goerliProvider)
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			// should not be empty
			expect(linkDetails).not.toBe(undefined)
		}, 1000000)
	})

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
			const link = 'https://peanut.to/claim#?c=137&v=v4&i=297&p=zoOnfUtvnMX1xt8A&t=smoldapp'
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			expect(linkDetails.password).toBe('zoOnfUtvnMX1xt8A')
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

	describe('v5', function () {
		it('v5 should include timestamp', async function () {
			const link = 'https://experimental.peanut.to/claim#?c=42161&v=v5&i=0&p=05tREXnil9vLNFts&t=ui'
			// const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', goerliProvider)
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			// should not be empty
			expect(linkDetails).not.toBe(undefined)
			expect(linkDetails.depositDate).not.toBe(undefined)
			console.log(linkDetails.depositDate)
		}, 1000000)

		it('timestamp should not be null if link already claimed', async function () {
			const link = 'https://experimental.peanut.to/claim#?c=8453&v=v5&i=1&p=2GNyhpaYDHCOiNwL&t=ui'
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
		}, 1000000)
	})

	// TODO: test with unsupported erc20

	// TODO: test with unsupported chain
})

describe('getLinkDetails for NFT', function () {
	it('should work for NFT', async function () {
		const link = 'https://peanut.to/claim#?c=5&v=v4&i=1271&p=6ZPOKZdIZzGItRq4&t=sdk'
		const linkDetails = await peanut.getLinkDetails({ link })

		console.log(linkDetails)

		// Add your expectations here
		expect(linkDetails).not.toBe(undefined)
		expect(linkDetails.link).toBe(link)
		expect(linkDetails.chainId).toBe(5)
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
		expect(linkDetails.metadata.token).toBe('26770')
		expect(linkDetails.metadata.image).not.toBe(undefined)
		expect(linkDetails.metadata.attributes[0].trait_type).toBe('Type')
		expect(linkDetails.metadata.attributes[0].value).toBe('crimson')
	}, 10000)
})

describe('getLinkDetails for Polygon Mumbai', function () {
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
			expect(linkDetails.chainId).toBe(80001)
			// Add more expectations based on your requirements
		}
	}, 20000)
})
