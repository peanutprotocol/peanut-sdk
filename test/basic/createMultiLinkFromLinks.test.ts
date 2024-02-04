import peanut from '../../src/index'

describe('Multilink tests', () => {
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

	it('Should generate a shortened multilink with multiple slots (three)', () => {
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

	it('should shorten the multilink correctly (one idx array)', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32#p=12345678'

		const shortenedMultilink = peanut.shortenMultilink(multilink)

		expect(shortenedMultilink).toBe('https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5)#p=12345678')
	})

	it('should expand the multilink correctly (one idx array)', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5)#p=12345678'

		const expandedMultilink = peanut.expandMultilink(multilink)

		expect(expandedMultilink).toBe('https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32#p=12345678')
	})

	it('should shorten the multilink correctly (three idx array)', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32,35,36,37,40,41#p=12345678'

		const shortenedMultilink = peanut.shortenMultilink(multilink)

		expect(shortenedMultilink).toBe('https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5),(35,3),(40,2)#p=12345678')
	})

	it('should expand the multilink correctly (three idx array)', () => {
		const multilink = 'https://peanut.to/claim?c=11155111&v=v4.2&i=(28,5),(35,3),(40,2)#p=12345678'

		const expandedMultilink = peanut.expandMultilink(multilink)

		console.log(expandedMultilink)

		expect(expandedMultilink).toBe(
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32,35,36,37,40,41#p=12345678'
		)
	})
})
