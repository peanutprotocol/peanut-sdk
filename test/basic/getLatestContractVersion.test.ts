import peanut from '../../src/index' // import directly from source code
describe('getLatestContractVersion', () => {
	const expectedVersionNormal = 'v4.4'
	const expectedVersionBatch = 'Bv4.4'
	const types = ['normal', 'batch']

	const chainIds = ['5', '137', '5000', '5001']
	chainIds.forEach((chainId) => {
		types.forEach((type) => {
			const isExperimental = [true, false]
			isExperimental.forEach((experimental) => {
				if (type === 'normal') {
					it(`chain ${chainId} ${type} experimental: ${experimental}`, () => {
						const latestContractVersion = peanut.getLatestContractVersion({ chainId, type, experimental })
						expect(latestContractVersion).toBe(expectedVersionNormal)
					})
				}
			})
		})
	})

	const chainIdsExceptions = ['1', '324', '300']
	chainIdsExceptions.forEach((chainId) => {
		types.forEach((type) => {
			const isExperimental = [true, false]
			isExperimental.forEach((experimental) => {
				if (type === 'normal') {
					it(`EXCEPTIONS: chain ${chainId} ${type} experimental: ${experimental}`, () => {
						const latestContractVersion = peanut.getLatestContractVersion({ chainId, type, experimental })
						expect(latestContractVersion).toBe('v4.2')
					})
				}
			})
		})
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

		expect(latestContractVersion).toBe(expectedVersionBatch)
	})
})
