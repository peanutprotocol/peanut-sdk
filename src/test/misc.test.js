import peanut from '../index'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __dirname = dirname(__filename)

const packagePath = join(__dirname, '../package.json')
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
const version = packageJson.version

describe('Peanut SDK', function () {
	describe('version', function () {
		// get current version from package.json

		it('should return the current version', function () {
			expect(peanut.VERSION).toBe(version)
			expect(peanut.version).toBe(version)
		})
	})
})
