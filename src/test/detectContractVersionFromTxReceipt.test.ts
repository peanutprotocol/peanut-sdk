import peanut from '../index'
import { ethers } from 'ethersv5'
import dotenv from 'dotenv'
dotenv.config()

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY // Make sure to add this to your .env

describe('detect contract version, function ()', () => {
	let txReceipt1, txReceipt2, txReceipt3

	beforeAll(async () => {
		const response1 = await fetch(
			`https://api-goerli.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=0x0021ba224cb261735ee57076565732aa631320530ee2736e1465a2795df2b23f&apikey=${ETHERSCAN_API_KEY}`
		)
		const data1 = await response1.json()
		if (!data1 || !data1.result) {
			throw new Error('Failed to fetch the first transaction receipt from Etherscan.')
		}
		txReceipt1 = data1.result

		// // wait for 1 second
		await new Promise((res) => setTimeout(res, 1000))

		const response2 = await fetch(
			`https://api-goerli.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=0x3e46e4ffdedefc3fc896d03d29d779be679f0d2f854a82e872eb8bab490af5f0&apikey=${ETHERSCAN_API_KEY}`
		)
		const data2 = await response2.json()
		if (!data2 || !data2.result) {
			throw new Error('Failed to fetch the second transaction receipt from Etherscan.')
		}
		txReceipt2 = data2.result

		const response3 = await fetch(
			`https://api-goerli.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=0xa1c9462c94aa101994af95f98abb452589733d1030799352818374b7eb6f67a7&apikey=${ETHERSCAN_API_KEY}`
		)
		const data3 = await response3.json()
		if (!data3 || !data3.result) {
			throw new Error('Failed to fetch the second transaction receipt from Etherscan.')
		}
		txReceipt3 = data3.result
	})

	it('detect contract version should return v4', async () => {
		const version = peanut.detectContractVersionFromTxReceipt(txReceipt1, '5') // goerli
		expect(version).toEqual('v4')
	})
	it('detect v3', async () => {
		const version = peanut.detectContractVersionFromTxReceipt(txReceipt2, '5') // goerli
		expect(version).toEqual('v3')
	})
	it('detect v4 for batch fn', async () => {
		const version = peanut.detectContractVersionFromTxReceipt(txReceipt3, '5') // goerli
		expect(version).toEqual('v4')
	})
})
