import peanut from '../src/index' // import directly from source code
import { ethers } from 'ethersv5'
import { expect, describe, it } from '@jest/globals'
import { ERC20_ABI } from '../src/data'
import * as interfaces from '../src/consts/interfaces.consts'
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY ?? ''

async function createAndClaimLink(options: interfaces.ICreateLinkParams, inbetweenDelay = 1000) {
	const response = await peanut.createLink(options)
	if (response.link) {
		await waitForTransaction(options.structSigner.signer.provider, response.txHash)
	}
	console.log('Link created: ' + response.link)
	await new Promise((res) => setTimeout(res, inbetweenDelay)) // Wait for 1 second before claiming
	return peanut.claimLink({
		structSigner: {
			signer: options.structSigner.signer,
		},
		link: response.link,
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

	it('should create a native link and claim it', async function () {
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
			12000
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
			// yay, do nothing
		}
	}, 60000)

	// see api tests
	// it('API gasless claim test', async function () {
	// 	// create link
	// 	const response = await peanut.createLink({
	// 		structSigner: {
	// 			signer: goerliWallet,
	// 		},
	// 		linkDetails: {
	// 			chainId: chainId,
	// 			tokenAmount: tokenAmount,
	// 			tokenType: 0,
	// 		},
	// 	})

	// 	// wait for 7 seconds
	// 	await new Promise((res) => setTimeout(res, 7000))

	// 	// claim link using api
	// 	const receiverAddress = goerliWallet.address
	// 	const apiToken = process.env.PEANUT_DEV_API_KEY ?? ''
	// 	// const res = await peanut.claimLinkGasless(link, receiverAddress, apiToken, true, 'http://127.0.0.1:5001/claim')
	// 	const res = await peanut.claimLinkGasless({
	// 		link: response.createdLink.link[0],
	// 		recipientAddress: receiverAddress,
	// 		APIKey: apiToken,
	// 	})

	// 	console.log(res)
	// }, 60000)

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
		const tokenAmount = 0.0000455228296990941
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

// describe('mainnet', function () {
// 	throw new Error('Dont run mainnet tests lol')
// 	it('mainnet should create an er20 link with weird tokendecimals and claim it', async function () {
// 		peanut.toggleVerbose()
// 		const tokenAmount = 0.0000455228296990941
// 		const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // usdc
// 		const tokenDecimals = 6
// 		const provider = await peanut.getDefaultProvider('1')
// 		const bnbWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)
// 		const chainId = 1
// 		await createAndClaimLink(
// 			{
// 				structSigner: {
// 					signer: bnbWallet,
// 				},
// 				linkDetails: {
// 					chainId: chainId,
// 					tokenAmount: tokenAmount,
// 					tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
// 					tokenAddress: tokenAddress,
// 					tokenDecimals: tokenDecimals,
// 				},
// 			},
// 			9000
// 		)
// 	}, 60000)
// })

// will take a loong time, goerli...
describe('new wallet test', function () {
	const TEST_WALLET_RPC_URL = 'https://rpc.goerli.eth.gateway.fm'
	const testWalletProvider = new ethers.providers.JsonRpcProvider(TEST_WALLET_RPC_URL)
	const testWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', testWalletProvider)

	it('should create a new wallet, load it with native token and erc20, and test both', async function () {
		// Create a new random wallet from seed
		const newWallet = ethers.Wallet.createRandom()
		// const newWallet = ethers.Wallet.fromMnemonic(
		// 	'loud music eyebrow wasp entire genre switch lemon shield judge aware dash'
		// )
		const newWalletConnected = newWallet.connect(testWalletProvider)
		console.log('new wallet address: ' + newWallet.address)

		// Define token details
		const tokenAddress = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB' // goerli LINK
		const tokenDecimals = 18
		const tokenAmount = ethers.utils.parseUnits('0.0001', tokenDecimals) // 10 LINK

		// Transfer native token to new wallet
		console.log('sending native token to new wallet')
		let transaction = await testWallet.sendTransaction({
			to: newWallet.address,
			value: ethers.utils.parseEther('0.01'),
		})
		await transaction.wait()
		console.log('native token sent to new wallet. txHash: ' + transaction.hash)

		// Test native token
		console.log('testing native token')
		await createAndClaimLink(
			{
				structSigner: {
					signer: newWalletConnected,
				},
				linkDetails: {
					chainId: 5,
					tokenAmount: 0.00005,
					tokenType: 0, // 0 for ether
				},
			},
			9000
		)

		// Transfer ERC20 token to new wallet
		console.log('sending erc20 token to new wallet')
		const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, testWallet)
		transaction = await tokenContract.transfer(newWallet.address, tokenAmount)
		await transaction.wait()
		console.log('erc20 token sent to new wallet. txHash: ' + transaction.hash)

		console.log('testing erc20 token')
		await createAndClaimLink(
			{
				structSigner: {
					signer: newWalletConnected,
				},
				linkDetails: {
					chainId: 5,
					tokenAmount: 0.00001,
					tokenDecimals: tokenDecimals,
					tokenAddress: tokenAddress,
					tokenType: 1, // 1 for erc20
				},
			},
			9000
		)
	}, 240000)
})
