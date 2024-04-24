import {
	TOKEN_TYPES,
	getDefaultProvider,
	getLinkDetails,
	getLinkFromParams,
	makeGaslessDepositPayload,
	makeGaslessReclaimPayload,
	makeDepositGasless,
	makeReclaimGasless,
	getLinksFromTx,
	interfaces,
	createLink,
} from '../../src/index' // import directly from source code
import { BigNumber, constants, ethers } from 'ethersv5' // v5
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY

describe('gasless functionality through peanut api', () => {
	const apiKey = process.env.PEANUT_DEV_API_KEY!
	// Tests the entire flow from the client to the server for gasless deposits
	// Requirements for the test:
	// 1. TEST_WALLET_PRIVATE_KEY owns at least 0.01 of mumbai USDC
	test('make a gasless deposit', async () => {
		const testingChainId = '80001'
		const provider = await getDefaultProvider(String(testingChainId))
		const userWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)
		console.log('Wallet addresses', { user: userWallet.address })

		const linkDetails: interfaces.IPeanutLinkDetails = {
			chainId: testingChainId,
			tokenAmount: 0.01,
			tokenType: TOKEN_TYPES.ERC20,
			tokenAddress: '0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97', // USDC
			tokenDecimals: 6,
		}

		const password = '12345678'

		const { payload, message } = await makeGaslessDepositPayload({
			address: userWallet.address,
			contractVersion: 'v4.2',
			password,
			linkDetails,
		})
		console.log('Result', { payload }, { message })

		const userDepositSignature = await userWallet._signTypedData(message.domain, message.types, message.values)
		console.log('Signature', userDepositSignature)

		const result = await makeDepositGasless({
			APIKey: apiKey,
			payload,
			signature: userDepositSignature,
			baseUrl: 'http://localhost:8000/deposit-3009',
		})
		console.log('Result from the API', result)
		expect(result.txHash).toBeDefined()

		await provider.waitForTransaction(result.txHash)
		console.log('The transaction has been executed!')

		const { links } = await getLinksFromTx({
			linkDetails,
			txHash: result.txHash,
			passwords: [password],
		})
		expect(links.length).toBe(1)

		const linkInfo = await getLinkDetails({
			link: links[0],
		})
		expect(linkInfo.claimed).toBe(false)
		expect(linkInfo.tokenAmount).toBe(String(linkDetails.tokenAmount))

		console.log('Congrats!! Test successful!')
	}, 120000)

	// Tests the entire flow from the client to the server for gasless reclaims
	// Requirements for the test:
	// 1. On polygon mumbai, in peanut v4.2, there is a deposit
	// with index `depositIndex` that is owned by TEST_WALLET_PRIVATE_KEY
	// 2. TEST_WALLET_PRIVATE_KEY2 owns some MATIC to execute transactions
	test('make a gasless reclaim', async () => {
		const testingChainId = '80001'
		const provider = await getDefaultProvider(String(testingChainId))
		const userWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)
		console.log('Wallet addresses', { user: userWallet.address })

		const { link } = await createLink({
			structSigner: {
				signer: userWallet,
				maxPriorityFeePerGas: BigNumber.from(1500000000),
			},
			linkDetails: {
				chainId: testingChainId,
				tokenAmount: 0.01,
				tokenDecimals: 18,
				tokenAddress: constants.AddressZero,
			},
		})
		console.log('Created link', link)

		let linkDetails = await getLinkDetails({ link, provider })

		const { payload, message } = await makeGaslessReclaimPayload({
			address: userWallet.address,
			contractVersion: 'v4.2',
			depositIndex: linkDetails.depositIndex,
			chainId: testingChainId,
		})
		console.log('Result', { payload }, { message })

		const userDepositSignature = await userWallet._signTypedData(message.domain, message.types, message.values)
		console.log('Signature', userDepositSignature)

		const result = await makeReclaimGasless({
			APIKey: apiKey,
			payload,
			signature: userDepositSignature,
			baseUrl: 'http://localhost:8000/reclaim',
		})
		console.log('Result from the API', result)

		await provider.waitForTransaction(result.txHash)
		console.log('The transaction has been executed!')

		// Check that the link is now claimed
		linkDetails = await getLinkDetails({ link, provider })
		expect(linkDetails.claimed).toBe(true)

		console.log('Congrats!! Test successful!')
	}, 120000)
})
