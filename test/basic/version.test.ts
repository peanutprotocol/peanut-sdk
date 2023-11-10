import peanut from '../../src/index'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
dotenv.config()
const directName = dirname(__filename)

const packagePath = join(directName, '../../package.json')
console.log(packagePath)
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
const version = packageJson.version

describe('Peanut SDK', function () {
	describe('version', function () {
		// get current version from package.json

		it('should return the current version', function () {
			expect(peanut.VERSION).toBe(version)
		})
	})
})
