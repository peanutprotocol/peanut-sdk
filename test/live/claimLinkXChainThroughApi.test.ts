import { ethers } from 'ethersv5'
import peanut from '../../src/index' // import directly from source code
import dotenv from 'dotenv'
import { describe, it } from '@jest/globals'
dotenv.config()

describe('Peanut XChain claiming tests', function () {
	it('Create a link and claim it cross-chain', async function () {
		peanut.toggleVerbose(true)
		const userPrivateKey = process.env.TEST_WALLET_X_CHAIN_USER!
		const relayerPrivateKey = process.env.TEST_WALLET_X_CHAIN_RELAYER!
		const apiKey = process.env.PEANUT_DEV_API_KEY!

		// Parameters that affect the test behaviour
		const sourceChainId = '137'
		const destinationChainId = '42161'
		const amountToTestWith = 0.1
		// if link is empty, a new one will be created
		let link = ''

		const sourceChainProvider = await peanut.getDefaultProvider(String(sourceChainId))

		const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)
		const relayerSourceChainWallet = new ethers.Wallet(relayerPrivateKey, sourceChainProvider)

		console.log('Using wallets:', {
			user: userSourceChainWallet.address,
			relayer: relayerSourceChainWallet.address,
		})

		if (link) {
			console.log('Using an already existing link!', link)
		} else {
			const { link: createdLink } = await peanut.createLink({
				structSigner: {
					signer: userSourceChainWallet,
				},
				linkDetails: {
					chainId: sourceChainId,
					tokenAmount: amountToTestWith,
					tokenType: 0, // 0 is for native tokens
				},
				peanutContractVersion: 'v4.2',
			})
			link = createdLink
			console.log('Created a link on the source chain!', link)
		}

		const result = await peanut.claimLinkXChainGasless({
			link,
			recipientAddress: userSourceChainWallet.address,
			destinationChainId,
			APIKey: apiKey,
			isMainnet: true,
			baseUrl: 'http://localhost:8000/claim-x-chain',
			squidRouterUrl: 'http://localhost:8000/get-squid-route',
		})
		console.log('X-chain result!', { result })
	}, 120000) // Increase the timeout if necessary
})
