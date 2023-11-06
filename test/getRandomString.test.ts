import { peanut } from '../src/index' // Update this import path to match your setup
import { expect, it, describe } from '@jest/globals'

peanut.toggleVerbose()

describe('peanut.getRandomString', function () {
	// Basic Test
	it('should produce a string of the desired length', async () => {
		const length = 18
		const result = await peanut.getRandomString(length)
		expect(result).toHaveLength(length)
	})
	// Length Test
	it('should produce strings of lengths from 1 to 64', async () => {
		for (let length = 1; length <= 64; length++) {
			const result = await peanut.getRandomString(length)
			expect(result).toHaveLength(length)
		}
	})

	// Charset Test
	it('should produce a string containing only valid characters', async () => {
		const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
		const result = await peanut.getRandomString(1000) // test a long string to get a variety of characters
		for (const char of result) {
			expect(charset).toContain(char)
		}
	})

	// Randomness Test
	it('should produce different strings on multiple invocations', async () => {
		const results = new Set()
		for (let i = 0; i < 1000; i++) {
			// invoke the function 1000 times
			results.add(await peanut.getRandomString(10))
		}
		expect(results.size).toBe(1000)
		// ensure that all have the same length
		for (const result of results) {
			expect(result).toHaveLength(10)
		}

		// ensure that all are unique
		// this could technically fail lol
		const resultsArray = Array.from(results)
		for (let i = 0; i < resultsArray.length; i++) {
			for (let j = i + 1; j < resultsArray.length; j++) {
				expect(resultsArray[i]).not.toEqual(resultsArray[j])
			}
		}
	})
})
