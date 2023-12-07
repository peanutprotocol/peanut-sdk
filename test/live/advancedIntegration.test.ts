import peanut, { interfaces } from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import dotenv from 'dotenv'
// import fetch from 'node-fetch'

dotenv.config()

describe('Advanced Integration Tests', () => {
	const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY

	it('should create a link using the advanced methods (prepareTxs, signAndSubmitTx, getLinkFromHash) on goerli', async () => {
		const linkDetails = {
			chainId: 5,
			tokenAmount: 0.0001,

			tokenAddress: ethers.constants.AddressZero,
		}

		const passwords = [await peanut.getRandomString(16)]

		const goerliProvider = await peanut.getDefaultProvider(String(linkDetails.chainId))
		const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', goerliProvider)

		const prepareTxsResponse = await peanut.prepareTxs({
			linkDetails: linkDetails,
			address: goerliWallet.address ?? '',
			passwords: passwords,
		})

		console.log('prepareTxsResponse', prepareTxsResponse)

		const signedTxsResponse: interfaces.ISignAndSubmitTxResponse[] = []

		for (const tx of prepareTxsResponse.unsignedTxs) {
			const x = await peanut.signAndSubmitTx({
				structSigner: {
					signer: goerliWallet,
				},
				unsignedTx: tx,
			})

			await x.tx.wait()
			signedTxsResponse.push(x)
		}

		const getLinksFromTxResponse = await peanut.getLinksFromTx({
			linkDetails,
			txHash: signedTxsResponse[signedTxsResponse.length - 1].txHash,
			passwords: passwords,
		})

		console.log(getLinksFromTxResponse)
	}, 1000000)

	it.only('should create a link using the advanced methods (prepareTxs, signAndSubmitTx, getLinkFromHash) on polygon', async () => {
		const linkDetails = {
			chainId: 137,
			tokenAmount: 1,
			tokenAddress: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
		}

		const passwords = [await peanut.getRandomString(16)]

		const polygonProvider = await peanut.getDefaultProvider(String(linkDetails.chainId))
		const polygonWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', polygonProvider)

		const prepareTxsResponse = await peanut.prepareTxs({
			linkDetails: linkDetails,
			address: polygonWallet.address ?? '',
			passwords: passwords,
		})

		console.log('prepareTxsResponse', prepareTxsResponse)

		const signedTxsResponse: interfaces.ISignAndSubmitTxResponse[] = []

		for (const tx of prepareTxsResponse.unsignedTxs) {
			const x = await peanut.signAndSubmitTx({
				structSigner: {
					signer: polygonWallet,
				},
				unsignedTx: tx,
			})

			await x.tx.wait()
			console.log('tx submitted: ', x.tx)
			signedTxsResponse.push(x)
		}

		const getLinksFromTxResponse = await peanut.getLinksFromTx({
			linkDetails,
			txHash: signedTxsResponse[signedTxsResponse.length - 1].txHash,
			passwords: passwords,
		})

		console.log(getLinksFromTxResponse)
	}, 1000000)
})
