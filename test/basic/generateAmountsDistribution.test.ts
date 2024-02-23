import { generateAmountsDistribution } from '../../src/raffle'
import { BigNumber } from 'ethersv5'

describe('Amounts Distribution Functionality', () => {
	test('should generate a distribution for 250 slots with a total of 125 Amount', async () => {
		const totalAmount = BigNumber.from(125000)
		const numberOfSlots = 250
		const distribution = generateAmountsDistribution(totalAmount, numberOfSlots)

		// Print out the amounts distribution
		console.log(
			'Amounts Distribution:',
			distribution.map((amount) => amount.toString())
		)

		// Rank by size
		const rankedDistribution = distribution.sort((a, b) => b.sub(a).toNumber())
		console.log(
			'Ranked Distribution:',
			rankedDistribution.map((amount) => amount.toString())
		)

		// Expectations
		expect(distribution.length).toBe(numberOfSlots)

		// Assert that the sum of the distribution equals the total amount
		const sumOfDistribution = distribution.reduce((acc, val) => acc.add(val), BigNumber.from(0))
		expect(sumOfDistribution.toString()).toBe(totalAmount.toString())

		// Optionally, print the sum for verification
		console.log('Sum of Distribution:', sumOfDistribution.toString())
	}, 30000)
})
