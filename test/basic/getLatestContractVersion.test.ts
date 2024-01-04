import peanut from '../../src/index' // import directly from source code
describe('getLatestContractVersion', () => {
	it('chain 5 normal no experimental', () => {
		const chainId = '5'
		const type = 'normal'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type, experimental: false })

		expect(latestContractVersion).toBe('v4')
	})
	it('chain 5 normal experimental', () => {
		const chainId = '5'
		const type = 'normal'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type, experimental: true })

		expect(latestContractVersion).toBe('v4.2')
	})
	it('chain 137 normal no experimental', () => {
		const chainId = '137'
		const type = 'normal'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type })

		expect(latestContractVersion).toBe('v4')
	})
	it('chain 5 normal experimental', () => {
		const chainId = '137'
		const type = 'normal'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type, experimental: true })

		expect(latestContractVersion).toBe('v4.2')
	})

	it('should throw an error if the given chainId is not defined', () => {
		const chainId = '999'
		const type = 'normal'

		expect(() => peanut.getLatestContractVersion({ chainId, type })).toThrowError(
			'Failed to get latest contract version'
		)
	})

	it('should return a batch contract if the type is batch', () => {
		const chainId = '137'
		const type = 'batch'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type })

		expect(latestContractVersion).toBe('Bv4')
	})

	it('chain 1 normal no experimental', () => {
		const chainId = '1'
		const type = 'normal'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type })

		expect(latestContractVersion).toBe('v4')
	})

	it('chain 1 normal experimental', () => {
		const chainId = '1'
		const type = 'normal'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type, experimental: true })

		expect(latestContractVersion).toBe('v4')
	})
})
