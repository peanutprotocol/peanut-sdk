import peanut from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('Number Formatting Tests', function () {
	// Fuzzer utility for generating random numbers with scientific notation
	function generateRandomScientificNumber() {
		const base = Math.random() * 10
		const exponent = Math.floor(Math.random() * 21) - 10 // Random exponent between -10 and 10
		return base * Math.pow(10, exponent)
	}

	it('should format number without scientific notation', () => {
		for (let i = 0; i < 100; i++) {
			// Test 100 times with different random numbers
			const num = generateRandomScientificNumber()
			const result = peanut.formatNumberAvoidScientific(num)
			expect(result.includes('e')).toBeFalsy()
			expect(result.includes('E')).toBeFalsy()
		}
	})

	it('should trim decimal overflow and be compatible with ethers BigNumber', () => {
		const decimals = Math.floor(Math.random() * 10) + 1 // Random decimals between 6 and 18

		for (let i = 0; i < 100; i++) {
			// Test 100 times
			const num = generateRandomScientificNumber()
			const result = peanut.trim_decimal_overflow(num, decimals)

			// Check if the result after trimming is equivalent to 0; if so, skip the iteration
			if (parseFloat(result) === 0) continue

			// Ensure that after trimming, the result doesn't have more decimals than specified
			const parts = result.split('.')
			if (parts.length > 1) {
				expect(parts[1].length).toBeLessThanOrEqual(decimals)
			}

			// Ensure compatibility with ethers BigNumber
			const bigNumber = ethers.utils.parseUnits(result, decimals)
			expect(bigNumber.gt(0)).toBeTruthy()
		}
	})
})
