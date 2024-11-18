import { ethers } from 'ethersv5'
import peanut, { getLinkDetails, generateKeysFromString } from '../../src/index'
import { expect, describe, it } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe.skip('Playground Tests', () => {
	it('should verify link details and pubkey match', async () => {
		// Enable verbose logging
		peanut.toggleVerbose(true)

		const link = 'https://peanut.to/claim?c=8453&v=v4.3&i=10621&t=ui&p=dm0BZEd28fZJrWA2'
		const expectedPubKey = '0x5B14103ef7e92404963b88eE4603776e38a9d77D'
		const provider = await peanut.getDefaultProvider('8453') // Base mainnet

		// Get link parameters including password
		const params = peanut.getParamsFromLink(link)
		console.log('Link Parameters:', params)

		// Generate keys from password
		const keys = generateKeysFromString(params.password)
		console.log('Generated Keys:', {
			address: keys.address,
			privateKey: keys.privateKey.slice(0, 10) + '...', // Only show start of private key for security
		})

		// Verify the generated public key matches expected
		expect(keys.address.toLowerCase()).toBe(expectedPubKey.toLowerCase())

		// Get link details
		const details = await getLinkDetails({
			link,
			provider,
		})

		console.log('Link Details:', details)

		// Get the deposit from contract
		const contract = await peanut.getContract('8453', provider)
		const deposit = await contract.deposits(10621)
		console.log('Raw Deposit:', deposit)

		// Verify all addresses match
		expect(deposit.pubKey20.toLowerCase()).toBe(expectedPubKey.toLowerCase())
		expect(keys.address.toLowerCase()).toBe(expectedPubKey.toLowerCase())
	}, 60000) // 60 second timeout
})

describe.skip('Playground Tests', () => {
	// Previous test remains unchanged...

	it('should find deposit with specific pubkey', async () => {
		// Enable verbose logging
		peanut.toggleVerbose(true)

		const targetPubKey = '0xef1971f4a2824a908e027776a3d2f712511d00ac'
		const provider = await peanut.getDefaultProvider('8453') // Base mainnet
		const contract = await peanut.getContract('8453', provider)

		console.log('Searching for deposit with pubkey:', targetPubKey)

		// Get all deposits
		const deposits = await contract.getAllDeposits()
		console.log('Total number of deposits:', deposits.length)

		// Find matching deposits
		deposits.forEach((deposit, index) => {
			if (deposit.pubKey20.toLowerCase() === targetPubKey.toLowerCase()) {
				console.log('Found matching deposit at index:', index)
				console.log('Deposit details:', {
					index,
					pubKey20: deposit.pubKey20,
					amount: ethers.utils.formatEther(deposit.amount),
					tokenAddress: deposit.tokenAddress,
					contractType: deposit.contractType,
					claimed: deposit.claimed,
					timestamp: new Date(deposit.timestamp.toNumber() * 1000).toISOString(),
					senderAddress: deposit.senderAddress,
					recipient: deposit.recipient,
					reclaimableAfter: deposit.reclaimableAfter.toString(),
				})
			}
		})
	}, 120000) // 120 second timeout
})

describe('Multiple Link Password Tests', () => {
	const testLinks = [
		'legacy.peanut.to/claim?c=8453&v=v4.3&i=10621&p=nmtiJC8OqykVdzdOs&t=ui',
		'legacy.peanut.to/claim?c=8453&v=v4.3&i=10622&p=LUq7E8b3SyvwEF2sF&t=ui',
		'legacy.peanut.to/claim?c=8453&v=v4.3&i=10623&p=UvJIBcr8Y3lPU6GaV&t=ui',
		'legacy.peanut.to/claim?c=8453&v=v4.3&i=10624&p=JkuyFPPMVIDSUrvvs&t=ui',
	]

	it('should verify passwords match on-chain deposits', async () => {
		// Enable verbose logging
		peanut.toggleVerbose(true)
		const provider = await peanut.getDefaultProvider('8453') // Base mainnet
		const contract = await peanut.getContract('8453', provider)

		// Test each link
		for (const link of testLinks) {
			// Get link parameters including password
			const params = peanut.getParamsFromLink(`https://${link}`)
			console.log('\nTesting deposit:', params.depositIdx)

			// Generate keys from password
			const keys = generateKeysFromString(params.password)
			console.log('Generated address:', keys.address)

			// Get the deposit from contract
			const deposit = await contract.deposits(params.depositIdx)
			console.log('On-chain pubKey:', deposit.pubKey20)

			// Verify addresses match
			expect(keys.address.toLowerCase()).toBe(deposit.pubKey20.toLowerCase())
		}
	}, 120000) // 120 second timeout
})
