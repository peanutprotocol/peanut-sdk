import peanut from '../../src/index' // import directly from source code
describe('getLatestContractVersion', () => {
	const expectedVersionNormal = 'v4.4'
	const expectedVersionBatch = 'Bv4.4'
	const types = ['normal', 'batch']

	const chainIds = [
		// Mainnets
		'137',
		'5000',
		'10',
		'8453',
		'42161',
		'100',
		'43114',
		'59144',
		'324',
		'534352',
		'42220',
		// Testnets
		'11155111',
		'80001',
		'300',
		'44787',
	]
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

	// TODO: fix bnb. Could not deploy the v4.4 peanut version
	// due to problems with bscscan api keys
	const chainIdsExceptionsV4_3 = ['5', '5001', '56']
	chainIdsExceptionsV4_3.forEach((chainId) => {
		types.forEach((type) => {
			const isExperimental = [true, false]
			isExperimental.forEach((experimental) => {
				if (type === 'normal') {
					it(`EXCEPTIONS: chain ${chainId} ${type} experimental: ${experimental}`, () => {
						const latestContractVersion = peanut.getLatestContractVersion({ chainId, type, experimental })
						expect(latestContractVersion).toBe('v4.3')
					})
				}
			})
		})
	})

	const chainIdsExceptionsV4_2 = ['1']
	chainIdsExceptionsV4_2.forEach((chainId) => {
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
