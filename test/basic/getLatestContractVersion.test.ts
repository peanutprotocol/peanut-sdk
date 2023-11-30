import peanut from '../../src/index' // import directly from source code
describe('getLatestContractVersion', () => {
	it('should return the latest contract version when chainId and type are valid', () => {
		const chainId = '5'
		const type = 'normal'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type })

		expect(latestContractVersion).toBe('v4')
	})
	it('should return the experimental contract version', () => {
		const chainId = '5'
		const type = 'normal'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type, experimental: true })

		expect(latestContractVersion).toBe('v5')
	})
	it('should return the latest contract version even if versions are not in order', () => {
		const chainId = '137'
		const type = 'normal'

		const latestContractVersion = peanut.getLatestContractVersion({ chainId, type })

		expect(latestContractVersion).toBe('v4')
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
})
