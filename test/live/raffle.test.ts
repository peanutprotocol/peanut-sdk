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
	addLinkCreation,
	getPopularityLeaderboard,
	claimRaffleLink,
} from '../../src/index'
import dotenv from 'dotenv'
import { makeRandomAddress } from '../util'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY!
const APIKey = process.env.PEANUT_DEV_API_KEY!

describe('raffle', () => {
	toggleVerbose(true)

	test('create a link', async () => {
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
		})
		console.log('Got the raffle link!', link)
	}, 120000)

	test('get raffle info', async () => {
		const link = 'https://red.peanut.to/packet?c=5000&v=v4.3&i=(33248,5098)&t=mantle#p=7SMDzKEn7ZOwdwPw'
		const info = await getRaffleInfo({ link, APIKey })
		console.log('Raffle info!', info)
	}, 120000)

	test('claim raffle link', async () => {
		const link =
			'https://red.peanut.to/packet?c=137&v=v4.2&i=637,638,639,640,641,642,643,644,645,646&t=ui#p=rTe4ve5LkxcHbZVb'
		const recipientAddress = '0xa3635c5A3BFb209b5caF76CD4A9CD33De65e2f72'
		console.log({ recipient: recipientAddress })
		const claimInfo = await claimRaffleLink({
			link,
			APIKey,
			recipientAddress,
			recipientName: 'amobest',
			baseUrlAuth: 'http://localhost:8000/get-authorisation',
			baseUrlClaim: 'http://localhost:8000/claim-v2',
		})
		console.log('Claimed a raffle slot!!', claimInfo)
		const leaderboard = await getRaffleLeaderboard({
			link,
			APIKey,
		})
		console.log('Hooouray, leaderboard!', { leaderboard })
	}, 120000)

	test('claim raffle link with mfa', async () => {
		const link = 'https://peanut.to/claim?c=137&v=v4.3&i=(57,3)#p=cWBDOZyqwwNaTyaW'
		const recipientAddress = makeRandomAddress()
		console.log({ recipient: recipientAddress })
		const claimInfo = await claimRaffleLink({
			link,
			APIKey,
			recipientAddress,
			recipientName: 'amobest',
			captchaResponse: 'using test recaptcha api key, so captcha is always valid',
			baseUrlAuth: 'http://localhost:8000/get-authorisation',
			baseUrlClaim: 'http://localhost:8000/claim-v2',
		})
		console.log('Claimed a raffle slot!!', claimInfo)
		const leaderboard = await getRaffleLeaderboard({
			link,
			APIKey,
		})
		console.log('Hooouray, leaderboard!', { leaderboard })
	}, 120000)

	test('generate amounts distribution', async () => {
		const totalAmount = BigNumber.from(1e6)
		const numberOfLinks = 1
		const values = generateAmountsDistribution(totalAmount, numberOfLinks)
		console.log(
			'Values!!',
			values.map((val) => val.toString())
		)
	}, 120000)

	// Smoke tests of raffle names to see that the sdk adapters work.
	// Main testing happens in the api repository.
	test('raffle names', async () => {
		// randomise the password to make the link unique in every test
		const p = await getRandomString()
		const link = `https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32#p=${p}`

		const address2 = makeRandomAddress()
		const address3 = makeRandomAddress()

		const leaderboard = await getRaffleLeaderboard({
			link,
			APIKey,
		})
		expect(leaderboard).toEqual([
			{
				address: address3,
				amount: '0.078',
				name: null,
			},
			{
				address: address2,
				amount: '0.05',
				name: 'bye-bye',
			},
		])
	})

	test('hasAddressParticipatedInRaffle', async () => {
		const link =
			'https://red.peanut.to/packet?c=137&v=v4.2&i=637,638,639,640,641,642,643,644,645,646&t=ui#p=rTe4ve5LkxcHbZVb'

		// Manually claimed this link for this address
		const participated1 = await hasAddressParticipatedInRaffle({
			address: '0xa3635c5A3BFb209b5caF76CD4A9CD33De65e2f72',
			link,
			APIKey,
		})
		expect(participated1).toBe(true)

		// New random address, so has to be false
		const participated2 = await hasAddressParticipatedInRaffle({
			address: makeRandomAddress(),
			link,
			APIKey,
		})
		expect(participated2).toBe(false)
	})

	test('addLinkCreation', async () => {
		await addLinkCreation({
			APIKey,
			name: 'boiii',
			link: 'https://peanut.to/redpacket?c=11155111&v=v4.2&i=38,39,40,41,42#p=12345678',
			withMFA: true,
			withCaptcha: true,
			baseUrl: 'http://localhost:8000/submit-raffle-link',
		})
	})

	test('getGenerosityLeaderboard', async () => {
		const leaderboard = await getGenerosityLeaderboard({})
		console.log({ leaderboard })
	})

	test('getPopularityLeaderboard', async () => {
		const leaderboard = await getPopularityLeaderboard({})
		console.log({ leaderboard })
	})

	test('bad password', async () => {
		const link =
			'https://red.peanut.to/packet?c=11155111&v=v4.2&i=180,181,182,183,184,185,186,187,188,189&t=ui#p=oJ0gRayKwakXx3KgFFFFFFF'
		let raised = false
		try {
			await claimRaffleLink({
				link,
				APIKey,
				recipientAddress: makeRandomAddress(),
			})
		} catch (error: any) {
			console.log('Got error!', error)
			const err: interfaces.SDKStatus = error
			expect(err.code).toBe(interfaces.ERaffleErrorCodes.ERROR)
			raised = true
		}
		expect(raised).toBe(true)
	}, 120000)
})
