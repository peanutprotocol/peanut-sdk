import peanut, { interfaces } from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import dotenv from 'dotenv'
// import fetch from 'node-fetch'

dotenv.config()

describe('get contract type test', () => {
	// Returns the contract type when provided with a valid chainId and provider.
	it('should return the contract type when provided with a valid chainId and provider, this should return erc721', async () => {
		const chainId = '42161'
		const provider = await peanut.getDefaultProvider(chainId)
		const contractAddress = '0xfAe39eC09730CA0F14262A636D2d7C5539353752'
		await expect(peanut.getContractType({ provider, address: contractAddress })).resolves.toEqual('ERC721')
	})

	it('should return the contract type when provided with a valid chainId and provider, this should return erc20', async () => {
		const chainId = '137'
		const provider = await peanut.getDefaultProvider(chainId)
		const contractAddress = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
		await expect(peanut.getContractType({ provider, address: contractAddress })).resolves.toEqual('ERC20')
	})

	it('should return the contract type when provided with a valid chainId and provider, this should return erc1155', async () => {
		const chainId = '10'
		const provider = await peanut.getDefaultProvider(chainId)
		const contractAddress = '0xE538598941e4A25f471aEF9b1b5dFFD6eE0fDA54'
		await expect(peanut.getContractType({ provider, address: contractAddress })).resolves.toEqual('ERC1155')
	})

	it('should return the contract type when provided with a valid chainId and provider, this should return erc1155', async () => {
		const chainId = '1'
		const provider = await peanut.getDefaultProvider(chainId)
		const contractAddress = '0x0000000000000000000000000000000000000000'
		await expect(peanut.getContractType({ provider, address: contractAddress })).resolves.toEqual('NATIVE')
	})
})
