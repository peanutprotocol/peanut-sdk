import * as peanut from '../../src'
import { ethers } from 'ethersv5'

import * as consts from './test.consts'

describe('raffle create and claim', () => {
	it('should create a raffle link and claim all slots', async () => {
		peanut.toggleVerbose(true)

		const chainId = consts.chains[Math.floor(Math.random() * consts.chains.length)] // Use a random chainId
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
			withCaptcha: true,
			APIKey: consts.PEANUT_DEV_API_KEY,
			withENS: false,
			withSignedMessage: false,
			withWeb3Email: false,
		})
		console.log('Got the raffle link!', link)

		const claimHashArray: string[] = []
		for (let i = 0; i < numberOfSlots; i++) {
			const claimInfo = await peanut.claimRaffleLink({
				link: link.link,
				APIKey: consts.PEANUT_DEV_API_KEY,
				recipientAddress: consts.recipientAddresses[i],
				recipientName: 'test-suite',
			})

			console.log('Link claimed: ' + claimInfo.txHash)
			if (claimInfo.txHash) {
				claimHashArray.push(claimInfo.txHash)
			}
		}

		expect(claimHashArray).toHaveLength(numberOfSlots)
	})

	test('create a ERC1155 raffle', async () => {
		const chainId = '137'
		const provider = await peanut.getDefaultProvider(chainId)
		const wallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY, provider)
		console.log('Using wallet:', wallet.address)

		const password = await peanut.getRandomString()
		const numberOfLinks = 10
		const withMFA = true
		const linkDetails: peanut.interfaces.IPeanutLinkDetails = {
			chainId,
			tokenType: 3,
			tokenAmount: 0,
			tokenDecimals: 18,
			tokenAddress: '0xb9223784be9f67b12ef6F13049ce7180695aAf73',
		}
		const { unsignedTxs } = await peanut.prepareRaffleDepositTxs({
			linkDetails,
			numberOfLinks,
			tokenIds: Array.from(Array(numberOfLinks).keys()).map((value) => ethers.BigNumber.from(value)),
			password,
			userAddress: wallet.address,
			withMFA,
		})

		console.log({ unsignedTxs })

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
			numberOfLinks,
			password,
			name: 'baobob',
			withMFA,
			withCaptcha: false,
			APIKey: consts.PEANUT_DEV_API_KEY,
			// baseUrl: 'http://localhost:8000/submit-raffle-link',
			withENS: false,
			withSignedMessage: false,
			withWeb3Email: false,
		})
		console.log('Got the raffle link!', link)
	}, 120000)
})
// TODO: fix these, since raffle is broken in latest sdk version these wont work
