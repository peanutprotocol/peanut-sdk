import { peanut } from '../../src'
import { ethers } from 'ethersv5'

const raffleLink =
	'https://mantle.peanut.to/packet?c=5000&v=v4.3&i=(85154,500),(85904,4250),(91404,250),(91904,250),(92404,500),(93154,250)&t=mantle#p=cPmzC1AkDOL0W045'
const PEANUT_API_URL = 'https://api.peanut.to'
const TEST_API_KEY = '4euC7De1PAjmePfEtvHb9fXJvRqPoaHw'

describe('Peanut Raffle Functionality', () => {
	test('should successfully claim a raffle', async () => {
		// Generate a random wallet
		const randomWallet = ethers.Wallet.createRandom()
		const randomAddress = randomWallet.address
		console.log(`Random Address: ${randomAddress}`)

		const raffleInfo = await peanut.getRaffleInfo({
			link: raffleLink,
			baseUrl: `${PEANUT_API_URL}/get-raffle-info`,
			APIKey: TEST_API_KEY,
		})
		console.log(raffleInfo)

		// get user status
		const userStatus = await peanut.getUserRaffleStatus({
			link: raffleLink,
			userAddress: randomAddress,
			baseUrl: `https://api.peanut.to/user-raffle-status`,
			APIKey: TEST_API_KEY,
		})
		console.log(userStatus)

		// claim the raffle
		const raffleClaimedInfo = await peanut.claimRaffleLink({
			link: raffleLink,
			recipientAddress: randomAddress,
			APIKey: TEST_API_KEY,
			baseUrlAuth: `${PEANUT_API_URL}/get-authorisation`,
			baseUrlClaim: `${PEANUT_API_URL}/claim-v2`,
		})
		console.log(raffleClaimedInfo)

		const leaderboardInfo = await peanut.getRaffleLeaderboard({
			link: raffleLink,
			baseUrl: `${PEANUT_API_URL}/get-raffle-leaderboard`,
			APIKey: TEST_API_KEY,
		})
		console.log(leaderboardInfo)
	}, 60000)
})
