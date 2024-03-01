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

	peanut.toggleVerbose(true)
	it('should prepare the correct tx', async function () {
		const chainId = '137'

		const unclaimedTxs = await peanut.getAllUnclaimedDepositsWithIdxForAddress({
			address: WALLET.address,
			chainId,
			peanutContractVersion: 'v4.3',
		})

		console.log(unclaimedTxs[unclaimedTxs.length - 1].idx)

		const preparedClaimTx = await peanut.prepareClaimLinkSenderTx({
			chainId,
			depositIndex: unclaimedTxs[unclaimedTxs.length - 1].idx,
		})

		console.log(preparedClaimTx)

		const feeOptions = peanut.setFeeOptions({
			provider: WALLET.provider,
			chainId: chainId,
		})

		const tx = { ...preparedClaimTx, ...feeOptions }

		console.log({ tx })
	}, 1000000000)

	it.skip('should create a link and claim it using claimLinkSender', async function () {
		return true
		// can't be run if 24 hours hasn't passed since the link was created

		const CHAIN_ID = '5' // 80001 for mumbai, 5 for goerli
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
