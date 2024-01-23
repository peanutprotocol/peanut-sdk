import { BigNumber, ethers } from 'ethersv5'
import peanut, { getSquidRouterUrl, signAndSubmitTx } from '../../src/index' // import directly from source code
import dotenv from 'dotenv'
import { describe, it } from '@jest/globals'
dotenv.config()

describe('Peanut XChain claiming tests', function () {
	it('Create a link and claim it cross-chain', async function () {
		peanut.toggleVerbose(true)
		const userPrivateKey = process.env.TEST_WALLET_X_CHAIN_USER!
		const relayerPrivateKey = process.env.TEST_WALLET_X_CHAIN_RELAYER!

		// Parameters that affect the test behaviour
		const sourceChainId = '137'
		const destinationChainId = '42161'
		const amountToTestWith = 0.1
		// if link is empty, a new one will be created
		let link = ''

		const sourceChainProvider = await peanut.getDefaultProvider(String(sourceChainId))

		const userSourceChainWallet = new ethers.Wallet(userPrivateKey, sourceChainProvider)
		const relayerSourceChainWallet = new ethers.Wallet(relayerPrivateKey, sourceChainProvider)

		console.log('Using wallets:', {
			user: userSourceChainWallet.address,
			relayer: relayerSourceChainWallet.address,
		})

		if (link) {
			console.log('Using an already existing link!', link)
		} else {
			const { link: createdLink } = await peanut.createLink({
				structSigner: {
					signer: userSourceChainWallet,
				},
				linkDetails: {
					chainId: sourceChainId,
					tokenAmount: amountToTestWith,
					tokenType: 0, // 0 is for native tokens
				},
				peanutContractVersion: 'v4.2',
			})
			link = createdLink
			console.log('Created a link on the source chain!', link)
		}

		const xchainClaimPayload = await peanut.createClaimXChainPayload({
			destinationChainId,
			destinationToken: '0x0000000000000000000000000000000000000000', // native token
			link,
			recipient: userSourceChainWallet.address,
			squidRouterUrl: getSquidRouterUrl(true, false),
			isMainnet: true,
		})
		console.log('Computed x chain claim payload', xchainClaimPayload)

		const xchainUnsignedTx = await peanut.populateXChainClaimTx({
			payload: xchainClaimPayload,
			provider: sourceChainProvider,
		})
		console.log('Computed x chain unsigned claim transaction', xchainUnsignedTx)

		const { tx, txHash } = await signAndSubmitTx({
			unsignedTx: xchainUnsignedTx,
			structSigner: {
				signer: relayerSourceChainWallet,
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

		// Wait until bridge execution
		for (let i = 0; i < 12; i++) {
			await new Promise((f) => setTimeout(f, 10000))
			const status = await getBridgeStatus()
			console.log('Status on axelarscan:', status)
			if (status == 'express_executed') {
				console.log('Woohooooooo!! Bridge successful! Gongrats my boiiiii you are the legend!')
				return
			}
		}

		// if the for loop didnt return
		throw new Error('Nooooooooo bridge failed :(( Go blame Alexey for being a bad coder and a bad man in general')
	}, 120000) // Increase the timeout if necessary
})
