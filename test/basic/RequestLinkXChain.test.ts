import { ethers } from 'ethersv5'
import peanut, { getDefaultProvider, getSquidRouterUrl, signAndSubmitTx } from '../../src/index' // import directly from source code
import dotenv from 'dotenv'
import { describe, it } from '@jest/globals'
import { BigNumber } from 'ethersv5'
import { EPeanutLinkType } from '../../src/consts/interfaces.consts'
dotenv.config()

describe('Peanut XChain request links fulfillment tests', function () {
	it('USDC on Optimism to USDT on Polygon', async function () {
		peanut.toggleVerbose(true)
		const userPrivateKey = process.env.TEST_WALLET_PRIVATE_KEY!

		// Parameters that affect the test behaviour
		const sourceChainId = '10' // Optimism
		const destinationChainId = '137' // Polygon
		const amountToTestWith = 0.1
		const tokenDecimals = 6
		const apiUrl = process.env.PEANUT_API_URL!
		const APIKey = process.env.PEANUT_DEV_API_KEY!
		const sourceChainProvider = await getDefaultProvider(sourceChainId)
		console.log('Source chain provider', sourceChainProvider)

		const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)

		const recipientAddress = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY2!).address
		const tokenAddress = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' // USDC on Optimism
		const destinationToken = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // USDT on Polygon
		const { link } = await peanut.createRequestLink({
			chainId: destinationChainId,
			tokenAddress: destinationToken,
			tokenAmount: amountToTestWith.toString(),
			tokenType: EPeanutLinkType.erc20,
			tokenDecimals: tokenDecimals.toString(),
			recipientAddress,
			APIKey,
			apiUrl,
		})
		console.log('Created a request link on the source chain!', link)

		const linkDetails = await peanut.getRequestLinkDetails({
			link,
			APIKey,
			apiUrl,
		})
		console.log('Got the link details!', linkDetails)

		const xchainUnsignedTxs = await peanut.prepareXchainRequestFulfillmentTransaction({
			fromChainId: sourceChainId,
			senderAddress: userSourceChainWallet.address,
			fromToken: tokenAddress,
			link,
			squidRouterUrl: getSquidRouterUrl(true, false),
			provider: sourceChainProvider,
			fromTokenDecimals: 6,
			tokenType: EPeanutLinkType.erc20,
			apiUrl,
			APIKey,
		})
		console.log('Computed x chain unsigned fulfillment transactions', xchainUnsignedTxs)

		for (const unsignedTx of xchainUnsignedTxs.unsignedTxs) {
			const { tx, txHash } = await signAndSubmitTx({
				unsignedTx,
				structSigner: {
					signer: userSourceChainWallet,
					gasLimit: BigNumber.from(2_000_000),
				},
			})

			console.log('Submitted a transaction to fulfill the request link with tx hash', txHash)
			await tx.wait()
			console.log('Request link fulfillment initiated!')
		}

		const finalBalance = await peanut.getTokenBalance({
			tokenAddress: destinationToken,
			walletAddress: recipientAddress,
			chainId: destinationChainId,
		})
		console.log('Final balance of recipient:', finalBalance)
		// expect(finalBalance).toBe((Number(initialBalance) + amountToTestWith).toString())
	}, 120000)

	it('ETH on Optimism to ETH on Arbitrum', async function () {
		peanut.toggleVerbose(true)
		const userPrivateKey = process.env.TEST_WALLET_X_CHAIN_USER!

		// Parameters that affect the test behaviour
		const sourceChainId = '10' // Optimism
		const destinationChainId = '42161' // Arbitrum
		const amountToTestWith = 0.0001
		const tokenDecimals = '18'
		const apiUrl = process.env.PEANUT_API_URL!
		const APIKey = process.env.PEANUT_DEV_API_KEY!
		const sourceChainProvider = await getDefaultProvider(sourceChainId)
		console.log('Source chain provider', sourceChainProvider)

		const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)

		const recipientAddress = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY2!).address
		const tokenAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' // ETH on Optimism
		const destinationToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' // ETH on Arbitrum

		const { link } = await peanut.createRequestLink({
			chainId: destinationChainId,
			tokenAddress: destinationToken,
			tokenAmount: amountToTestWith.toString(),
			tokenType: EPeanutLinkType.native,
			tokenDecimals,
			recipientAddress,
			APIKey,
			apiUrl,
		})
		console.log('Created a request link on the source chain!', link)

		const linkDetails = await peanut.getRequestLinkDetails({
			link,
			APIKey,
			apiUrl,
		})
		console.log('Got the link details!', linkDetails)

		const xchainUnsignedTxs = await peanut.prepareXchainRequestFulfillmentTransaction({
			fromChainId: sourceChainId,
			senderAddress: userSourceChainWallet.address,
			fromToken: tokenAddress,
			link,
			squidRouterUrl: getSquidRouterUrl(true, false),
			provider: sourceChainProvider,
			tokenType: EPeanutLinkType.native,
			fromTokenDecimals: 18,
			apiUrl,
			APIKey,
		})
		console.log('Computed x chain unsigned fulfillment transactions', xchainUnsignedTxs)

		for (const unsignedTx of xchainUnsignedTxs.unsignedTxs) {
			const { tx, txHash } = await signAndSubmitTx({
				unsignedTx,
				structSigner: {
					signer: userSourceChainWallet,
					gasLimit: BigNumber.from(2_000_000),
				},
			})

			console.log('Submitted a transaction to fulfill the request link with tx hash', txHash)
			await tx.wait()
			console.log('Request link fulfillment initiated!')
		}
	}, 120000)

	it('ETH on Optimism to USDC on Optimism', async function () {
		peanut.toggleVerbose(true)
		const userPrivateKey = process.env.TEST_WALLET_X_CHAIN_USER!

		// Parameters that affect the test behaviour
		const sourceChainId = '10' // Arbitrum
		const destinationChainId = '10' // Optimism
		const amountToTestWith = 0.1
		// const tokenDecimals = '18'
		const apiUrl = process.env.PEANUT_API_URL!
		const APIKey = process.env.PEANUT_DEV_API_KEY!
		const sourceChainProvider = await getDefaultProvider(sourceChainId)
		console.log('Source chain provider', sourceChainProvider)

		const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)

		const recipientAddress = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY2!).address
		const tokenAddress = '0x0000000000000000000000000000000000000000' // ETH on Optimism
		const destinationToken = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' // USDC on Optimism

		const { link } = await peanut.createRequestLink({
			chainId: destinationChainId,
			tokenAddress: destinationToken,
			tokenAmount: amountToTestWith.toString(),
			tokenType: EPeanutLinkType.erc20,
			tokenDecimals: '6',
			recipientAddress,
			APIKey,
			apiUrl,
		})
		console.log('Created a request link on the source chain!', link)

		const linkDetails = await peanut.getRequestLinkDetails({
			link,
			APIKey,
			apiUrl,
		})
		console.log('Got the link details!', linkDetails)

		const xchainUnsignedTxs = await peanut.prepareXchainRequestFulfillmentTransaction({
			fromChainId: sourceChainId,
			senderAddress: userSourceChainWallet.address,
			fromToken: tokenAddress,
			link,
			squidRouterUrl: getSquidRouterUrl(true, false),
			provider: sourceChainProvider,
			tokenType: EPeanutLinkType.native,
			fromTokenDecimals: 18,
			apiUrl,
			APIKey,
		})
		console.log('Computed x chain unsigned fulfillment transactions', xchainUnsignedTxs)

		for (const unsignedTx of xchainUnsignedTxs.unsignedTxs) {
			const { tx, txHash } = await signAndSubmitTx({
				unsignedTx,
				structSigner: {
					signer: userSourceChainWallet,
					gasLimit: BigNumber.from(2_000_000),
				},
			})

			console.log('Submitted a transaction to fulfill the request link with tx hash', txHash)
			await tx.wait()
			console.log('Request link fulfillment initiated!')
		}
	}, 120000)
})
