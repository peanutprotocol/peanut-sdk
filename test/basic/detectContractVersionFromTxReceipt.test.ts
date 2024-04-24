import peanut from '../../src/index' // import directly from source code
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

const POLYGONSCAN_TOKEN = process.env.POLYGONSCAN_TOKEN // Make sure to add this to your .env

describe('detect contract version, function ()', () => {
	let txReceipt1, txReceipt2, txReceipt3

	beforeAll(async () => {
		const response1 = await fetch(
			`https://api.polygonscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=0xd3272b84c242290308bf2d42129b566bf0837f4a9821ec44a9d3124618135bdb&apikey=${POLYGONSCAN_TOKEN}`
		)
		const data1 = await response1.json()
		if (!data1 || !data1.result) {
			throw new Error('Failed to fetch the first transaction receipt from Etherscan.')
		}
		txReceipt1 = data1.result

		// // wait for 1 second
		await new Promise((res) => setTimeout(res, 1000))

		const response2 = await fetch(
			`https://api.polygonscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=0x54d2fabb17b2fb02fe5961de1a5315501e71ac184ea88819d9074b37abec3a55&apikey=${POLYGONSCAN_TOKEN}`
		)
		const data2 = await response2.json()
		if (!data2 || !data2.result) {
			throw new Error('Failed to fetch the second transaction receipt from Etherscan.')
		}

		txReceipt2 = data2.result

		const response3 = await fetch(
			`https://api.polygonscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=0xd80e4946a01efb582a7faace0e8ab2448f2130a9c7b09ebaa5cd6a4c28b528fc&apikey=${POLYGONSCAN_TOKEN}`
		)
		const data3 = await response3.json()
		if (!data3 || !data3.result) {
			throw new Error('Failed to fetch the second transaction receipt from Etherscan.')
		}
		txReceipt3 = data3.result
	})

	it('detect v4', async () => {
		const version = peanut.detectContractVersionFromTxReceipt(txReceipt1, '137') // polygon
		expect(version).toEqual('v4')
	}, 12000)
	it('detect v3', async () => {
		const version = peanut.detectContractVersionFromTxReceipt(txReceipt2, '137') // polygon
		expect(version).toEqual('v3')
	}, 12000)

	it('detect v4.2', async () => {
		const version = peanut.detectContractVersionFromTxReceipt(txReceipt3, '137') // polygon
		expect(version).toEqual('v4.2')
	}, 12000)
})
