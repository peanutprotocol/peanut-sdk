import { ethers } from 'ethersv5'
import { setFeeOptions, getDefaultProvider, peanut } from '../../src/index'
import { expect, it, describe } from '@jest/globals'

peanut.toggleVerbose(false)

describe('setFeeOptions function', () => {
	// beforeAll(() => {
	// 	provider = await getDefaultProvider('1')
	// })

	it('should correctly set fee options for EIP-1559 supported chains', async () => {
		const provider = await getDefaultProvider('1')

		const txOptions = await setFeeOptions({
			provider,
			eip1559: true,
			maxFeePerGasMultiplier: 1.1,
			gasPriceMultiplier: 1.3,
			maxPriorityFeePerGasMultiplier: 2,
		})
		console.log(txOptions)
		expect(txOptions).toHaveProperty('maxFeePerGas')
		expect(txOptions).toHaveProperty('maxPriorityFeePerGas')
		expect(BigInt(txOptions.maxPriorityFeePerGas)).toBeLessThanOrEqual(BigInt(txOptions.maxFeePerGas))
	}, 30000)

	it('should correctly set fee options for non-EIP-1559 chains', async () => {
		const provider = await getDefaultProvider('56')

		const txOptions = await setFeeOptions({
			provider,
			eip1559: false,
			gasPriceMultiplier: 1.3,
		})

		expect(txOptions).toHaveProperty('gasPrice')
	}, 30000)

	it('should correctly set gas limit for specific chains', async () => {
		const provider = await getDefaultProvider('137')

		const txOptions = await setFeeOptions({
			provider,
			gasLimit: ethers.BigNumber.from('1000000'),
		})

		expect(txOptions).toHaveProperty('gasLimit')
		expect(txOptions.gasLimit.toString()).toEqual('1000000')
	}, 30000)

	it('should correctly set maxPriorityFeePerGas for specific chains', async () => {
		const provider = await getDefaultProvider('1')

		const txOptions = await setFeeOptions({
			provider,
			maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei'),
		})

		expect(txOptions).toHaveProperty('maxPriorityFeePerGas')
		expect(txOptions.maxPriorityFeePerGas.toString()).toEqual(ethers.utils.parseUnits('30', 'gwei').toString())
	}, 30000)

	it('should throw an error if provider fails to fetch gas price', async () => {
		const faultyProvider = new ethers.providers.JsonRpcProvider({
			url: 'http://faultyprovider.com',
			skipFetchSetup: true,
		})

		await expect(
			setFeeOptions({
				provider: faultyProvider,
			})
		).rejects.toThrow()
	}, 30000)
})
