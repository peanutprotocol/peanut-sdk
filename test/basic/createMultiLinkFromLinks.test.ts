import peanut from '../../src/index'

describe('Multilink tests: creating multilink with links', () => {
	it('Should generate a shortened multilink with one slot', () => {
		const x = [
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=29#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=30#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=31#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=32#p=12345678',
		]

		const multilink = peanut.createMultiLinkFromLinks(x)

		expect(multilink).toBe('https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5)#p=12345678')
	})

	it('Should generate a shortened multilink with multiple slots (three) on one chain', () => {
		const x = [
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=29#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=30#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=31#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=32#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=50#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=51#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=52#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=55#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=56#p=12345678',
		]

		const multilink = peanut.createMultiLinkFromLinks(x)

		expect(multilink).toBe('https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5),(50,3),(55,2)#p=12345678')
	})
	it('Should generate a shortened multilink with multiple chains and one slot per chain ', () => {
		const x = [
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28#p=12345678',
			'https://peanut.to/claim?c=10&v=v4.2&i=31#p=12345678',
			'https://peanut.to/claim?c=137&v=v4.2&i=44#p=12345678',
		]

		const multilink = peanut.createMultiLinkFromLinks(x)

		expect(multilink).toBe('https://peanut.to/claim?c=11155111,10,137&v=v4.2&i=(28,1),(31,1),(44,1)#p=12345678')
	})
})

describe('Multilink tests: getting links from multilink', () => {
	it('Should return an array of links from a shortened multilink', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5)#p=12345678'

		const x = peanut.getLinksFromMultilink(multilink)

		expect(x).toStrictEqual([
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=29#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=30#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=31#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=32#p=12345678',
		])
	})

	it('Should return an array of links from a normal multilink', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32#p=12345678'

		const x = peanut.getLinksFromMultilink(multilink)

		expect(x).toStrictEqual([
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=29#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=30#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=31#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=32#p=12345678',
		])
	})

	it('Should generate a shortened multilink with multiple slots (three) on one chain', () => {
		const x = 'https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5),(50,3),(55,2)#p=12345678'

		const multilink = peanut.getLinksFromMultilink(x)

		expect(multilink).toStrictEqual([
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=29#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=30#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=31#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=32#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=50#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=51#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=52#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=55#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=56#p=12345678',
		])
	})

	it('Should generate a shortened multilink with multiple slots (three) on one chain', () => {
		const x = 'https://peanut.to/claim?c=11155111,10,137&v=v4.2&i=(28,1),(31,1),(44,1)#p=12345678'

		const multilink = peanut.getLinksFromMultilink(x)

		expect(multilink).toStrictEqual([
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28#p=12345678',
			'https://peanut.to/claim?c=10&v=v4.2&i=31#p=12345678',
			'https://peanut.to/claim?c=137&v=v4.2&i=44#p=12345678',
		])
	})
})

describe('should shorten multilink correctly', () => {
	it('should shorten the multilink correctly (one idx array)', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32#p=12345678'

		const shortenedMultilink = peanut.shortenMultilink(multilink)

		expect(shortenedMultilink).toBe('https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5)#p=12345678')
	})

	it('should shorten the multilink correctly (three idx array)', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32,35,36,37,40,41#p=12345678'

		const shortenedMultilink = peanut.shortenMultilink(multilink)

		expect(shortenedMultilink).toBe('https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5),(35,3),(40,2)#p=12345678')
	})

	it('should shorten the multilink correctly with one idx per chain, 3 chains', () => {
		const multilink = 'https://peanut.to/claim?c=11155111,137,10&v=v4.2&i=28,33,44#p=12345678'

		const shortenedMultilink = peanut.shortenMultilink(multilink)

		expect(shortenedMultilink).toBe(
			'https://peanut.to/claim?c=11155111,137,10&v=v4.2&i=(28,1),(33,1),(44,1)#p=12345678'
		)
	})
})

describe('should expand multilink correctly', () => {
	it('should expand the multilink correctly (one idx array)', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5)#p=12345678'

		const expandedMultilink = peanut.expandMultilink(multilink)

		expect(expandedMultilink).toBe('https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32#p=12345678')
	})

	it('should expand the multilink correctly (three idx array)', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5),(35,3),(40,2)#p=12345678'

		const expandedMultilink = peanut.expandMultilink(multilink)

		expect(expandedMultilink).toBe(
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32,35,36,37,40,41#p=12345678'
		)
	})

	it('should expand the multilink correctly with one idx per chain, 3 chains', () => {
		const multilink = 'https://peanut.to/claim?c=11155111,137,10&v=v4.2&i=(28,1),(33,1),(44,1)#p=12345678'

		const expandedMultilink = peanut.expandMultilink(multilink)

		console.log(expandedMultilink)

		expect(expandedMultilink).toBe('https://peanut.to/claim?c=11155111,137,10&v=v4.2&i=28,33,44#p=12345678')
	})
})

describe('is short link regex tests', () => {
	it('should test if link is shortened or not ', () => {
		const x = peanut.isShortenedLink('https://peanut.to/claim?c=11155111&v=v4.2&i=(28,1),(31,1),(44,1)#p=12345678')

		expect(x).toBe(true)
	})

	it('should test if link is shortened or not ', () => {
		const x = peanut.isShortenedLink('https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5)#p=12345678')

		expect(x).toBe(true)
	})

	it('should test if link is shortened or not ', () => {
		const x = peanut.isShortenedLink('https://peanut.to/claim?c=11155111&v=v4.2&i=12,122,12233#p=12345678')

		expect(x).toBe(false)
	})

	it('should test if link is shortened or not ', () => {
		const x = peanut.isShortenedLink('https://peanut.to/claim?c=11155111&v=v4.2&i=(12,3,4)#p=12345678')

		expect(x).toBe(false)
	})

	it('should test if link is shortened or not ', () => {
		const x = peanut.isShortenedLink('https://peanut.to/claim?c=11155111&v=v4.2&i=12,abc#p=12345678')

		expect(x).toBe(false)
	})
})
