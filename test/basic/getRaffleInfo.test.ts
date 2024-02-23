import { peanut } from '../../src'
import { ethers } from 'ethersv5'

const raffleLink =
	'https://mantle.peanut.to/packet?c=5000&v=v4.3&i=(85154,500),(85904,4250),(91404,250),(91904,250),(92404,500),(93154,250)&t=mantle'
const PEANUT_API_URL = 'https://api.peanut.to'
const TEST_API_KEY = '4euC7De1PAjmePfEtvHb9fXJvRqPoaHw'

describe('Peanut Raffle Functionality', () => {
	test('should successfully get raffle info', async () => {
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
	}, 60000)
})
