import peanut from '../../src/index' // import directly from source code
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('getParamsFromLink', function () {
	it('no #', async function () {
		const params = peanut.getParamsFromLink('http://peanut.to/claim?c=5&v=v4&i=4663&t=ui&p=ULKr1Bzoh1SInyLO')

		expect(params).toEqual({
			chainId: '5',
			contractVersion: 'v4',
			depositIdx: 4663,
			password: 'ULKr1Bzoh1SInyLO',
			trackId: 'ui',
		})
	}, 10000)

	it('# beginning', async function () {
		const params = peanut.getParamsFromLink('http://peanut.to/claim#?c=5&v=v4&i=4663&t=ui&p=ULKr1Bzoh1SInyLO')

		expect(params).toEqual({
			chainId: '5',
			contractVersion: 'v4',
			depositIdx: 4663,
			password: 'ULKr1Bzoh1SInyLO',
			trackId: 'ui',
		})
	}, 10000)

	it('# password', async function () {
		const params = peanut.getParamsFromLink('http://peanut.to/claim?c=5&v=v4&i=4663&t=ui#p=ULKr1Bzoh1SInyLO')

		expect(params).toEqual({
			chainId: '5',
			contractVersion: 'v4',
			depositIdx: 4663,
			password: 'ULKr1Bzoh1SInyLO',
			trackId: 'ui',
		})
	}, 10000)

	it('no tag', async function () {
		const params = peanut.getParamsFromLink('http://peanut.to/claim?c=5&v=v4&i=4663#p=ULKr1Bzoh1SInyLO')

		expect(params).toEqual({
			chainId: '5',
			contractVersion: 'v4',
			depositIdx: 4663,
			password: 'ULKr1Bzoh1SInyLO',
			trackId: '',
		})
	}, 10000)

	it('amp; issue', async function () {
		const params = peanut.getParamsFromLink(
			'http://peanut.to/claim#?c=1&amp;v=v4&amp;i=4663&amp;t=ui&amp;p=ULKr1Bzoh1SInyLO'
		)

		expect(params).toEqual({
			chainId: '1',
			contractVersion: 'v4',
			depositIdx: 4663,
			password: 'ULKr1Bzoh1SInyLO',
			trackId: 'ui',
		})
	}, 10000)
}) // TODO: move away from goerli, not high prio since network is readonly
