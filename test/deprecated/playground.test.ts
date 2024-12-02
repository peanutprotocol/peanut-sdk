import { ethers } from 'ethersv5'
import peanut, { getLinkDetails, generateKeysFromString, getTxReceiptFromHash } from '../../src/index'
import { expect, describe, it } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('Playground Tests', () => {
	// Previous test remains unchanged...

	it('should fetch transaction receipt from hash', async () => {
		// Enable verbose logging
		peanut.toggleVerbose(true)

		const txHash = '0xf73a0ae1a5119ac211f1f0f5244d223f57d4333d0ad155569ca55147538cbc83'
		const chainId = '1' // Ethereum mainnet
		// const provider = await peanut.getDefaultProvider(chainId)
		const provider = new ethers.providers.JsonRpcProvider(
			`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
		)

		const receipt = await getTxReceiptFromHash(txHash, '1', provider)
		console.log('Transaction Receipt:', {
			blockNumber: receipt.blockNumber,
			transactionHash: receipt.transactionHash,
			status: receipt.status,
			from: receipt.from,
			to: receipt.to,
			gasUsed: receipt.gasUsed.toString(),
		})

		expect(receipt).toBeTruthy()
		expect(receipt.transactionHash.toLowerCase()).toBe(txHash.toLowerCase())
	}, 60000) // 60 second timeout
})
