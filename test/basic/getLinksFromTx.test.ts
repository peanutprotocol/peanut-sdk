import peanut from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, it, describe } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

describe('getLinksFromTx eth mainnet', function () {
	it('mainnet', async function () {
		const tx_hash = '0xa082092246c81a7e10c15704f438d95e463ea64dc6444241651fcff309c180c7'
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
