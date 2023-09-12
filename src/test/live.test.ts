// // import peanut from '@squirrel-labs/peanut-sdk'; // v6
// import peanut from '@squirrel-labs/peanut-sdk'; // v5
import peanut from '../index' // import directly from source code
import { ethers } from 'ethersv5'
import { expect, describe, it } from '@jest/globals'
import * as interfaces from '../consts/interfaces.consts'
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY ?? ''

async function createAndClaimLink(options: interfaces.ICreateLinkParams, inbetweenDelay = 1000) {
	const response = await peanut.createLink(options)
	if (response.createdLink.link && response.success.success) {
		await waitForTransaction(options.structSigner.signer.provider, response.createdLink.txHash)
	}
	console.log('Link created: ' + response.createdLink.link)
	await new Promise((res) => setTimeout(res, inbetweenDelay)) // Wait for 1 second before claiming
	return peanut.claimLink({
		signer: options.structSigner.signer,
		link: response.createdLink.link[0],
		verbose: true,
	})
}

async function waitForTransaction(provider, txHash, timeout = 60000) {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		const receipt = await provider.getTransactionReceipt(txHash) // v5/v6?
		if (receipt && receipt.blockNumber) {
			return receipt
		}
		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before retrying
	}

	throw new Error('Transaction was not confirmed within the timeout period.')
}

describe('optimism goerli', function () {
	const OPTIMISM_GOERLI_RPC_URL = 'https://rpc.goerli.optimism.gateway.fm'

	// const optimismGoerliProvider = new ethers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v6
	const optimismGoerliProvider = new ethers.providers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL) // v5
	const optimismGoerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', optimismGoerliProvider)

	it.only('should create a native link and claim it', async function () {
		await createAndClaimLink(
			{
				structSigner: {
					signer: optimismGoerliWallet,
				},
				linkDetails: {
					chainId: 420,
					tokenAmount: 0.00001,
					tokenType: 0,
				},
			},
			9000
		)
		// Add assertion here
	}, 60000)
	// it('should create an erc20 link and claim it', async function () {
	// 	// TODO. Do nothing for now
	// }, 60000)
})

describe('polygon', function () {
	const POLYGON_RPC_URL = 'https://polygon-mainnet.infura.io/v3/' + process.env.INFURA_API_KEY
	const polygonProvider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL)
	const polygonWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', polygonProvider)
	const chainId = 137
	const tokenAmount = 0.0001

	console.log('getting fee data in test file')
	console.log(POLYGON_RPC_URL)

	it('should create a native link and claim it', async function () {
		console.log('hello')

		await createAndClaimLink(
			{
				structSigner: {
					signer: polygonWallet,
				},
				linkDetails: {
					chainId: chainId,
					tokenAmount: tokenAmount,
					tokenType: 0,
				},
			},
			9000
		)
	}, 60000)
	it('polygon should create an erc20 link and claim it', async function () {
		const tokenAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' // polygon usdc
		const tokenDecimals = 6

		// create link

		await createAndClaimLink(
			{
				structSigner: {
					signer: polygonWallet,
				},
				linkDetails: {
					chainId: chainId,
					tokenAmount: tokenAmount,
					tokenDecimals: tokenDecimals,
					tokenAddress: tokenAddress,
					tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
				},
			},
			9000
		)
	}, 180000)
})

describe('goerli', function () {
	const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm'
	// // const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL); // v6
	const goerliProvider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL) // v5
	const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', goerliProvider)
	const chainId = 5
	const tokenAmount = 0.0001

	it('should create a native link and claim it', async function () {
		await createAndClaimLink(
			{
				structSigner: {
					signer: goerliWallet,
				},
				linkDetails: {
					chainId: chainId,
					tokenAmount: tokenAmount,

					tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
				},
			},
			9000
		)
	}, 60000)
	it('should create an erc20 link and claim it', async function () {
		const tokenAddress = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB' // goerli LINK
		const tokenDecimals = 18

		// create link
		await createAndClaimLink(
			{
				structSigner: {
					signer: goerliWallet,
				},
				linkDetails: {
					chainId: chainId,
					tokenAmount: tokenAmount,

					tokenDecimals: tokenDecimals,
					tokenAddress: tokenAddress,
					tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
				},
			},
			9000
		)
	}, 180000)
	it('should fail when no tokenAddress', async function () {
		try {
			await createAndClaimLink(
				{
					structSigner: {
						signer: goerliWallet,
					},
					linkDetails: {
						chainId: chainId,
						tokenAmount: tokenAmount,
						tokenDecimals: 18,
						tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
					},
				},
				9000
			)
			throw new Error('Test should have thrown an error but did not.')
		} catch (e) {
			expect(e.message).toContain('tokenAddress must be provided for non-native tokens') // Replace with expected error message
		}
	}, 60000)
	it('API gasless claim test', async function () {
		// create link
		const response = await peanut.createLink({
			structSigner: {
				signer: goerliWallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenType: 0,
			},
		})

		// wait for 7 seconds
		await new Promise((res) => setTimeout(res, 7000))

		// claim link using api
		const receiverAddress = goerliWallet.address
		const apiToken = process.env.PEANUT_DEV_API_KEY ?? ''
		// const res = await peanut.claimLinkGasless(link, receiverAddress, apiToken, true, 'http://127.0.0.1:5001/claim')
		const res = await peanut.claimLinkGasless({
			link: response.createdLink.link[0],
			recipientAddress: receiverAddress,
			APIKey: apiToken,
		})

		console.log(res)
	}, 60000)

	it('API gasless claim test invalid link should throw', async function () {
		// create link
		const link = 'https://peanut.to/claim?c=5&v=v3&i=31&p=FjEditsxpzOafssaffsafsasx6IrI&t=sdk'

		const receiverAddress = goerliWallet.address
		const apiToken = process.env.PEANUT_DEV_API_KEY ?? ''
		try {
			await peanut.claimLinkGasless({ link: link, recipientAddress: receiverAddress, APIKey: apiToken })
			throw new Error('Test should have thrown an error but did not.')
		} catch (e) {
			console.log(e)
			// expect(e.message).toContain('invalid link') // Replace with expected error message
		}
	}, 60000)
})

describe('bnb', function () {
	it('bnb should create a native link with weird tokendecimals and claim it', async function () {
		let tokenAmount = 0.0000455228296990941
		const BNB_RPC_URL = 'https://bsc-dataseed.binance.org/'
		const bnbProvider = new ethers.providers.JsonRpcProvider(BNB_RPC_URL)
		const bnbWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', bnbProvider)
		const chainId = 56
		await createAndClaimLink(
			{
				structSigner: {
					signer: bnbWallet,
				},
				linkDetails: {
					chainId: chainId,
					tokenAmount: tokenAmount,
					tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
				},
			},
			9000
		)
	}, 60000)
})
