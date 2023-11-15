import peanut from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('claimLinkSender tests', function () {
	const RPC_URL = process.env.INFURA_GOERLI_RPC
	const WALLET = new ethers.Wallet(
		process.env.TEST_WALLET_PRIVATE_KEY ?? '',
		new ethers.providers.JsonRpcBatchProvider(RPC_URL)
	)

	it('should create a link and claim it using claimLinkSender', async function () {
		const CHAIN_ID = 5 // 80001 for mumbai, 5 for goerli
		const TOKEN_AMOUNT = 0.0001
		const TOKEN_TYPE = 0 // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
		const TOKEN_ADDRESS = ethers.constants.AddressZero
		const TOKEN_DECIMALS = 18

		// Create a link
		const { link, txHash } = await peanut.createLink({
			structSigner: {
				signer: WALLET,
			},
			linkDetails: {
				chainId: CHAIN_ID,
				tokenAmount: TOKEN_AMOUNT,
				tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
				tokenAddress: TOKEN_ADDRESS,
				tokenDecimals: TOKEN_DECIMALS,
			},
		})

		// Claim the link using claimLinkSender
		const linkDetails = await peanut.getLinkDetails({ link: link })

		try {
			const claimedLink = await peanut.claimLinkSender({
				structSigner: {
					signer: WALLET,
				},
				depositIndex: linkDetails.depositIndex,
			})

			expect(claimedLink).toBeDefined()
			expect(claimedLink.txHash).toBeDefined()
		} catch (error) {
			expect(error.message).toContain('NOT 24 HOURS YET')
		}
	}, 60000)
})
