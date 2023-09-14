import peanut from '../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY
const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm'
const OPTIMISM_GOERLI_RPC_URL = 'https://rpc.goerli.optimism.gateway.fm'
const INFURA_API_KEY = process.env.INFURA_API_KEY
// const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL); // v6
const goerliProvider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL) // v5
const optimismGoerliProvider = new ethers.providers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL) // v5
// const optimismGoerliProvider = new ethers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v6

describe('getLinkDetails', function () {
	describe('v3', function () {
		it('USDC on polygon link should have 1 usdc inside', async function () {
			/** simple usdc test */
			const link = 'https://peanut.to/claim?c=137&v=v3&i=1479&p=NMuAQpGTV7KvtGQD'
			const polygonProviderUrl = 'https://polygon-mainnet.infura.io/v3/' + INFURA_API_KEY
			console.log('url', polygonProviderUrl)
			const polygonProvider = new ethers.providers.JsonRpcProvider(polygonProviderUrl)
			const defaultProvider = await peanut.getDefaultProvider('137', true)
			const polygonWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, polygonProvider)
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
			console.log(linkDetails)
		}, 1000000)

		it('provider instead of signer should work', async function () {
			/** simple usdc test */
			const link = 'https://peanut.to/claim?c=137&v=v3&i=1479&p=NMuAQpGTV7KvtGQD'
			const polygonProviderUrl = 'https://polygon-mainnet.infura.io/v3/' + INFURA_API_KEY
			const polygonProvider = new ethers.providers.JsonRpcProvider(polygonProviderUrl)
			// should have 1 usdc inside
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
		}, 1000000)

		it('should have 1 goerli eth inside', async function () {
			const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, goerliProvider)
			const link = 'https://peanut.to/claim?c=5&v=v3&i=314&p=FjEditsxpzOx6IrI'
			// should have 1 goerli eth inside
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			// linkdetails.tokenAmount should be 1
			expect(linkDetails.tokenAmount).toBe('1.0')
		}, 1000000)

		it('Eco optimism link should have 0.1 eco inside', async function () {
			/** Should fail, no eco on optimism yet */
			expect.assertions(1) // Expecting one assertion to be called
			const link = 'https://peanut.to/claim?c=10&v=v3&i=307&p=1VNvLYMOG14xr0fO'
			const optimismProviderUrl = 'https://optimism-mainnet.infura.io/v3/' + INFURA_API_KEY
			const optimismProvider = new ethers.providers.JsonRpcProvider(optimismProviderUrl)
			const optimismWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, optimismProvider)
			await expect(peanut.getLinkDetails({ link })).rejects.toThrow()
		})
		it('Localhost should work', async function () {
			const link = 'http://localhost:3000/claim#?c=5&v=v3&i=415&p=pCEABanDLd9kReTW&t=sdk'
			const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, goerliProvider)
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			// should not be empty
			expect(linkDetails).not.toBe(undefined)
		}, 1000000)
	})

	describe('v4', function () {
		it('v4 should include timestamp', async function () {
			const link = 'https://peanut.to/claim#?c=5&v=v4&i=7&p=j6mafJ95hFuzAAX5&t=sdk'
			const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, goerliProvider)
			const linkDetails = await peanut.getLinkDetails({ link })
			console.log(linkDetails)
			// should not be empty
			expect(linkDetails).not.toBe(undefined)
			expect(linkDetails.depositDate).not.toBe(undefined)
			console.log(linkDetails.depositDate)
		}, 1000000)

		it('timestamp should be null if link already claimed', async function () {
			const link = 'https://peanut.to/claim#?c=42161&v=v4&i=21&p=BJkAqGmZNYCZFBEH&t=sdk'
			const CHAIN_ID = 42161
			const RPC_URL = peanut.CHAIN_DETAILS[String(CHAIN_ID)].rpc[0].replace(
				'${INFURA_API_KEY}',
				process.env.INFURA_API_KEY
			)
			const CHAIN_NAME = peanut.CHAIN_DETAILS[String(CHAIN_ID)].name
			const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
			const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, provider)
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
