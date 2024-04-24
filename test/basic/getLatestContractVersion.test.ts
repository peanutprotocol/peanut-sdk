import {
	CHAIN_DETAILS,
	LATEST_STABLE_BATCHER_VERSION,
	LATEST_STABLE_CONTRACT_VERSION,
	getLatestContractVersion,
} from '../../src'
import {
	FALLBACK_CONTRACT_VERSION,
	LATEST_EXPERIMENTAL_BATCHER_VERSION,
	LATEST_EXPERIMENTAL_CONTRACT_VERSION,
} from '../../src/data'

// This is a helper function to compare versions, if version1 is greater than version2, it returns false, otherwise true
// Always pass in the LTS version as version1
function compareVersions(version1: string, version2: string, lead: string): boolean {
	const v1 = version1.startsWith(lead) ? version1.substring(lead.length) : version1
	const v2 = version2.startsWith(lead) ? version2.substring(lead.length) : version2

	const parts1 = v1.split('.').map(Number)
	const parts2 = v2.split('.').map(Number)

	const maxLength = Math.max(parts1.length, parts2.length)

	for (let i = 0; i < maxLength; i++) {
		const part1 = i < parts1.length ? parts1[i] : 0
		const part2 = i < parts2.length ? parts2[i] : 0

		if (part1 > part2) return false
		if (part1 < part2) return true
	}
	return true
}

describe('getLatestContractVersion', () => {
	// should have the latest contract version for all chains deployed except mainnet (not deployed yet)
	test.each(Object.keys(CHAIN_DETAILS))(
		'Should have the latest contract version for chain %s deployed',
		function (chainId) {
			const lts = getLatestContractVersion({ chainId: CHAIN_DETAILS[chainId].chainId, type: 'normal' })

			const versionCheck = compareVersions(LATEST_STABLE_CONTRACT_VERSION, lts, 'v')
			if (!versionCheck) {
				console.log('WARNING: NOT DEPLOYED LTS YET ON CHAIN ', chainId, ', falling back to version: ', lts)
				expect(compareVersions(FALLBACK_CONTRACT_VERSION, lts, 'v')).toBe(true)
			} else {
				expect(versionCheck).toBe(true)
			}
		},
		100000
	)

	// should have the latest batcher version for all chains deployed
	test.each(Object.keys(CHAIN_DETAILS))(
		'Should have the latest batcher version for chain %s deployed',
		function (chainId) {
			const lts = getLatestContractVersion({ chainId: CHAIN_DETAILS[chainId].chainId, type: 'batch' })
			console.log(chainId, LATEST_STABLE_BATCHER_VERSION, lts)
			expect(compareVersions(LATEST_STABLE_BATCHER_VERSION, lts, 'Bv')).toBe(true)
		},
		100000
	)

	it('should throw an error if the given chainId is not defined', () => {
		const chainId = '999'
		const type = 'normal'

		expect(() => getLatestContractVersion({ chainId, type })).toThrowError('Failed to get latest contract version')
	})

	const chainIdsWithExperimental = ['11155111', '137', '10', '42161', '324']

	// should have the latest experimental batcher version for a couple of chains
	test.each(chainIdsWithExperimental)(
		'Should have the latest experimental contract version for chain %s deployed',
		function (chainId) {
			const lts = getLatestContractVersion({ chainId, type: 'normal', experimental: true })
			expect(compareVersions(LATEST_EXPERIMENTAL_CONTRACT_VERSION, lts, 'v')).toBe(true)
		},
		100000
	)

	// should have the latest experimental batcher version for a couple of chains
	test.each(chainIdsWithExperimental)(
		'Should have the latest experimental contract version for chain %s deployed',
		function (chainId) {
			const lts = getLatestContractVersion({ chainId, type: 'batch', experimental: true })
			expect(compareVersions(LATEST_EXPERIMENTAL_BATCHER_VERSION, lts, 'Bv')).toBe(true)
		},
		100000
	)
})
