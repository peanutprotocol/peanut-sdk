import peanut from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

const POLYGONSCAN_TOKEN = process.env.POLYGONSCAN_TOKEN // Make sure to add this to your .env
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY // Make sure to add this to your .env
describe('getDepositIdxs for specific transaction using rpc.mantle.xyz', function () {
	let txReceipt

	beforeAll(async () => {
		const requestBody = {
			id: 0,
			jsonrpc: '2.0',
			method: 'eth_getTransactionReceipt',
			params: ['0x0e1ba641a3f89f4de9b2b8ee1170e8512d5c85ac1d685a88adce74129849910b'],
		}

		const response = await fetch(`https://rpc.mantle.xyz/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		})
		const data = await response.json()
		console.log(data)
		if (!data || !data.result) {
			throw new Error('Failed to fetch the transaction receipt from rpc.mantle.xyz using eth rpc.')
		}
		txReceipt = data.result
	})
	it('should return an array of deposit indices for the specified transaction', async () => {
		const depositIdxs = await peanut.getDepositIdxs(txReceipt, '5000', 'v4.3')
		console.log(depositIdxs)
		// Replace the expected array below with the actual expected result once known.
		expect(depositIdxs).toEqual([
			/* expected array of deposit indices */
		])
	})
})

describe('getDepositIdxs for single event and not batch', function () {
	let txReceipt1

	beforeAll(async () => {
		const response1 = await fetch(
			`https://api.polygonscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=0xd3272b84c242290308bf2d42129b566bf0837f4a9821ec44a9d3124618135bdb&apikey=${POLYGONSCAN_TOKEN}`
		)
		const data1 = await response1.json()
		if (!data1 || !data1.result) {
			throw new Error('Failed to fetch the first transaction receipt from Etherscan.')
		}
		txReceipt1 = data1.result
	})

	it('should return an array of deposit indices from the first batch transaction receipt', async () => {
		for (let i = 0; i < txReceipt1.logs.length; i++) {
			console.log(txReceipt1.logs[i])
			console.log(txReceipt1.logs[i].topics)
		}
		const depositIdxs1 = await peanut.getDepositIdxs(txReceipt1, '137', 'v4')
		console.log(depositIdxs1)
		expect(depositIdxs1).toEqual([933])
	})
})
