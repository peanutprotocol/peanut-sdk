import { claimLink, createLink, getDefaultProvider, prepareClaimTx, setFeeOptions, toggleVerbose } from '../../src'
import { ethers } from 'ethersv5'

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY

describe('claimLink', () => {
	toggleVerbose()

	test.skip('claim a link', async () => {
		const chainId = '137'
		const Provider = await getDefaultProvider(chainId)
		const Wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', Provider)

		const link = await createLink({
			linkDetails: {
				chainId: chainId,
				tokenAmount: 0.001,
				tokenDecimals: 18,
				tokenType: 0,
			},
			structSigner: {
				signer: Wallet,
			},
		})

		console.log({ link })

		const claimedLink = await claimLink({
			link: link.link,
			structSigner: {
				signer: Wallet,
			},
		})

		console.log({ claimedLink })
	}, 100000000)

	test.only('claim a link with prepareClaimTx', async () => {
		const chainId = '137'
		const Provider = await getDefaultProvider(chainId)
		const Wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', Provider)

		const link = await createLink({
			linkDetails: {
				chainId: chainId,
				tokenAmount: 0.001,
				tokenDecimals: 18,
				tokenType: 0,
			},
			structSigner: {
				signer: Wallet,
			},
		})

		console.log({ link })

		const preparedClaimTx = await prepareClaimTx({
			link: link.link,
			recipientAddress: Wallet.address,
			provider: Provider,
		})

		console.log(preparedClaimTx)

		const feeOptions = setFeeOptions({
			provider: Wallet.provider,
			chainId: chainId,
		})

		const tx = { ...preparedClaimTx, ...feeOptions }

		console.log({ tx })

		const sentTx = await Wallet.sendTransaction({
			to: tx.to ? tx.to : undefined,
			data: tx.data ? tx.data : undefined,
		})

		console.log('submitted tx: ', sentTx.hash, ' now waiting for receipt...')
		const txReceipt = await sentTx.wait()
		console.log(txReceipt)
	}, 100000000)
})
