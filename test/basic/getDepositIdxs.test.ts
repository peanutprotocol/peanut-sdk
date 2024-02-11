import peanut from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY // Make sure to add this to your .env
describe.only('getDepositIdxs for specific transaction using rpc.mantle.xyz', function () {
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

describe('getDepositIdxs', function () {
	let txReceipt1, txReceipt2

	beforeAll(async () => {
		const response1 = await fetch(
			`https://api-goerli.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=0x5258d1cf03763104682c95dd15e8516dec5ebd761cc97cbba4f98d8538736760&apikey=${ETHERSCAN_API_KEY}`
		)
		const data1 = await response1.json()
		if (!data1 || !data1.result) {
			throw new Error('Failed to fetch the first transaction receipt from Etherscan.')
		}
		txReceipt1 = data1.result

		// wait for 1 second
		await new Promise((res) => setTimeout(res, 1000))

		const response2 = await fetch(
			`https://api-goerli.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=0xa64f62cee7f2692a2f2d6d3b5eb8cd32d7df48bd0150c700e7d4ea19d7e2ce5f&apikey=${ETHERSCAN_API_KEY}`
		)
		const data2 = await response2.json()
		if (!data2 || !data2.result) {
			throw new Error('Failed to fetch the second transaction receipt from Etherscan.')
		}
		txReceipt2 = data2.result
	})

	it('should return an array of deposit indices from the first batch transaction receipt', async () => {
		for (let i = 0; i < txReceipt1.logs.length; i++) {
			console.log(txReceipt1.logs[i])
			console.log(txReceipt1.logs[i].topics)
		}
		const depositIdxs1 = await peanut.getDepositIdxs(txReceipt1, '5', 'v4')
		console.log(depositIdxs1)
		expect(depositIdxs1).toEqual([13, 14, 15, 16, 17])
	})

	it('should return an array of deposit indices from the second batch transaction receipt', async () => {
		console.log(txReceipt2)
		for (let i = 0; i < txReceipt2.logs.length; i++) {
			console.log(txReceipt2.logs[i])
			console.log(txReceipt2.logs[i].topics)
		}
		const depositIdxs2 = await peanut.getDepositIdxs(txReceipt2, '5', 'v4')
		console.log(depositIdxs2)
		expect(depositIdxs2).toEqual([18, 19, 20, 21, 22])
	})
})

describe('getDepositIdxs for single event and not batch', function () {
	let txReceipt1, txReceipt2

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

		// const response2 = await fetch(
		// 	`https://api-goerli.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=0x0021ba224cb261735ee57076565732aa631320530ee2736e1465a2795df2b23f&apikey=${ETHERSCAN_API_KEY}`
		// )
		// const data2 = await response2.json()
		// if (!data2 || !data2.result) {
		// 	throw new Error('Failed to fetch the second transaction receipt from Etherscan.')
		// }
		// txReceipt2 = data2.result
	})

	it('should return an array of deposit indices from the first batch transaction receipt', async () => {
		for (let i = 0; i < txReceipt1.logs.length; i++) {
			console.log(txReceipt1.logs[i])
			console.log(txReceipt1.logs[i].topics)
		}
		const depositIdxs1 = await peanut.getDepositIdxs(txReceipt1, '5', 'v4')
		console.log(depositIdxs1)
		expect(depositIdxs1).toEqual([190])
	})
})
