import peanut from '../../src/index' // import directly from source code
import { ethers } from 'ethersv5' // v5
import { expect, describe, it } from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY ?? ''
const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm'
const goerliProvider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL)
const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, goerliProvider)

describe('prepareTxs', function () {
	it('should prepare transactions successfully', async function () {
		const response = await peanut.prepareTxs({
			address: goerliWallet.address,
			linkDetails: {
				chainId: '5',
				tokenAmount: 0.01,
				tokenType: 0,
			},
			numberOfLinks: 1,
			passwords: ['testpassword'],
			provider: goerliProvider,
		})

		expect(response.unsignedTxs.length).toBe(1) // 1 for link creation because tokenType is 0
	})

	it('should prepare transactions successfully with erc20 token', async function () {
		const response = await peanut.prepareTxs({
			address: goerliWallet.address,
			linkDetails: {
				chainId: '5',
				tokenAmount: 0.01,
				tokenType: 1,
				tokenAddress: '0x73967c6a0904aA032C103b4104747E88c566B1A2',
				tokenDecimals: 18,
			},
			numberOfLinks: 1,
			passwords: ['testpassword'],
			provider: goerliProvider,
		})

		expect(response.unsignedTxs.length).toBe(2) // 1 for erc20 approval, 1 for link creation because tokenType is 1
	})

	it('should prepare transactions when type and decimals are undefined for erc20', async function () {
		const response = await peanut.prepareTxs({
			address: goerliWallet.address,
			linkDetails: {
				chainId: '5',
				tokenAmount: 0.01,
				tokenAddress: '0x73967c6a0904aA032C103b4104747E88c566B1A2',
			},
			numberOfLinks: 1,
			passwords: ['testpassword'],
			provider: goerliProvider,
		})

		expect(response.unsignedTxs.length).toBe(2) // 1 for erc20 approval, 1 for link creation because tokenType is 1
	})

	it('should fail when numberOfLinks is not equal to passwords.length', async function () {
		try {
			const response = await peanut.prepareTxs({
				address: goerliWallet.address,
				linkDetails: {
					chainId: '5',
					tokenAmount: 0.01,
					tokenType: 0,
				},
				numberOfLinks: 2,
				passwords: ['testpassword'],
				provider: goerliProvider,
			})
		} catch (error) {
			expect(error.code).toBe(peanut.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS)
		}
	})

	it('should fail when linkDetails are not valid', async function () {
		try {
			const response = await peanut.prepareTxs({
				address: goerliWallet.address,
				linkDetails: {
					chainId: '5',
					tokenAmount: -0.01, // Invalid token amount
					tokenType: 0,
				},
				numberOfLinks: 1,
				passwords: ['testpassword'],
				provider: goerliProvider,
			})
		} catch (error) {
			expect(error.code).toBe(peanut.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS)
		}
	})
})
