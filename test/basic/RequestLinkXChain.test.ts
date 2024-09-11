import { ethers } from 'ethersv5'
import peanut, { getDefaultProvider, getSquidRouterUrl, signAndSubmitTx } from '../../src/index' // import directly from source code
import dotenv from 'dotenv'
import { describe, it } from '@jest/globals'
import { BigNumber } from 'ethersv5'
import { EPeanutLinkType } from '../../src/consts/interfaces.consts'
dotenv.config()

describe('Peanut XChain request links fulfillment tests', function () {
	describe('Peanut XChain request link fulfillment tests', function () {
		it('Create a request link and fulfill it cross-chain', async function () {
			peanut.toggleVerbose(true)
			const userPrivateKey = process.env.TEST_WALLET_X_CHAIN_USER!
			// const relayerPrivateKey = process.env.TEST_WALLET_X_CHAIN_RELAYER!

			// Parameters that affect the test behaviour
			const sourceChainId = '10' // Optimism
			const destinationChainId = '137' // Polygon
			const amountToTestWith = 0.1
			const tokenDecimals = 6
			const APIKey = process.env.PEANUT_DEV_API_KEY!
			const sourceChainProvider = await getDefaultProvider(sourceChainId)
			console.log('Source chain provider', sourceChainProvider)

			const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)

			const recipientAddress = '0x42A5DC31169Da17639468e7Ffa271e90Fdb5e85A'
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
				apiUrl: 'https://staging.peanut.to/api/proxy/withFormData',
			})
			console.log('Created a request link on the source chain!', link)

			const linkDetails = await peanut.getRequestLinkDetails({
				link,
				APIKey,
				apiUrl: 'https://staging.peanut.to/api/proxy/get',
			})
			console.log('Got the link details!', linkDetails)

			const xchainUnsignedTxs = await peanut.prepareXchainRequestFulfillmentTransaction({
				fromChainId: sourceChainId,
				senderAddress: userSourceChainWallet.address,
				recipientAddress: linkDetails.recipientAddress as string,
				fromToken: tokenAddress,
				destinationChainId,
				destinationToken,
				fromAmount: amountToTestWith.toString(),
				link,
				squidRouterUrl: getSquidRouterUrl(true, false),
				provider: sourceChainProvider,
				apiUrl: 'https://staging.peanut.to/api/proxy/get',
				fromTokenDecimals: 6,
				tokenType: EPeanutLinkType.erc20,
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

		it('Create a request link and fulfill it cross-chain native token', async function () {
			peanut.toggleVerbose(true)
			const userPrivateKey = process.env.TEST_WALLET_X_CHAIN_USER!
			// const relayerPrivateKey = process.env.TEST_WALLET_X_CHAIN_RELAYER!

			// Parameters that affect the test behaviour
			const sourceChainId = '10' // Optimism
			const destinationChainId = '42161' // Arbitrum
			const amountToTestWith = 0.0001
			const tokenDecimals = '18'
			const APIKey = process.env.PEANUT_DEV_API_KEY!
			const sourceChainProvider = await getDefaultProvider(sourceChainId)
			console.log('Source chain provider', sourceChainProvider)

			const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)

			const recipientAddress = '0x42A5DC31169Da17639468e7Ffa271e90Fdb5e85A'
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
				apiUrl: 'https://staging.peanut.to/api/proxy/withFormData',
			})
			console.log('Created a request link on the source chain!', link)

			const linkDetails = await peanut.getRequestLinkDetails({
				link,
				APIKey,
				apiUrl: 'https://staging.peanut.to/api/proxy/get',
			})
			console.log('Got the link details!', linkDetails)

			const xchainUnsignedTxs = await peanut.prepareXchainRequestFulfillmentTransaction({
				fromChainId: sourceChainId,
				senderAddress: userSourceChainWallet.address,
				recipientAddress: linkDetails.recipientAddress as string,
				fromToken: tokenAddress,
				destinationChainId,
				destinationToken,
				fromAmount: amountToTestWith.toString(),
				link,
				squidRouterUrl: getSquidRouterUrl(true, false),
				provider: sourceChainProvider,
				apiUrl: 'https://staging.peanut.to/api/proxy/get',
				tokenType: EPeanutLinkType.native,
				fromTokenDecimals: 18,
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

		it('Create a request link and fulfill it cross-chain native token', async function () {
			peanut.toggleVerbose(true)
			const userPrivateKey = process.env.TEST_WALLET_X_CHAIN_USER!
			// const relayerPrivateKey = process.env.TEST_WALLET_X_CHAIN_RELAYER!

			// Parameters that affect the test behaviour
			const sourceChainId = '10' // Arbitrum
			const destinationChainId = '10' // Optimism
			const amountToTestWith = 0.1
			// const tokenDecimals = '18'
			const APIKey = process.env.PEANUT_DEV_API_KEY!
			const sourceChainProvider = await getDefaultProvider(sourceChainId)
			console.log('Source chain provider', sourceChainProvider)

			const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)

			const recipientAddress = '0x42A5DC31169Da17639468e7Ffa271e90Fdb5e85A'
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
				apiUrl: 'https://staging.peanut.to/api/proxy/withFormData',
			})
			console.log('Created a request link on the source chain!', link)

			const linkDetails = await peanut.getRequestLinkDetails({
				link,
				APIKey,
				apiUrl: 'https://staging.peanut.to/api/proxy/get',
			})
			console.log('Got the link details!', linkDetails)

			const xchainUnsignedTxs = await peanut.prepareXchainRequestFulfillmentTransaction({
				fromChainId: sourceChainId,
				senderAddress: userSourceChainWallet.address,
				recipientAddress: linkDetails.recipientAddress as string,
				fromToken: tokenAddress,
				destinationChainId,
				destinationToken,
				fromAmount: '0.000001',
				link,
				squidRouterUrl: getSquidRouterUrl(true, false),
				provider: sourceChainProvider,
				apiUrl: 'https://staging.peanut.to/api/proxy/get',
				tokenType: EPeanutLinkType.native,
				fromTokenDecimals: 18,
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
})
