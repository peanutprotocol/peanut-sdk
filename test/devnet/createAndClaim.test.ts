import peanut, { claimLink } from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { it, describe } from '@jest/globals'
import dotenv from 'dotenv'
import { setupDevnetEnvironment } from './setup'
import { formatEther } from 'ethersv5/lib/utils'
dotenv.config()

describe('create and claim links on devnet', function () {
	it('native token single link', async function () {
		const chainId = 1 // use a mainnet fork
		const { wallet1: walletSender, wallet2: walletRecipient } = await setupDevnetEnvironment(chainId)
		const amountToSend = 1.5 // Deposit 1.5 ETH in the link

		const senderBalanceBefore = await walletSender.getBalance()
		const { link } = await peanut.createLink({
			structSigner: {
				signer: walletSender,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount: amountToSend,
				tokenType: 0, // 0 for mative token links
				tokenAddress: ethers.constants.AddressZero,
				tokenDecimals: 18,
			},
		})
		const senderBalanceAfter = await walletSender.getBalance()
		const senderBalanceDiff = senderBalanceBefore.sub(senderBalanceAfter)

		// Using toBeCloseTo since there is some additional minor difference, which is gas
		expect(parseFloat(formatEther(senderBalanceDiff))).toBeCloseTo(amountToSend)

		const recipientBalanceBefore = await walletRecipient.getBalance()
		await claimLink({
			link,
			structSigner: {
				signer: walletRecipient,
			},
			recipient: walletRecipient.address,
		})
		const recipientBalanceAfter = await walletRecipient.getBalance()
		const recipientBalanceDiff = recipientBalanceAfter.sub(recipientBalanceBefore)

		// Using toBeCloseTo since there is some additional minor difference, which is gas
		expect(parseFloat(formatEther(recipientBalanceDiff))).toBeCloseTo(amountToSend)
	}, 60000)
})
