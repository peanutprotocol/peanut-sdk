import { ethers } from 'ethersv5'
import peanut from '../../src'
import * as utils from './test.utils'
import * as consts from './test.consts'

describe('batch create and claim', () => {
	it('should batch create and claim links', async () => {
		peanut.toggleVerbose(true)
		const chainId = consts.chains[Math.floor(Math.random() * consts.chains.length)] // Use a random chainId

		const provider = await peanut.getDefaultProvider(chainId)
		const wallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY ?? '', provider)
		const recipientAddress = await wallet.getAddress()

		const numberOfLinks = 2

		const response = await peanut.createLinks({
			structSigner: {
				signer: wallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount: 0.0001,
				tokenType: 0,
			},
			numberOfLinks,
		})

		if (response) {
			await utils.waitForTransaction(provider, response[response.length - 1].txHash)
		}

		console.log('Links created: ' + response)

		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before claiming

		const claimHashArray: string[] = []
		for (let i = 0; i < response.length; i++) {
			const claimResult = await peanut.claimLinkGasless({
				link: response[i].link,
				recipientAddress: recipientAddress,
				APIKey: consts.PEANUT_DEV_API_KEY,
			})
			console.log('Link claimed: ' + claimResult.txHash)
			claimHashArray.push(claimResult.txHash)
		}

		expect(claimHashArray).toHaveLength(numberOfLinks)
	}, 120000)
})
