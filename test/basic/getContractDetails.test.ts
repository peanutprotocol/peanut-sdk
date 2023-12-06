import peanut, { interfaces } from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import dotenv from 'dotenv'
// import fetch from 'node-fetch'

dotenv.config()

describe('get contract type test', () => {
	// Returns the contract type when provided with a valid chainId and provider.
	it('test', async () => {
		const chainId = '42161'
		const provider = await peanut.getDefaultProvider(chainId)
		const contractAddress = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'

		const x = await peanut.getContractDetails({
			provider: provider,
			address: contractAddress,
		})

		console.log(x)
	})
})
