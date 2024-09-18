import * as peanut from '../../src'
import { ethers } from 'ethersv5'

import * as consts from './test.consts'

describe('raffle create and claim', () => {
	it('should create a raffle link and claim all slots', async () => {
		peanut.toggleVerbose(true)

		const chainId = '10'
		// const chainId = consts.chains[Math.floor(Math.random() * consts.chains.length)] // Use a random chainId
		console.log('using chainId: ', chainId)

		const provider = await peanut.getDefaultProvider(chainId)
		const wallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY, provider)

		const password = await peanut.getRandomString()
		const numberOfSlots = 2
		const linkDetails: peanut.interfaces.IPeanutLinkDetails = {
			chainId,
			tokenAmount: 0.00001,
			tokenDecimals: 18,
			tokenType: 0,
		}

		const { unsignedTxs } = await peanut.prepareRaffleDepositTxs({
			linkDetails,
			numberOfLinks: numberOfSlots,
			password,
			userAddress: wallet.address,
			withMFA: true,
		})

		let lastTxHash = ''
		for (let i = 0; i < unsignedTxs.length; i++) {
			const { tx, txHash } = await peanut.signAndSubmitTx({
				structSigner: {
					signer: wallet,
				},
				unsignedTx: unsignedTxs[i],
			})
			console.log('Submitted raffle tx with hash:', txHash)
			lastTxHash = txHash
			await tx.wait()
		}

		const link = await peanut.getRaffleLinkFromTx({
			txHash: lastTxHash,
			linkDetails,
			numberOfLinks: numberOfSlots,
			password,
			name: 'test-suite',
			withMFA: true,
			withCaptcha: false,
			APIKey: consts.PEANUT_DEV_API_KEY,
			withENS: false,
			withSignedMessage: false,
			withWeb3Email: false,
			// baseUrl: 'http://localhost:5000/submit-raffle-link',
		})
		console.log('Got the raffle link!', link)

		// const link = { link: 'https://peanut.to/claim?c=10&v=v4.3&i=(1166,2)#p=0WlcJ2lA2nrZE9md' }

		// wait 2 seconds before claiming
		await new Promise((resolve) => setTimeout(resolve, 2000))

		const claimHashArray: string[] = []
		for (let i = 0; i < numberOfSlots; i++) {
			const claimInfo = await peanut.claimRaffleLink({
				link: link.link,
				APIKey: consts.PEANUT_DEV_API_KEY,
				recipientAddress: consts.recipientAddresses[i],
				recipientName: 'test-suite',
				// baseUrlAuth: 'http://localhost:5000/get-authorisation',
				// baseUrlClaim: 'http://localhost:5000/claim-v2',
			})

			console.log('Link claimed: ' + claimInfo.txHash)
			if (claimInfo.txHash) {
				claimHashArray.push(claimInfo.txHash)
			}
		}

		expect(claimHashArray).toHaveLength(numberOfSlots)
	}, 120000)
})
