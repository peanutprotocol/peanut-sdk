import { ethers } from 'ethersv5'
import peanut, { CHAIN_DETAILS, interfaces } from '../../src'

const PEANUT_DEV_API_KEY = 'vIAde1H9KihgAHTW3E5e9ALydUnGWEm9'
const TEST_WALLET_PRIVATE_KEY = '0xc2df14c3e5376ff9df19c553be4ac16978001e2853520063c7ed76f1a236db22'

let chains = ['56', '42161', '100', '137', '10', '324', '43114', '11155111']

const erc20Addresses = {
	'137': {
		address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
		decimals: 6,
	},
	'56': {
		address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
		decimals: 18,
	},
	'100': {
		address: '',
		decimals: 6,
	},
	'43114': {
		address: '',
		decimals: 6,
	},
	'10': {
		address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
		decimals: 6,
	},
	'324': {
		address: '',
		decimals: 6,
	},
	'42161': {
		address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
		decimals: 6,
	},
}

async function createAndClaimLink(options: interfaces.ICreateLinkParams, inbetweenDelay = 1000): Promise<string> {
	const recipientAddress = await options.structSigner.signer.getAddress()
	const response = await peanut.createLink(options)
	if (response.link) {
		await waitForTransaction(options.structSigner.signer.provider, response.txHash)
	}
	console.log('Link created: ' + response.link)
	await new Promise((res) => setTimeout(res, inbetweenDelay)) // Wait for 1 second before claiming
	const claimResult = await peanut.claimLinkGasless({
		link: response.link,
		APIKey: PEANUT_DEV_API_KEY ?? '',
		recipientAddress,
	})

	console.log('Link claimed: ' + claimResult.txHash)

	return claimResult.txHash
}

async function waitForTransaction(provider, txHash, timeout = 60000) {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		const receipt = await provider.getTransactionReceipt(txHash) // v5/v6?
		if (receipt && receipt.blockNumber) {
			return receipt
		}
		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before retrying
	}

	throw new Error('Transaction was not confirmed within the timeout period.')
}

describe('Create and claim tests', () => {
	// beforeAll(async () => {
	// 	mainnetChains = await Object.keys(CHAIN_DETAILS).filter((chainId) => CHAIN_DETAILS[chainId].mainnet === true)
	// })

	// test.each(chains)(
	// 	'Should create a native link on chain %s',
	// 	async function (chainId) {
	// 		peanut.toggleVerbose(true)

	// 		console.log(chainId)

	// 		const provider = await peanut.getDefaultProvider(String(chainId))
	// 		const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)
	// 		const createAndClaimResponseHash = await createAndClaimLink(
	// 			{
	// 				structSigner: {
	// 					signer: wallet,
	// 				},
	// 				linkDetails: {
	// 					chainId: chainId,
	// 					tokenAmount: 0.0001,
	// 					tokenType: 0,
	// 				},
	// 			},
	// 			12000
	// 		)

	// 		expect(createAndClaimResponseHash).toBeDefined()
	// 	},
	// 	1000000
	// )

	test.each(Object.keys(erc20Addresses))(
		'Should create an erc20 link on chain %s',
		async function (chainId) {
			if (erc20Addresses[chainId].address !== '') {
				peanut.toggleVerbose(true)

				console.log(chainId)

				const polygonProvider = await peanut.getDefaultProvider(String(chainId))
				const polygonWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', polygonProvider)
				const createAndClaimResponseHash = await createAndClaimLink(
					{
						structSigner: {
							signer: polygonWallet,
						},
						linkDetails: {
							chainId: chainId,
							tokenAmount: 0.0001,
							tokenAddress: erc20Addresses[chainId].address,
							tokenType: erc20Addresses[chainId].decimals,
						},
					},
					12000
				)

				expect(createAndClaimResponseHash).toBeDefined()
			}
		},
		1000000
	)
})
