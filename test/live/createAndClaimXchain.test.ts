import peanut from '../../src'
import { BigNumber, ethers } from 'ethersv5'

import * as utils from './test.utils'
import * as consts from './test.consts'

describe('Create and claim tests, xchain links', () => {
	it('Should create a native link on a random source chain and claim it on a random destination chain', async () => {
		peanut.toggleVerbose(true)
		const [sourceChainId, destinationChainId] = utils.getRandomDistinctValues(consts.xchainChains)
		console.log('sourceChainId', sourceChainId)
		console.log('destinationChainId', destinationChainId)

		const provider = await peanut.getDefaultProvider(String(sourceChainId))
		const userWallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY ?? '', provider)

		const recipientAddress = await userWallet.getAddress()
		const response = await peanut.createLink({
			linkDetails: {
				chainId: sourceChainId,
				tokenAmount: 0.0001,
				tokenType: 0,
			},
			structSigner: {
				signer: userWallet,
			},
		})
		if (response.link) {
			await utils.waitForTransaction(provider, response.txHash)
		}
		console.log('Link created: ' + response.link)

		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before claiming

		const result = await peanut.claimLinkXChainGasless({
			link: response.link,
			recipientAddress: recipientAddress,
			destinationChainId,
			APIKey: consts.PEANUT_DEV_API_KEY,
			isMainnet: true,
		})
		console.log('X-chain result!', { result })

		expect(result.txHash).toBeDefined()
	}, 120000)

	// Doing one manual claim test to make sure function works
	it('should create and claim an xchain link without using the API', async () => {
		const [sourceChainId, destinationChainId] = utils.getRandomDistinctValues(consts.xchainChains)
		console.log('sourceChainId', sourceChainId)
		console.log('destinationChainId', destinationChainId)
		peanut.toggleVerbose(true)

		const provider = await peanut.getDefaultProvider(String(sourceChainId))
		const wallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY ?? '', provider)
		const relayerWallet = new ethers.Wallet(consts.TEST_RELAYER_PRIVATE_KEY, provider) // remove this eoa, use the user wallet

		const recipientAddress = await wallet.getAddress()
		const response = await peanut.createLink({
			linkDetails: {
				chainId: sourceChainId,
				tokenAmount: 0.0001,
				tokenType: 0,
			},
			structSigner: {
				signer: wallet,
			},
		})
		if (response.link) {
			await utils.waitForTransaction(provider, response.txHash)
		}
		console.log('Link created: ' + response.link)
		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before claiming

		const xchainClaimPayload = await peanut.createClaimXChainPayload({
			destinationChainId,
			destinationToken: '0x0000000000000000000000000000000000000000',
			link: response.link,
			recipient: recipientAddress,
			squidRouterUrl: peanut.getSquidRouterUrl(true, false),
			isMainnet: true,
		})

		console.log('Computed x chain claim payload', xchainClaimPayload)

		const xchainUnsignedTx = await peanut.populateXChainClaimTx({
			payload: xchainClaimPayload,
			provider: provider,
		})
		console.log('Computed x chain unsigned claim transaction', xchainUnsignedTx)

		const { tx, txHash } = await peanut.signAndSubmitTx({
			unsignedTx: xchainUnsignedTx,
			structSigner: {
				signer: relayerWallet,
				gasLimit: BigNumber.from(1_500_000),
			},
		})
		console.log('Submitted a transaction to initiate an x-chain withdrawal with tx hash', txHash)
		await tx.wait()
		console.log('X-Chain withdrawal initiated!')

		const getBridgeStatus = async (): Promise<string> => {
			const response = await fetch('https://api.gmp.axelarscan.io', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					method: 'searchGMP',
					txHash: txHash,
				}),
			})
			try {
				const json = await response.json()
				const status = json.data[0]['status']
				return status
			} catch (e: any) {
				console.error('Got error while fetching bridging status', e)
				console.log('Axelarscan raw response', await response.text())
				throw e
			}
		}

		let status
		// Wait until bridge execution
		for (let i = 0; i < 12; i++) {
			await new Promise((f) => setTimeout(f, 10000))
			status = await getBridgeStatus()
			console.log('Status on axelarscan:', status)
			if (status == 'express_executed') {
				console.log('Woohooooooo!! Bridge successful! Gongrats my boiiiii you are the legend!')
				return
			}
		}
		expect(status).toBe('express_executed')
	}, 120000)
})
