import { ethers } from 'ethersv5'
import peanut, { getDefaultProvider, getSquidRouterUrl, signAndSubmitTx } from '../../src/index' // import directly from source code
import dotenv from 'dotenv'
import { describe, it } from '@jest/globals'
import { BigNumber } from 'ethersv5'
import { EPeanutLinkType } from '../../src/consts/interfaces.consts'
dotenv.config()

const retry = async (assertion: () => Promise<void>, { times = 3, interval = 100 } = {}) => {
	for (let i = 0; i < times; i++) {
		try {
			await assertion()
			return
		} catch (err) {
			if (i === times - 1) throw err
			await new Promise((resolve) => setTimeout(resolve, interval))
		}
	}
}

describe('Peanut XChain request links fulfillment tests', function () {
	it.each([
		{
			amount: '0.1',
			sourceToken: {
				chain: '10',
				address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC on Optimism
				decimals: 6,
				name: 'USDC on Optimism',
				type: EPeanutLinkType.erc20,
			},
			destinationToken: {
				chain: '137',
				address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
				decimals: 6,
				name: 'USDT on Polygon',
				type: EPeanutLinkType.erc20,
			},
		},
		{
			amount: '0.0001',
			sourceToken: {
				chain: '10',
				address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH on Optimism
				decimals: 18,
				name: 'ETH on Optimism',
				type: EPeanutLinkType.native,
			},
			destinationToken: {
				chain: '42161',
				address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH on Arbitrum
				decimals: 18,
				name: 'ETH on Arbitrum',
				type: EPeanutLinkType.native,
			},
		},
		{
			amount: '0.1',
			sourceToken: {
				chain: '10',
				address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH on Optimism
				decimals: 18,
				name: 'ETH on Optimism',
				type: EPeanutLinkType.native,
			},
			destinationToken: {
				chain: '10',
				address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC on Optimism
				decimals: 6,
				name: 'USDC on Optimism',
				type: EPeanutLinkType.erc20,
			},
		},
	])(
		'$sourceToken.name to $destinationToken.name',
		async ({ amount, sourceToken, destinationToken }) => {
			peanut.toggleVerbose(true)
			const userPrivateKey = process.env.TEST_WALLET_PRIVATE_KEY!

			// Parameters that affect the test behaviour
			const apiUrl = process.env.PEANUT_API_URL!
			const APIKey = process.env.PEANUT_DEV_API_KEY!
			const sourceChainProvider = await getDefaultProvider(sourceToken.chain)
			console.log('Source chain provider', sourceChainProvider)

			const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)

			const recipientAddress = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY2!).address
			const initialBalance = await peanut.getTokenBalance({
				tokenAddress: destinationToken.address,
				walletAddress: recipientAddress,
				chainId: destinationToken.chain,
			})
			console.log('Initial balance of recipient:', initialBalance)

			const { link } = await peanut.createRequestLink({
				chainId: destinationToken.chain,
				tokenAddress: destinationToken.address,
				tokenAmount: amount,
				tokenType: destinationToken.type,
				tokenDecimals: destinationToken.decimals.toString(),
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
				fromChainId: sourceToken.chain,
				senderAddress: userSourceChainWallet.address,
				fromToken: sourceToken.address,
				squidRouterUrl: getSquidRouterUrl(true, false),
				provider: sourceChainProvider,
				tokenType: sourceToken.type,
				fromTokenDecimals: sourceToken.decimals,
				linkDetails,
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
			// how many digits to check for equality after the decimal point
			const numDigits = Math.floor(Math.log10(1 / Number(amount))) + 1
			const expectedBalance = Number(initialBalance) + Number(amount)

			await retry(
				async () => {
					const finalBalance = await peanut.getTokenBalance({
						tokenAddress: destinationToken.address,
						walletAddress: recipientAddress,
						chainId: destinationToken.chain,
					})
					console.log(
						`Final balance of recipient: ${finalBalance}, expected: ${expectedBalance}, with tolerance: ${numDigits}`
					)
					expect(Number(finalBalance)).toBeCloseTo(expectedBalance, numDigits)
				},
				{ times: 15, interval: 2000 }
			) // retry for up to 30 seconds
		},
		120000
	)

	it('should fetch link details when not provided', async () => {
		const amount = '0.1'
		const sourceToken = {
			chain: '10',
			address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC on Optimism
			decimals: 6,
			name: 'USDC on Optimism',
			type: EPeanutLinkType.erc20,
		}
		const destinationToken = {
			chain: '137',
			address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
			decimals: 6,
			name: 'DAI on Polygon',
			type: EPeanutLinkType.erc20,
		}
		peanut.toggleVerbose(true)
		const userPrivateKey = process.env.TEST_WALLET_PRIVATE_KEY!

		// Parameters that affect the test behaviour
		const apiUrl = process.env.PEANUT_API_URL!
		const APIKey = process.env.PEANUT_DEV_API_KEY!
		const sourceChainProvider = await getDefaultProvider(sourceToken.chain)
		console.log('Source chain provider', sourceChainProvider)

		const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)

		const recipientAddress = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY2!).address
		const initialBalance = await peanut.getTokenBalance({
			tokenAddress: destinationToken.address,
			walletAddress: recipientAddress,
			chainId: destinationToken.chain,
		})
		console.log('Initial balance of recipient:', initialBalance)

		const { link } = await peanut.createRequestLink({
			chainId: destinationToken.chain,
			tokenAddress: destinationToken.address,
			tokenAmount: amount,
			tokenType: destinationToken.type,
			tokenDecimals: destinationToken.decimals.toString(),
			recipientAddress,
			APIKey,
			apiUrl,
		})
		console.log('Created a request link on the source chain!', link)

		const xchainUnsignedTxs = await peanut.prepareXchainRequestFulfillmentTransaction({
			fromChainId: sourceToken.chain,
			senderAddress: userSourceChainWallet.address,
			fromToken: sourceToken.address,
			squidRouterUrl: getSquidRouterUrl(true, false),
			provider: sourceChainProvider,
			tokenType: sourceToken.type,
			fromTokenDecimals: sourceToken.decimals,
			link,
			APIKey,
			apiUrl,
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
		// how many digits to check for equality after the decimal point
		const numDigits = Math.floor(Math.log10(1 / Number(amount))) + 1
		const expectedBalance = Number(initialBalance) + Number(amount)

		await retry(
			async () => {
				const finalBalance = await peanut.getTokenBalance({
					tokenAddress: destinationToken.address,
					walletAddress: recipientAddress,
					chainId: destinationToken.chain,
				})
				console.log(
					`Final balance of recipient: ${finalBalance}, expected: ${expectedBalance}, with tolerance: ${numDigits}`
				)
				expect(Number(finalBalance)).toBeCloseTo(expectedBalance, numDigits)
			},
			{ times: 15, interval: 2000 }
		) // retry for up to 30 seconds
	}, 120000)
})
