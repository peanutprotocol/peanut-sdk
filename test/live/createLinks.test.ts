import peanut from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('goerli createLinks tests', function () {
	const RPC_URL = process.env.INFURA_GOERLI_RPC
	const WALLET = new ethers.Wallet(
		process.env.TEST_WALLET_PRIVATE_KEY ?? '',
		new ethers.providers.JsonRpcBatchProvider(RPC_URL)
	)
	it('2 goerli links (LIVE)', async function () {
		const CHAIN_ID = '5' // 80001 for mumbai, 5 for goerli
		const TOKEN_AMOUNT = 0.0001
		const TOKEN_TYPE = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
		const TOKEN_ADDRESS = ethers.constants.AddressZero
		const TOKEN_DECIMALS = 18
		const NUM_LINKS = 2

		// Create links for live testing
		const createdLinks = await peanut.createLinks({
			structSigner: {
				signer: WALLET,
			},
			linkDetails: {
				chainId: CHAIN_ID,
				tokenAmount: TOKEN_AMOUNT,
				tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
				tokenAddress: TOKEN_ADDRESS,
				tokenDecimals: TOKEN_DECIMALS,
			},
			numberOfLinks: NUM_LINKS,
		})
		console.log('links: ', createdLinks)

		// print all createdLinks.link sequentially
		for (let i = 0; i < createdLinks.length; i++) {
			console.log('link: ', createdLinks[i].link)
		}
	}, 60000)
})

describe('createLinks tests', function () {
	it('live test on mumbai', async function () {
		const provider = await peanut.getDefaultProvider('80001')
		const WALLET = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY ?? '', provider)
		const CHAIN_ID = '80001' // 80001 for mumbai
		const TOKEN_AMOUNT = 0.0001
		const TOKEN_TYPE = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
		const TOKEN_ADDRESS = ethers.constants.AddressZero
		const TOKEN_DECIMALS = 18
		const NUM_LINKS = 2

		// Create links for live testing
		peanut.toggleVerbose(true)
		const createdLinks = await peanut.createLinks({
			structSigner: {
				signer: WALLET,
			},
			linkDetails: {
				chainId: CHAIN_ID,
				tokenAmount: TOKEN_AMOUNT,
				tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
				tokenAddress: TOKEN_ADDRESS,
				tokenDecimals: TOKEN_DECIMALS,
			},
			numberOfLinks: NUM_LINKS,
		})

		console.log('links: ', createdLinks)
		expect(createdLinks).toBeDefined() // Basic checks to ensure the result has data

		// Additional assertions as needed
	}, 60000)
})
