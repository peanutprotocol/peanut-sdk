import { ethers } from 'ethersv5'
import peanut from '../../src/index' // import directly from source code
import dotenv from 'dotenv'
import { describe, it, expect } from '@jest/globals'
dotenv.config()

describe.skip('TESTNET Peanut XChain claiming tests', function () {
	it('should create and claim link', async function () {
		// goerli
		const CHAINID = 5
		const provider = await peanut.getDefaultProvider(String(CHAINID))
		const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY ?? '', provider)
		console.log('Using ' + wallet.address)
		// let link = 'https://peanut.to/claim#?c=5&v=v5&i=0&p=3H7bLlHSnjknA5dd&t=sdk'
		let link = ''

		if (link.length == 0) {
			// create link
			console.log('No link supplied, creating..')
			const createLinkResponse = await peanut.createLink({
				structSigner: {
					signer: wallet,
				},
				linkDetails: {
					chainId: CHAINID,
					tokenAmount: 0.1,
					tokenType: 0, // 0 is for native tokens
				},
				peanutContractVersion: 'v5',
			})

			link = createLinkResponse.link
			console.log('New link: ' + link)
		} else {
			console.log('Link supplied : ' + link)
		}

		// get status of link
		const getLinkDetailsResponse = await peanut.getLinkDetails({
			link,
			provider: wallet.provider,
		})
		console.log('The link is claimed: ' + getLinkDetailsResponse.claimed)

		peanut.toggleVerbose(true)

		// try for each of chainIds:
		// const SquidSupportedTestnetChainIds = [80001, 3, 43113, 59140]
		// for (let i = 0; i < SquidSupportedTestnetChainIds.length; i++) {
		// 	try {
		// 		const claimTx = await peanut.claimLinkXChain({
		// 			structSigner: {
		// 				signer: wallet,
		// 				// gasLimit: ethers.BigNumber.from(1000000), // hardcode gas to guarantee broadcasts
		// 			},
		// 			link: link,
		// 			destinationChainId: String(SquidSupportedTestnetChainIds[i]), // use chain ID from array
		// 			isTestnet: true,
		// 			maxSlippage: 3.0,
		// 			recipient: await wallet.getAddress(), // replace with actual recipient address
		// 		})

		// 		console.log('success: x claimTx: ' + claimTx.txHash)
		// 		break // exit the loop if the claim is successful
		// 	} catch (error) {
		// 		console.log(`Failed to claim on chain ID ${SquidSupportedTestnetChainIds[i]}: ${error.message}`)
		// 	}
		// }

		// try on a single chain Id
		const claimTx = await peanut.claimLinkXChain({
			structSigner: {
				signer: wallet,
				// gasLimit: ethers.BigNumber.from(1000000), // hardcode gas to guarantee broadcasts
			},
			link: link,
			// destinationChainId: '3', // arbitrum
			// destinationChainId: '59140', // linea testnet
			// destinationChainId: '43113', // avalanche fuji
			destinationChainId: '80001', // avalanche mumbai
			isTestnet: true,
			maxSlippage: 3.0,
			recipient: await wallet.getAddress(), // replace with actual recipient address
		})

		console.log('success: x claimTx: ' + claimTx.txHash)

		// Add your assertions here
		expect(claimTx).toBeTruthy()
		expect(claimTx.txHash).toBeDefined()
	}, 120000) // Increase timeout if necessary
})

describe('MAINNET Peanut XChain claiming tests', function () {
	it('should create and claim link', async function () {
		const CHAINID = 42161
		const provider = await peanut.getDefaultProvider(String(CHAINID))
		const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY2 ?? '', provider)
		console.log('Using ' + wallet.address)
		// let link = 'https://experimental.peanut.to/claim#?c=42161&v=v5&i=1&p=QRZCdg9valYKtD5N&t=ui'
		// let link = 'https://experimental.peanut.to/claim#?c=42161&v=v5&i=14&p=YMHlfCDxZvZTTajB&t=ui'
		let link = ''

		peanut.toggleVerbose()
		if (link.length == 0) {
			// create link
			console.log('No link supplied, creating..')
			const createLinkResponse = await peanut.createLink({
				structSigner: {
					signer: wallet,
					// gasLimit: ethers.BigNumber.from(5100000), // hardcode gas
				},
				// linkDetails: {
				// 	chainId: CHAINID,
				// 	tokenAmount: 0.001,
				// 	tokenType: 0, // 0 is for native tokens
				// },
				linkDetails: {
					chainId: CHAINID,
					tokenAmount: 0.001,
					tokenType: 1, // 0 is for native tokens
					tokenAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
					tokenDecimals: 6,
				},
				peanutContractVersion: 'v5',
			})

			link = createLinkResponse.link
			console.log('New link: ' + link)
		} else {
			console.log('Link supplied : ' + link)
		}

		const claimTx = await peanut.claimLinkXChain({
			structSigner: {
				signer: wallet,
				// gasLimit: ethers.BigNumber.from(5000000), // hardcode gas
			},
			link: link,
			destinationChainId: '137',
			destinationTokenAddress: '0x0000000000000000000000000000000000000000',
			isTestnet: false,
			maxSlippage: 1.0,
			recipient: await wallet.getAddress(), // replace with actual recipient address
		})

		console.log('success: x claimTx: ' + claimTx.txHash)

		// Add your assertions here
		expect(claimTx).toBeTruthy()
		expect(claimTx.txHash).toBeDefined()
	}, 240000) // Increase timeout if necessary
})
