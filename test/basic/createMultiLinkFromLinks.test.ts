import peanut from '../../src/index'

describe('Chain Representation Validation', () => {
	it('should have all chains in contracts.json represented in chainDetails.json and tokenDetails.json', () => {
		const x = [
			'https://peanut.to/claim?c=11155111&v=v4.2&i=28#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=29#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=30#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=31#p=12345678',
			'https://peanut.to/claim?c=11155111&v=v4.2&i=32#p=12345678',
		]

		const multilink = peanut.createMultiLinkFromLinks(x)

		expect(multilink).toBe('https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32#?=12345678')
	})
})
