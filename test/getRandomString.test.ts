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
        expect(results.size).toBeCloseTo(1000, -2) // allow for a tiny margin due to randomness, but this is a simple heuristic
        // ensure that all have the same length
        for (const result of results) {
            expect(result).toHaveLength(10)
        }
    })

    // Uniqueness Test
    it('should produce unique strings on multiple invocations', () => {
        const results = new Set()
        for (let i = 0; i < 100; i++) {
            results.add(getRandomString(18))
        }
        expect(results.size).toBe(100)
    })
})
