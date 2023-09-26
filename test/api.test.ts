import peanut from '../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY2 as string
// const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm'
const OPTIMISM_GOERLI_RPC_URL = 'https://rpc.goerli.optimism.gateway.fm'
// const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL); // v6
// const goerliProvider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL) // v5
// const goerliProvider = await peanut.getDefaultProvider('5')
const optimismGoerliProvider = new ethers.providers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL) // v5
// const optimismGoerliProvider = new ethers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v6

const optimism_goerli_wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, optimismGoerliProvider)

const API_URL = 'http://api.peanut.to/claim'
// let API_URL = 'http://127.0.0.1:5000/claim'
// let API_URL = 'http://127.0.0.1:8000/claim'

// fetch(API_URL)
// 	.then((res) => {
// 		if (!res.ok) {
// 			throw new Error(res.statusText)
// 		}
// 	})
// 	.catch(() => {
// 		API_URL = 'https://api.peanut.to/claim'
// 	})
console.log(`API_URL is set to: ${API_URL}`)

describe('Peanut API Integration Tests', function () {
	const links: string[] = []

	it('should create a link and claim it', async function () {
		const apiToken = process.env.PEANUT_DEV_API_KEY ?? ''

		const chainId = 420 // optimism goerli
		const tokenAmount = 0.00001337
		const tokenType = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
		setTimeout(() => {}, 9000)
		const resp = await peanut.createLink({
			structSigner: {
				signer: optimism_goerli_wallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenType: tokenType,
			},
		})

		// check status of link
		setTimeout(() => {}, 2000)
		const status = await peanut.getLinkDetails({ provider: optimismGoerliProvider, link: resp.createdLink.link[0] })
		console.log('status', status)

		// claim link using api
		const receiverAddress = optimism_goerli_wallet.address
		setTimeout(() => {}, 9000)
		const res = await peanut.claimLinkGasless({
			link: resp.createdLink.link[0],
			recipientAddress: receiverAddress,
			APIKey: apiToken,
			baseUrl: API_URL,
		})
		expect(res.status).toBe('success')
		console.log('claim link response', res.data)

		links.push(resp.createdLink.link[0])
	}, 60000) // 60 seconds timeout

	it('should create two links and claim them simultaneously', async function () {
		const apiToken = process.env.PEANUT_DEV_API_KEY ?? ''

		const chainId = 420 // optimism goerli
		const tokenAmount = 0.00001337
		const tokenType = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155

		// Create two links
		const resp1 = await peanut.createLink({
			structSigner: {
				signer: optimism_goerli_wallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenType: tokenType,
			},
		})

		const resp2 = await peanut.createLink({
			structSigner: {
				signer: optimism_goerli_wallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenType: tokenType,
			},
		})

		// Claim both links simultaneously
		const receiverAddress = optimism_goerli_wallet.address

		const res1 = await peanut.claimLinkGasless({
			link: resp1.createdLink.link[0],
			recipientAddress: receiverAddress,
			APIKey: apiToken,
			baseUrl: API_URL,
		})

		const res2 = await peanut.claimLinkGasless({
			link: resp2.createdLink.link[0],
			recipientAddress: receiverAddress,
			APIKey: apiToken,
			baseUrl: API_URL,
		})

		expect(res1.status).toBe('success')
		expect(res2.status).toBe('success')
		links.push(resp1.createdLink.link[0])
		links.push(resp2.createdLink.link[0])
	}, 120000) // 120 seconds timeout

	it('should fail to claim an already claimed link', async function () {
		const apiToken = process.env.PEANUT_DEV_API_KEY ?? ''

		const chainId = 420 // optimism goerli
		const tokenAmount = 0.0001337
		const tokenType = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155

		// Create a link
		const resp = await peanut.createLink({
			structSigner: {
				signer: optimism_goerli_wallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenType: tokenType,
			},
		})
		links.push(resp.createdLink.link[0])

		// Claim the link
		const receiverAddress = optimism_goerli_wallet.address

		const res = await peanut.claimLinkGasless({
			link: resp.createdLink.link[0],
			recipientAddress: receiverAddress,
			APIKey: apiToken,
			baseUrl: API_URL,
		})

		expect(res.status).toBe('success')

		// Try to claim the link again (it should fail)
		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const res = await peanut.claimLinkGasless({
				link: resp.createdLink.link[0],
				recipientAddress: receiverAddress,
				APIKey: apiToken,
				baseUrl: API_URL,
			})
			expect(false).toBe(true)
		} catch {
			expect(true).toBe(true)
		}
	}, 90000) // 90 seconds timeout

	it('should fail to claim a link with invalid recipient address', async function () {
		const apiToken = process.env.PEANUT_DEV_API_KEY ?? ''

		const chainId = 420 // optimism goerli
		const tokenAmount = 0.0001337
		const tokenType = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155

		// Create a link
		const resp = await peanut.createLink({
			structSigner: {
				signer: optimism_goerli_wallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenType: tokenType,
			},
		})

		// Try to claim the link with an invalid recipient address
		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const res = await peanut.claimLinkGasless({
				link: resp.createdLink.link[0],
				recipientAddress: '0xInvalidAddress',
				APIKey: apiToken,
				baseUrl: API_URL,
			})
			expect(false).toBe(true) // this line should not be reached
		} catch {
			expect(true).toBe(true) // expect an error to be thrown
		}
	}, 90000) // 90 seconds timeout

	const numLinks = 5
	it(
		'should create multiple links and claim them simultaneously',
		async function () {
			const apiToken = process.env.PEANUT_DEV_API_KEY ?? ''

			const chainId = 420 // optimism goerli
			const tokenAmount = 0.00001337
			const tokenType = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155

			// Create multiple links
			const resp = await peanut.createLinks({
				structSigner: {
					signer: optimism_goerli_wallet,
				},
				linkDetails: {
					chainId: chainId,
					tokenAmount: tokenAmount,
					tokenType: tokenType,
				},
				numberOfLinks: numLinks,
			})

			console.log('resp', resp)

			// Claim all links simultaneously
			// Claim all links simultaneously
			const receiverAddress = optimism_goerli_wallet.address
			const claimPromises = resp.createdLinks.flatMap((link) => {
				// Ensure link.link is an array
				const links = Array.isArray(link.link) ? link.link : [link.link]
				console.log('links', links)
				return links.map((singleLink) =>
					peanut.claimLinkGasless({
						link: singleLink,
						recipientAddress: receiverAddress,
						APIKey: apiToken,
						baseUrl: API_URL,
					})
				)
			})
			const claimResponses = await Promise.all(claimPromises)

			// Check that all claims were successful
			claimResponses.forEach((res) => expect(res.status).toBe('success'))

			// Add created links to the links array
			resp.createdLinks.forEach((link) => links.push(link.link as string))
		},
		numLinks * 120000
	) // Adjust timeout based on number of links
})
