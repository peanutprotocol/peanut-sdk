import peanut from '../src/index'
import { expect, it, describe } from '@jest/globals'

describe('getLinksFromMultilink function', () => {
	it('should correctly split a multilink into individual links', () => {
		const multilink = 'https://peanut.to/claim?c=1,2,3&v=v3&i=101,102,103&p=ggHmiXLTAG6Kwjvr'
		const expectedLinks = [
			'https://peanut.to/claim?c=1&v=v3&i=101&p=ggHmiXLTAG6Kwjvr',
			'https://peanut.to/claim?c=2&v=v3&i=102&p=ggHmiXLTAG6Kwjvr',
			'https://peanut.to/claim?c=3&v=v3&i=103&p=ggHmiXLTAG6Kwjvr',
		]

		const actualLinks = peanut.getLinksFromMultilink(multilink)
		expect(actualLinks).toEqual(expectedLinks)
	})

	it('should handle a single c parameter correctly', () => {
		const multilink = 'https://peanut.to/claim?c=1&v=v3&i=101,102,103&p=ggHmiXLTAG6Kwjvr'
		const expectedLinks = [
			'https://peanut.to/claim?c=1&v=v3&i=101&p=ggHmiXLTAG6Kwjvr',
			'https://peanut.to/claim?c=1&v=v3&i=102&p=ggHmiXLTAG6Kwjvr',
			'https://peanut.to/claim?c=1&v=v3&i=103&p=ggHmiXLTAG6Kwjvr',
		]

		const actualLinks = peanut.getLinksFromMultilink(multilink)
		expect(actualLinks).toEqual(expectedLinks)
	})

	it('should handle a t param', () => {
		const multilink = 'https://peanut.to/claim?c=1&v=v3&i=101,102,103&p=ggHmiXLTAG6Kwjvr&t=ui'
		const expectedLinks = [
			'https://peanut.to/claim?c=1&v=v3&i=101&p=ggHmiXLTAG6Kwjvr&t=ui',
			'https://peanut.to/claim?c=1&v=v3&i=102&p=ggHmiXLTAG6Kwjvr&t=ui',
			'https://peanut.to/claim?c=1&v=v3&i=103&p=ggHmiXLTAG6Kwjvr&t=ui',
		]

		const actualLinks = peanut.getLinksFromMultilink(multilink)
		expect(actualLinks).toEqual(expectedLinks)
	})
})
