import { getRandomString } from '../src/index' // Update this import path to match your setup
import { expect, it, describe } from '@jest/globals'

describe('getRandomString', function () {
	// Basic Test
	it('should produce a string of the desired length', () => {
		const length = 18
		const result = getRandomString(length)
		expect(result).toHaveLength(length)
	})

	// Charset Test
	it('should produce a string containing only valid characters', () => {
		const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
		const result = getRandomString(1000) // test a long string to get a variety of characters
		for (const char of result) {
			expect(charset).toContain(char)
		}
	})

	// Randomness Test
	it('should produce different strings on multiple invocations', () => {
		const results = new Set()
		for (let i = 0; i < 1000; i++) {
			// invoke the function 1000 times
			results.add(getRandomString(10))
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
