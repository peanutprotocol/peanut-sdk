import peanut from '../src/index'
import { expect, it, describe } from '@jest/globals'

describe('createMultiLinkFromLinks function', () => {
	it('should correctly create a multilink from individual links', () => {
		const links = [
			'https://peanut.to/claim#?c=1&v=v3&i=101&p=ggHmiXLTAG6Kwjvr',
			'https://peanut.to/claim#?c=2&v=v3&i=102&p=ggHmiXLTAG6Kwjvr',
			'https://peanut.to/claim#?c=3&v=v3&i=103&p=ggHmiXLTAG6Kwjvr',
		]
		const expectedMultilink = 'https://peanut.to/claim#?c=1,2,3&v=v3&i=101,102,103&p=ggHmiXLTAG6Kwjvr'

		const actualMultilink = peanut.createMultiLinkFromLinks(links)
		expect(actualMultilink).toEqual(expectedMultilink)
	})

	it('should handle a single c parameter correctly', () => {
		const links = [
			'https://peanut.to/claim#?c=1&v=v3&i=101&p=ggHmiXLTAG6Kwjvr',
			'https://peanut.to/claim#?c=1&v=v3&i=102&p=ggHmiXLTAG6Kwjvr',
			'https://peanut.to/claim#?c=1&v=v3&i=103&p=ggHmiXLTAG6Kwjvr',
		]
		const expectedMultilink = 'https://peanut.to/claim#?c=1&v=v3&i=101,102,103&p=ggHmiXLTAG6Kwjvr'

		const actualMultilink = peanut.createMultiLinkFromLinks(links)
		expect(actualMultilink).toEqual(expectedMultilink)
	})

	it('should handle a t param', () => {
		const links = [
			'https://peanut.to/claim#?c=1&v=v3&i=101&p=ggHmiXLTAG6Kwjvr&t=ui',
			'https://peanut.to/claim#?c=1&v=v3&i=102&p=ggHmiXLTAG6Kwjvr&t=ui',
			'https://peanut.to/claim#?c=1&v=v3&i=103&p=ggHmiXLTAG6Kwjvr&t=ui',
		]
		const expectedMultilink = 'https://peanut.to/claim#?c=1&v=v3&i=101,102,103&p=ggHmiXLTAG6Kwjvr&t=ui'

		const actualMultilink = peanut.createMultiLinkFromLinks(links)
		expect(actualMultilink).toEqual(expectedMultilink)
	})

	it('should handle a t and random param', () => {
		const links = [
			'https://peanut.to/claim#?c=1&v=v3&i=101&p=ggHmiXLTAG6Kwjvr&t=ui&random=1',
			'https://peanut.to/claim#?c=1&v=v3&i=102&p=ggHmiXLTAG6Kwjvr&t=ui&random=1',
			'https://peanut.to/claim#?c=1&v=v3&i=103&p=ggHmiXLTAG6Kwjvr&t=ui&random=1',
		]
		const expectedMultilink = 'https://peanut.to/claim#?c=1&v=v3&i=101,102,103&p=ggHmiXLTAG6Kwjvr&t=ui&random=1'

		const actualMultilink = peanut.createMultiLinkFromLinks(links)
		expect(actualMultilink).toEqual(expectedMultilink)
	})
})
