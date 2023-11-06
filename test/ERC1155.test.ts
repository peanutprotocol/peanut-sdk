import peanut from '../src/index'
import { ethers } from 'ethersv5'
import { expect, describe, it } from '@jest/globals'
import * as interfaces from '../src/consts/interfaces.consts'
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY ?? ''

async function createAndClaimLink(options: interfaces.ICreateLinkParams, inbetweenDelay = 1000) {
	const response = await peanut.createLink(options)
	if (response.link) {
		await waitForTransaction(options.structSigner.signer.provider, response.txHash)
	}
	console.log('Link created: ' + response.link)
	await new Promise((res) => setTimeout(res, inbetweenDelay)) // Wait for 1 second before claiming
	return peanut.claimLink({
		structSigner: {
			signer: options.structSigner.signer,
		},
		link: response.link,
	})
}

async function waitForTransaction(provider, txHash, timeout = 60000) {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		const receipt = await provider.getTransactionReceipt(txHash) // v5/v6?
		if (receipt && receipt.blockNumber) {
			return receipt
		}
		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before retrying
	}

	throw new Error('Transaction was not confirmed within the timeout period.')
}

describe('ERC1155 on polygon-zkevm-testnet', function () {
	it('should create a native link and claim it', async function () {
		peanut.toggleVerbose()
		const CHAIN_ID = 1442
		const provider = await peanut.getDefaultProvider(String(CHAIN_ID))
		const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)
		await createAndClaimLink(
			{
				structSigner: {
					signer: wallet,
				},
				linkDetails: {
					chainId: CHAIN_ID,
					tokenAmount: 1,
					tokenType: 3,
					tokenAddress: '0x897F8EDdB345F0d16081615823F76055Ad60A00c',
					tokenId: 1,
				},
			},
			9000
		)
	}, 60000)

	it('should create a link and claim it through the peanut API', async function () {
		peanut.toggleVerbose()
		const CHAIN_ID = 1442
		const provider = await peanut.getDefaultProvider(String(CHAIN_ID))
		const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)
		const response = await peanut.createLink({
			structSigner: {
				signer: wallet,
			},
			linkDetails: {
				chainId: CHAIN_ID,
				tokenAmount: 1,
				tokenType: 3,
				tokenAddress: '0x897F8EDdB345F0d16081615823F76055Ad60A00c',
				tokenId: 1,
			},
		})

		if (response.link) {
			await waitForTransaction(wallet.provider, response.txHash)
		}
		console.log('Link created: ' + response.link)
		await new Promise((res) => setTimeout(res, 9000)) // Wait for 9 seconds before claiming

		const apiToken = process.env.PEANUT_DEV_API_KEY ?? ''
		const API_URL = 'http://api.peanut.to/claim'
		const res = await peanut.claimLinkGasless({
			link: response.link,
			recipientAddress: wallet.address,
			APIKey: apiToken,
			baseUrl: API_URL,
		})

		expect(res.status).toBe('success')
		console.log('claim link response', res.data)
	}, 60000)
})
