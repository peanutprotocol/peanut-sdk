import peanut from '../src/index'
import { ethers } from 'ethersv5'
import dotenv from 'dotenv'

dotenv.config()

describe('claimAllUnclaimedAsSenderPerChain', () => {
	const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY2 as string
	const RPC_URL_GOERLI = process.env.INFURA_GOERLI_RPC as string
	const GOERLI_PROVIDER = new ethers.providers.JsonRpcProvider(RPC_URL_GOERLI)
	const WALLET_GOERLI = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, GOERLI_PROVIDER)

	// Should retrieve the chainId from the signer and convert it to a string
	it('should retrieve the chainId from the signer and convert it to a string', async () => {
		peanut.toggleVerbose(true)

		const result = await peanut.claimAllUnclaimedAsSenderPerChain({
			structSigner: { signer: WALLET_GOERLI },
			peanutContractVersion: 'v4',
		})

		expect(result).toBeDefined
	}, 15000000)
})
