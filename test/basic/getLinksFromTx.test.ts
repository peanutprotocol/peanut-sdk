import peanut from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('getLinksFromTx eth mainnet', function () {
	it('mainnet', async function () {
		const tx_hash = '0x405057aac8124ce8c44c84af52b8c4cdbb7d0b8603ec41c2ff55f55a66d9731c'
		const linkDetails = {
			chainId: 1,
			tokenAmount: 0.01,
			tokenType: 0,
			tokenAddress: '0x0000000000000000000000000000000000000000',
		}

		const links = await peanut.getLinksFromTx({
			linkDetails: linkDetails,
			txHash: tx_hash,
			passwords: ['password1'],
		})

		console.log(links)
	}, 10000)
})
