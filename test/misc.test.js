import peanut from '@squirrel-labs/peanut-sdk';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageJson.version;

describe('Peanut SDK', function () {
	describe('version', function () {
		// get current version from package.json

		it('should return the current version', function () {
			expect(peanut.version).toBe(version);
			expect(peanut.VERSION).toBe(version);
		});
	});
});
