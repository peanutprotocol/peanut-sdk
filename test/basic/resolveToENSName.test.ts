import * as peanut from '../../src/index'

describe('resolveToENSName', () => {
	it('should resolve ENS name when using default provider', async () => {
		const address = '0x7fDCc4908bEF4f6F296f78a30A6b295069EE9e5d'
		const ensName = 'borcherd.eth'
		const result = await peanut.resolveToENSName({ address })
		console.log(result)
		expect(result).toBe(ensName)
	}, 60000)
})
