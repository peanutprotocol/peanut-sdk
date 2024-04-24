import { BigNumber, Wallet } from 'ethersv5'
import {
	generateAmountsDistribution,
	getDefaultProvider,
	getRaffleInfo,
	getRaffleLeaderboard,
	getRaffleLinkFromTx,
	getRandomString,
	interfaces,
	hasAddressParticipatedInRaffle,
	prepareRaffleDepositTxs,
	signAndSubmitTx,
	toggleVerbose,
	getGenerosityLeaderboard,
	getPopularityLeaderboard,
	claimRaffleLink,
	config,
} from '../../src/index'
import dotenv from 'dotenv'
import { makeRandomAddress } from '../util'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY!
const APIKey = process.env.PEANUT_DEV_API_KEY!

describe('raffle', () => {
	toggleVerbose(true)

	test.only('create an ETH raffle', async () => {
		const chainId = '137'
		const provider = await getDefaultProvider(chainId)
		const wallet = new Wallet(TEST_WALLET_PRIVATE_KEY, provider)

		const password = await getRandomString()
		const numberOfLinks = 3
		const linkDetails: interfaces.IPeanutLinkDetails = {
			chainId,
			tokenAmount: 0.1,
			tokenDecimals: 18,
			tokenType: 0,
		}
		const { unsignedTxs } = await prepareRaffleDepositTxs({
			linkDetails,
			numberOfLinks,
			password,
			userAddress: wallet.address,
			withMFA: true,
		})

		console.log({ unsignedTxs })

		let lastTxHash = ''
		for (let i = 0; i < unsignedTxs.length; i++) {
			const { tx, txHash } = await signAndSubmitTx({
				structSigner: {
					signer: wallet,
				},
				unsignedTx: unsignedTxs[i],
			})
			console.log('Submitted raffle tx with hash:', txHash)
			lastTxHash = txHash
			await tx.wait()
		}
		const link = await getRaffleLinkFromTx({
			txHash: lastTxHash,
			linkDetails,
			numberOfLinks,
			password,
			name: 'baobob',
			withMFA: true,
			withCaptcha: true,
			APIKey,
			baseUrl: 'http://localhost:8000/submit-raffle-link',
			withENS: false,
			withSignedMessage: false,
			withWeb3Email: false,
		})
		console.log('Got the raffle link!', link)
	}, 120000)

	test('create a ERC1155 raffle', async () => {
		const chainId = '137'
		const provider = await getDefaultProvider(chainId)
		const wallet = new Wallet(TEST_WALLET_PRIVATE_KEY, provider)
		config.verbose && console.log('Using wallet:', wallet.address)

		const password = await getRandomString()
		const numberOfLinks = 10
		const withMFA = true
		const linkDetails: interfaces.IPeanutLinkDetails = {
			chainId,
			tokenType: 3,
			tokenAmount: 0,
			tokenDecimals: 18,
			tokenAddress: '0xb9223784be9f67b12ef6F13049ce7180695aAf73',
		}
		const { unsignedTxs } = await prepareRaffleDepositTxs({
			linkDetails,
			numberOfLinks,
			tokenIds: Array.from(Array(numberOfLinks).keys()).map((value) => BigNumber.from(value)),
			password,
			userAddress: wallet.address,
			withMFA,
		})

		console.log({ unsignedTxs })

		let lastTxHash = ''
		for (let i = 0; i < unsignedTxs.length; i++) {
			const { tx, txHash } = await signAndSubmitTx({
				structSigner: {
					signer: wallet,
				},
				unsignedTx: unsignedTxs[i],
			})
			console.log('Submitted raffle tx with hash:', txHash)
			lastTxHash = txHash
			await tx.wait()
		}
		const link = await getRaffleLinkFromTx({
			txHash: lastTxHash,
			linkDetails,
			numberOfLinks,
			password,
			name: 'baobob',
			withMFA,
			withCaptcha: false,
			APIKey,
			// baseUrl: 'http://localhost:8000/submit-raffle-link',
			withENS: false,
			withSignedMessage: false,
			withWeb3Email: false,
		})
		console.log('Got the raffle link!', link)
	}, 120000)

	test('claim raffle link', async () => {
		// ETH raffle link
		// const link =
		// 	'https://red.peanut.to/packet?c=137&v=v4.2&i=637,638,639,640,641,642,643,644,645,646&t=ui#p=rTe4ve5LkxcHbZVb'

		// ERC-1155 raffle link
		const link = 'https://peanut.to/claim?c=137&v=v4.4&i=(12,2)#p=MzsYuUlSwD1gU21M'
		const recipientAddress = makeRandomAddress()
		console.log({ recipient: recipientAddress })
		const claimInfo = await claimRaffleLink({
			link,
			APIKey,
			recipientAddress,
			recipientName: 'amobest',
			// baseUrlAuth: 'http://localhost:8000/get-authorisation',
			// baseUrlClaim: 'http://localhost:8000/claim-v2',
		})
		console.log('Claimed a raffle slot!!', claimInfo)
		const leaderboard = await getRaffleLeaderboard({
			link,
			APIKey,
			// baseUrl: 'http://localhost:8000/get-raffle-leaderboard'
		})
		console.log('Hooouray, leaderboard!', { leaderboard })
	}, 120000)
})
