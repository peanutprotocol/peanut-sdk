import { normalizeUrl } from '../../src/util'

describe('util', () => {
	describe('normalizeUrl', () => {
		it.each([
			['https://example.com/', 'https://example.com/'],
			['https://example.com/foo', 'https://example.com/foo'],
			['https://example.com//foo', 'https://example.com/foo'],
			['https://example.com//foo/bar', 'https://example.com/foo/bar'],
			['https://example.com/foo//bar/', 'https://example.com/foo/bar/'],
		])('should normalize %s to %s', (url, normalizedUrl) => {
			expect(normalizeUrl(url)).toBe(normalizedUrl)
		})
	})
})
