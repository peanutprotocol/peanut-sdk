import { ethers } from 'ethersv5'
import peanut, { interfaces } from '../../src'
import * as utils from './test.utils'
import * as consts from './test.consts'

export async function createAndClaimLinkGasless(
	options: interfaces.ICreateLinkParams,
	inbetweenDelay = 1000
): Promise<string> {
	const recipientAddress = await options.structSigner.signer.getAddress()
	const response = await peanut.createLink(options)
	if (response.link) {
		await utils.waitForTransaction(options.structSigner.signer.provider, response.txHash)
	}
	console.log('Link created: ' + response.link)
	await new Promise((res) => setTimeout(res, inbetweenDelay)) // Wait for 1 second before claiming
	const claimResult = await peanut.claimLinkGasless({
		link: response.link,
		APIKey: consts.PEANUT_DEV_API_KEY ?? '',
		recipientAddress,
	})

	console.log('Link claimed: ' + claimResult.txHash)

	return claimResult.txHash
}
describe('Create and claim tests, normal links', () => {
	// beforeAll(async () => {
	// 	mainnetChains = await Object.keys(CHAIN_DETAILS).filter((chainId) => CHAIN_DETAILS[chainId].mainnet === true)
	// }) // TODO: Uncomment this when the test wallet is funded on ALL mainnet chains

	test.each(consts.chains)(
		'Should create a native link on chain %s',
		async function (chainId) {
			peanut.toggleVerbose(true)

			const provider = await peanut.getDefaultProvider(String(chainId))
			const wallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY ?? '', provider)
			const createAndClaimResponseHash = await createAndClaimLinkGasless(
				{
					structSigner: {
						signer: wallet,
					},
					linkDetails: {
						chainId: chainId,
						tokenAmount: 0.0001,
						tokenType: 0,
					},
				},
				12000
			)

			expect(createAndClaimResponseHash).toBeDefined()
		},
		120000
	)

	test.each(Object.keys(consts.erc20Addresses))(
		'Should create an erc20 link on chain %s',
		async function (chainId) {
			if (consts.erc20Addresses[chainId].address !== '') {
				peanut.toggleVerbose(true)

				const provider = await peanut.getDefaultProvider(String(chainId))
				const wallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY ?? '', provider)
				const createAndClaimResponseHash = await createAndClaimLinkGasless(
					{
						structSigner: {
							signer: wallet,
						},
						linkDetails: {
							chainId: chainId,
							tokenAmount: 0.0001,
							tokenAddress: consts.erc20Addresses[chainId].address,
							tokenType: consts.erc20Addresses[chainId].decimals,
						},
					},
					12000
				)

				expect(createAndClaimResponseHash).toBeDefined()
			}
		},
		120000
	)

	// Doing ONE manual claim test to make sure functions work
	it('should create and claim a native link without using the API', async () => {
		peanut.toggleVerbose(true)

		const chainId = consts.chains[Math.floor(Math.random() * consts.chains.length)] // Use a random chainId
		console.log('using chainId: ', chainId)

		const provider = await peanut.getDefaultProvider(String(chainId))
		const wallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY ?? '', provider)
		const recipientAddress = await wallet.getAddress()
		const response = await peanut.createLink({
			structSigner: {
				signer: wallet,
			},
			linkDetails: {
				chainId: chainId,
				tokenAmount: 0.0001,
				tokenType: 0,
			},
		})
		if (response.link) {
			await utils.waitForTransaction(provider, response.txHash)
		}
		console.log('Link created: ' + response.link)
		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before claiming
		const claimResult = await peanut.claimLink({
			structSigner: { signer: wallet },
			link: response.link,
			recipient: recipientAddress,
		})

		console.log('Link claimed: ' + claimResult.txHash)

		expect(claimResult.txHash).toBeDefined()
	}, 120000)
})
