import { normalizePath } from '../../src/util'

describe('util', () => {
	describe('normalizePath', () => {
		it.each([
			['https://example.com/', 'https://example.com/'],
			['https://example.com/foo', 'https://example.com/foo'],
			['https://example.com//foo', 'https://example.com/foo'],
			['https://example.com//foo/bar', 'https://example.com/foo/bar'],
			['https://example.com/foo//bar/', 'https://example.com/foo/bar/'],
			['/api/v1/foo//bar/', '/api/v1/foo/bar/'],
			['//api/v1/foo//bar//', '/api/v1/foo/bar/'],
		])('should normalize %s to %s', (url, normalizedUrl) => {
			expect(normalizePath(url)).toBe(normalizedUrl)
		})
	})
})
