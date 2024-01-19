import { ICreateLinkParams, peanut } from '../../src'
import dotenv from 'dotenv'
import { ethers } from 'ethersv5'
dotenv.config()

const PEANUT_API_KEY = process.env.PEANUT_DEV_API_KEY!
const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY!

async function createAndClaimLinkGasless(
	createOptions: ICreateLinkParams,
	recipientAddress: string = ethers.constants.AddressZero,
	claimUrl: string = 'https://peanut-api-ts-9lo6.onrender.com/claim-v2'
) {
	const response = await peanut.createLink(createOptions)
	console.log('Link created: ' + response.link)
	console.log('Claiming it')
	return peanut.claimLinkGasless({
		link: response.link,
		baseUrl: claimUrl,
		APIKey: PEANUT_API_KEY,
		recipientAddress,
	})
}

describe('claim gasless', () => {
	peanut.toggleVerbose(true)

	test('successful native token claim latest version', async () => {
		const chainId = '137'
		const tokenAmount = 0.1
		const provider = await peanut.getDefaultProvider(chainId)
		const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, provider)
		await createAndClaimLinkGasless({
			structSigner: {
				signer: wallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount,
				tokenType: 0,
				tokenAddress: ethers.constants.AddressZero,
				tokenDecimals: 18,
			},
		})
	}, 60000)

	test('successful native token claim peanut v4', async () => {
		const chainId = '137'
		const tokenAmount = 0.1
		const provider = await peanut.getDefaultProvider(chainId)
		const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, provider)
		await createAndClaimLinkGasless({
			structSigner: {
				signer: wallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount,
				tokenType: 0,
				tokenAddress: ethers.constants.AddressZero,
				tokenDecimals: 18,
			},
			peanutContractVersion: 'v4',
		})
	}, 60000)

	test('bad chain id', async () => {
		// link with bad chain id
		const link = ' https://peanut.to/claim?c=1000000&v=v4&i=652&t=sdk#p=NuHj4NGa73mKeZI8'

		try {
			await peanut.claimLinkGasless({
				link,
				baseUrl: 'http://localhost:8000/claim-v2',
				APIKey: PEANUT_API_KEY,
				recipientAddress: ethers.constants.AddressZero,
			})
			throw new Error('claimLinkGasless should have thrown an error')
		} catch (e) {
			const errStr = String(e)
			expect(errStr.includes('Chain ID 1000000 not supported yet'))
			return
		}
	})
})
