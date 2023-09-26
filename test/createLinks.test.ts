import peanut from '../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('createLinks tests', function () {
	const CHAIN_ID = 5 // 80001 for mumbai, 5 for goerli
	// const TOKEN_AMOUNT = 0.0002
	// const TOKEN_TYPE = 0
	// const TOKEN_ADDRESS = ethers.constants.AddressZero
	// const TOKEN_DECIMALS = 18
	// const NUM_LINKS = 1
	// const PEANUT_DEV_API_KEY = process.env.PEANUT_DEV_API_KEY
	// const RPC_URL = peanut.CHAIN_DETAILS[String(CHAIN_ID)].rpc[0].replace('${INFURA_API_KEY}', process.env.INFURA_API_KEY)
	const RPC_URL = process.env.INFURA_GOERLI_RPC
	const CHAIN_NAME = peanut.CHAIN_DETAILS[String(CHAIN_ID)].name
	const WALLET = new ethers.Wallet(
		process.env.TEST_WALLET_PRIVATE_KEY ?? '',
		new ethers.providers.JsonRpcBatchProvider(RPC_URL)
	)
	console.log('Chain Name: ', CHAIN_NAME, 'Chain ID: ', CHAIN_ID)
	console.log('RPC_URL: ', RPC_URL)

	// reimplement if mock works or  limit to prepareTxs
	// it('1', async function () {
	// 	const { createdLinks, success } = await peanut.createLinks({
	// 		structSigner: {
	// 			signer: WALLET,
	// 		},
	// 		linkDetails: {
	// 			chainId: CHAIN_ID,
	// 			tokenAmount: TOKEN_AMOUNT,
	// 			tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	// 			tokenAddress: TOKEN_ADDRESS,
	// 			tokenDecimals: TOKEN_DECIMALS,
	// 		}
	// 	})
	// })
	// it('variable token Amounts', async function () {
	// 	const CHAIN_ID = 137 // 80001 for mumbai, 5 for goerli
	// 	const TOKEN_TYPE = 0
	// 	const TOKEN_ADDRESS = ethers.constants.AddressZero
	// 	const TOKEN_DECIMALS = 18
	// 	const NUM_LINKS = 1

	// 	const TOKEN_AMOUNTS = [
	// 		0.0001,
	// 		0.00000000000012115152,
	// 		0.0000000000000000051215215216162,
	// 		125125125152.1255555555555555555555513653636361317171771127,
	// 		'12312.5125151262363473473473473474358458542412432324343223432234324324',
	// 		'1',
	// 		'0.00000001',
	// 		'0.1241241241251251255125215125125',
	// 		0.30000030000030004,
	// 		'0.30000030000030004',
	// 		0.5381416891191338,
	// 		'0.5381416891191338',
	// 	]

	// 	for (let i = 0; i < TOKEN_AMOUNTS.length; i++) {
	// 		const TOKEN_AMOUNT = TOKEN_AMOUNTS[i]

	// 		const { links, txReceipt } = await peanut.createLinks({
	// 			signer: WALLET,
	// 			chainId: CHAIN_ID,
	// 			tokenAmount: TOKEN_AMOUNT,
	// 			numberOfLinks: NUM_LINKS,
	// 			tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	// 			tokenAddress: TOKEN_ADDRESS,
	// 			tokenDecimals: TOKEN_DECIMALS,
	// 			verbose: true,
	// 			mock: true,
	// 		})

	// 		// wait 1 second
	// 		await new Promise((resolve) => setTimeout(resolve, 1000))
	// 	}
	// }, 120000)
	// it('variable token Amounts 2', async function () {
	// 	const CHAIN_ID = 137 // 80001 for mumbai, 5 for goerli
	// 	const TOKEN_TYPE = 0
	// 	const TOKEN_ADDRESS = ethers.constants.AddressZero
	// 	const TOKEN_DECIMALS = 18
	// 	const NUM_LINKS = 5

	// 	const TOKEN_AMOUNTS = ['-1', -1, '-0.00000001', '-0.1241241241251251255125215125125', '0.00000', 0]

	// 	for (let i = 0; i < TOKEN_AMOUNTS.length; i++) {
	// 		const TOKEN_AMOUNT = TOKEN_AMOUNTS[i]
	// 		await expect(
	// 			peanut.createLinks({
	// 				signer: WALLET,
	// 				chainId: CHAIN_ID,
	// 				tokenAmount: TOKEN_AMOUNT,
	// 				numberOfLinks: NUM_LINKS,
	// 				tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	// 				tokenAddress: TOKEN_ADDRESS,
	// 				tokenDecimals: TOKEN_DECIMALS,
	// 				verbose: true,
	// 				mock: true,
	// 			})
	// 		).rejects.toThrow() // Expected to throw an error due to negative amounts
	// 		await new Promise((resolve) => setTimeout(resolve, 1000))
	// 	}
	// }, 60000)
	it('one live test', async function () {
		const CHAIN_ID = 5 // 80001 for mumbai, 5 for goerli
		const TOKEN_AMOUNT = 0.0001
		const TOKEN_TYPE = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
		const TOKEN_ADDRESS = ethers.constants.AddressZero
		const TOKEN_DECIMALS = 18
		const NUM_LINKS = 2

		// Create links for live testing
		const { createdLinks, status } = await peanut.createLinks({
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
		expect(status).toBeDefined()
		expect(status.code).toBe('SUCCESS') // Expecting transaction to be successful

		// Additional assertions as needed
	}, 60000)
	it.only('30 goerli links', async function () {
		const CHAIN_ID = 5 // 80001 for mumbai, 5 for goerli
		const TOKEN_AMOUNT = 0.0001
		const TOKEN_TYPE = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
		const TOKEN_ADDRESS = ethers.constants.AddressZero
		const TOKEN_DECIMALS = 18
		const NUM_LINKS = 30

		// Create links for live testing
		const { createdLinks, status } = await peanut.createLinks({
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
		console.log(status)
		console.log('links: ', createdLinks)

		// print all createdLinks.link sequentially
		for (let i = 0; i < createdLinks.length; i++) {
			console.log('link: ', createdLinks[i].link)
		}
	}, 60000)
})
