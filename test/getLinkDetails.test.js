// import peanut from '@squirrel-labs/peanut-sdk'; // v6
// import peanut from '@squirrel-labs/peanut-sdk'; // v5
// import { ethers } from 'ethersv6'; // v6
import peanut from '../index' // import directly from source code

import { ethers } from 'ethersv5' // v5
import dotenv from 'dotenv'
import { expect } from '@jest/globals'
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
	it('USDC on polygon link should have 1 usdc inside', async function () {
		/** simple usdc test */
		const link = 'https://peanut.to/claim?c=137&v=v3&i=1479&p=NMuAQpGTV7KvtGQD'
		const polygonProviderUrl = 'https://polygon-mainnet.infura.io/v3/' + INFURA_API_KEY
		const polygonProvider = new ethers.providers.JsonRpcProvider(polygonProviderUrl)
		const polygonWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, polygonProvider)
		// should have 1 usdc inside
		const linkDetails = await peanut.getLinkDetails(polygonWallet, link)
		console.log(linkDetails)
	})

	it('provider instead of signer should work', async function () {
		/** simple usdc test */
		const link = 'https://peanut.to/claim?c=137&v=v3&i=1479&p=NMuAQpGTV7KvtGQD'
		const polygonProviderUrl = 'https://polygon-mainnet.infura.io/v3/' + INFURA_API_KEY
		const polygonProvider = new ethers.providers.JsonRpcProvider(polygonProviderUrl)
		// should have 1 usdc inside
		const linkDetails = await peanut.getLinkDetails(polygonProvider, link)
		console.log(linkDetails)
	})

	it('should have 1 goerli eth inside', async function () {
		const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, goerliProvider)
		const link = 'https://peanut.to/claim?c=5&v=v3&i=314&p=FjEditsxpzOx6IrI'
		// should have 1 goerli eth inside
		const linkDetails = await peanut.getLinkDetails(goerliWallet, link)
		console.log(linkDetails)
		// linkdetails.tokenAmount should be 1
		expect(linkDetails.tokenAmount).toBe('1.0')
	})

	it('Eco optimism link should have 0.1 eco inside', async function () {
		/** Should fail, no eco on optimism yet */
		expect.assertions(1) // Expecting one assertion to be called
		const link = 'https://peanut.to/claim?c=10&v=v3&i=307&p=1VNvLYMOG14xr0fO'
		const optimismProviderUrl = 'https://optimism-mainnet.infura.io/v3/' + INFURA_API_KEY
		const optimismProvider = new ethers.providers.JsonRpcProvider(optimismProviderUrl)
		const optimismWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, optimismProvider)
		await expect(peanut.getLinkDetails(optimismWallet, link)).rejects.toThrow()
	})
	it.only('Localhost should work', async function () {
		const link = 'http://localhost:3000/claim#?c=5&v=v3&i=415&p=pCEABanDLd9kReTW&t=sdk'
		const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, goerliProvider)
		const linkDetails = await peanut.getLinkDetails(goerliWallet, link)
		console.log(linkDetails)
		// should not be empty
		expect(linkDetails).not.toBe(undefined)
	})

	// TODO: test link that has already been claimed

	// TODO: test with unsupported erc20

	// TODO: test with unsupported chain
})
