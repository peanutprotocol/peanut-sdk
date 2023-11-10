import { ethers } from 'ethersv5'
import peanut from '../src/index' // import directly from source code
import dotenv from 'dotenv'
import { describe, it, expect } from '@jest/globals'

dotenv.config()

describe('TESTNET Peanut XChain claiming tests', function () {
	it('should create and claim link', async function () {
		// goerli
		const CHAINID = 5
		const provider = await peanut.getDefaultProvider(String(CHAINID))
		const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY ?? '', provider)
		console.log('Using ' + wallet.address)
		// let link = 'https://peanut.to/claim#?c=5&v=v5&i=27&p=N5zPNFggvTqVeKt5&t=sdk'
		// let link = 'https://peanut.to/claim#?c=5&v=v5&i=35&p=gmIAFfwUFVOxk9IO&t=sdk'
		// let link = 'https://peanut.to/claim#?c=5&v=v5&i=38&p=5sMdW7PU1jQkxeRz&t=sdk'
		// let link = 'https://peanut.to/claim#?c=5&v=v5&i=40&p=2Aojyh8prHKYXBBv&t=sdk'
		// let link = 'https://peanut.to/claim#?c=5&v=v5&i=2&p=vbEnBssRdxtnyBsQ&t=sdk'
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

		// try on a single chain Id
		// const claimTx = await peanut.claimLinkXChain({
		// 	structSigner: {
		// 		signer: wallet,
		// 		gasLimit: ethers.BigNumber.from(1000000), // hardcode gas to guarantee broadcasts
		// 	},
		// 	link: link,
		// 	// destinationChainId: '3', // arbitrum
		// 	// destinationChainId: '59140', // linea testnet
		// 	// destinationChainId: '43113', // avalanche fuji
		// 	destinationChainId: '80001', // avalanche mumbai
		// 	isTestnet: true,
		// 	maxSlippage: 3.0,
		// 	recipient: await wallet.getAddress(), // replace with actual recipient address
		// })

		const claimTx = await peanut.claimLinkXChainGasless({
			link: link,
			recipientAddress: await wallet.getAddress(),
			APIKey: process.env.PEANUT_DEV_API_KEY ?? '',
			destinationChainId: '80001', // avalanche mumbai
			isTestnet: true,
			// baseUrl: 'local',
		})

		console.log('success: x claimTx: ' + claimTx.txHash)

		// Add your assertions here
		expect(claimTx).toBeTruthy()
		expect(claimTx.txHash).toBeDefined()
	}, 120000) // Increase timeout if necessary
})
