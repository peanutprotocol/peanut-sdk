// import peanut from '@squirrel-labs/peanut-sdk'; // v6
// import peanut from '@squirrel-labs/peanut-sdk'; // v5
// import { ethers } from 'ethersv6'; // v6
import peanut from '../index' // import directly from source code
import { ethers } from 'ethersv5' // v5
// import dotenv from 'dotenv'
// import { expect } from '@jest/globals'
// dotenv.config()

describe('createLinks tests', function () {
	const CHAIN_ID = 5 // 80001 for mumbai, 5 for goerli
	const TOKEN_AMOUNT = 0.0002
	const TOKEN_TYPE = 0
	const TOKEN_ADDRESS = ethers.constants.AddressZero
	const TOKEN_DECIMALS = 18
	const NUM_LINKS = 1
	const PEANUT_DEV_API_KEY = process.env.PEANUT_DEV_API_KEY
	// const RPC_URL = peanut.CHAIN_DETAILS[String(CHAIN_ID)].rpc[0].replace('${INFURA_API_KEY}', process.env.INFURA_API_KEY)
	const RPC_URL = process.env.INFURA_GOERLI_RPC
	const CHAIN_NAME = peanut.CHAIN_DETAILS[String(CHAIN_ID)].name
	const WALLET = new ethers.Wallet(
		process.env.TEST_WALLET_PRIVATE_KEY,
		new ethers.providers.JsonRpcBatchProvider(RPC_URL)
	)
	console.log('Chain Name: ', CHAIN_NAME, 'Chain ID: ', CHAIN_ID)
	console.log('RPC_URL: ', RPC_URL)

	it('1', async function () {
		const { links, txReceipt } = await peanut.createLinks({
			signer: WALLET,
			chainId: CHAIN_ID,
			tokenAmount: TOKEN_AMOUNT,
			numberOfLinks: NUM_LINKS,
			tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
			tokenAddress: TOKEN_ADDRESS,
			tokenDecimals: TOKEN_DECIMALS,
			verbose: true,
			mock: true,
		})
	})
	it('variable token Amounts', async function () {
		const CHAIN_ID = 137 // 80001 for mumbai, 5 for goerli
		const TOKEN_TYPE = 0
		const TOKEN_ADDRESS = ethers.constants.AddressZero
		const TOKEN_DECIMALS = 18
		const NUM_LINKS = 1

		const TOKEN_AMOUNTS = [
			0.0001,
			0.00000000000012115152,
			0.0000000000000000051215215216162,
			125125125152.1255555555555555555555513653636361317171771127,
			'12312.5125151262363473473473473474358458542412432324343223432234324324',
			'1',
			'0.00000001',
			'0.1241241241251251255125215125125',
			0.30000030000030004,
			'0.30000030000030004',
			0.5381416891191338,
			'0.5381416891191338',
		]

		for (let i = 0; i < TOKEN_AMOUNTS.length; i++) {
			const TOKEN_AMOUNT = TOKEN_AMOUNTS[i]

			const { links, txReceipt } = await peanut.createLinks({
				signer: WALLET,
				chainId: CHAIN_ID,
				tokenAmount: TOKEN_AMOUNT,
				numberOfLinks: NUM_LINKS,
				tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
				tokenAddress: TOKEN_ADDRESS,
				tokenDecimals: TOKEN_DECIMALS,
				verbose: true,
				mock: true,
			})

			// wait 1 second
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
	}, 120000)
	it('variable token Amounts 2', async function () {
		const CHAIN_ID = 137 // 80001 for mumbai, 5 for goerli
		const TOKEN_TYPE = 0
		const TOKEN_ADDRESS = ethers.constants.AddressZero
		const TOKEN_DECIMALS = 18
		const NUM_LINKS = 5

		const TOKEN_AMOUNTS = ['-1', -1, '-0.00000001', '-0.1241241241251251255125215125125', '0.00000', 0]

		for (let i = 0; i < TOKEN_AMOUNTS.length; i++) {
			const TOKEN_AMOUNT = TOKEN_AMOUNTS[i]
			await expect(
				peanut.createLinks({
					signer: WALLET,
					chainId: CHAIN_ID,
					tokenAmount: TOKEN_AMOUNT,
					numberOfLinks: NUM_LINKS,
					tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
					tokenAddress: TOKEN_ADDRESS,
					tokenDecimals: TOKEN_DECIMALS,
					verbose: true,
					mock: true,
				})
			).rejects.toThrow() // Expected to throw an error due to negative amounts
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
	}, 60000)
	it('one live test', async function () {
		const CHAIN_ID = 5 // 80001 for mumbai, 5 for goerli
		const TOKEN_AMOUNT = 0.0001
		const TOKEN_TYPE = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
		const TOKEN_ADDRESS = ethers.constants.AddressZero
		const TOKEN_DECIMALS = 18
		const NUM_LINKS = 2

		// Create links for live testing
		const { links, txReceipt } = await peanut.createLinks({
			signer: WALLET,
			chainId: CHAIN_ID,
			tokenAmount: TOKEN_AMOUNT,
			numberOfLinks: NUM_LINKS,
			tokenType: TOKEN_TYPE,
			tokenAddress: TOKEN_ADDRESS,
			tokenDecimals: TOKEN_DECIMALS,
			verbose: true,
		})

		console.log('links: ', links)
		expect(links).toBeDefined() // Basic checks to ensure the result has data
		expect(txReceipt).toBeDefined()
		expect(txReceipt.status).toBe(1) // Expecting transaction to be successful

		// Additional assertions as needed
	}, 60000)
})
