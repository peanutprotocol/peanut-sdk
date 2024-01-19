import * as peanut from '../../src/index'

describe('resolveToENSName', () => {
	it('should resolve ENS name when using default provider', async () => {
		const address = '0x7fDCc4908bEF4f6F296f78a30A6b295069EE9e5d'
		const ensName = 'borcherd.eth'
		const result = await peanut.resolveToENSName({ address })
		expect(result).toBe(ensName)
	}, 60000)

	it('should resolve null when using default provider and ens name is not registered to address', async () => {
		const address = '0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918'
		const ensName = null
		const result = await peanut.resolveToENSName({ address })
		expect(result).toBe(ensName)
	}, 60000)
})
