import {
	TOKEN_TYPES,
	prepareGaslessDepositTx,
	prepareGaslessReclaimTx,
	getDefaultProvider,
	getLinkDetails,
	getLinkFromParams,
	makeGaslessDepositPayload,
	makeGaslessReclaimPayload,
	signAndSubmitTx,
} from '../../src/index' // import directly from source code
import { BigNumber, ethers } from 'ethersv5' // v5
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY
const TEST_WALLET_PRIVATE_KEY2 = process.env.TEST_WALLET_PRIVATE_KEY2

describe('gasless functionality', () => {
	// Tests the entire flow from the client to the server for gasless deposits
	// Requirements for the test:
	// 1. TEST_WALLET_PRIVATE_KEY owns at least 0.01 of mumbai USDC
	// 2. TEST_WALLET_PRIVATE_KEY2 owns some MATIC to execute transactions
	test('make a gasless deposit', async () => {
		const testingChainId = 80001
		const provider = await getDefaultProvider(String(testingChainId))
		const userWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)
		const relayerWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY2 ?? '', provider)
		console.log('Wallet addresses', { user: userWallet.address, relayer: relayerWallet.address })

		const { payload, message } = await makeGaslessDepositPayload({
			address: userWallet.address,
			contractVersion: 'v4.2',
			password: '12345678',
			linkDetails: {
				chainId: testingChainId,
				tokenAmount: 0.01,
				tokenType: TOKEN_TYPES.ERC20,
				tokenAddress: '0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97', // USDC
				tokenDecimals: 6,
			},
		})
		console.log('Result', { payload }, { message })

		const userDepositSignature = await userWallet._signTypedData(message.domain, message.types, message.values)
		console.log('Signature', userDepositSignature)

		const unsignedTx = await prepareGaslessDepositTx({
			provider,
			payload,
			signature: userDepositSignature,
		})
		const { tx } = await signAndSubmitTx({
			structSigner: {
				signer: relayerWallet,
				eip1559: true,
				maxPriorityFeePerGas: BigNumber.from(2 * 1e9),
				gasLimit: BigNumber.from(300000),
			},
			unsignedTx,
		})

		await tx.wait()
		console.log('Congrats! Test successful!')
	}, 30000) // 30 seconds timeout

	// Tests the entire flow from the client to the server for gasless reclaims
	// Requirements for the test:
	// 1. On polygon mumbai, in peanut v4.2, there is a deposit
	// with index `depositIndex` that is owned by TEST_WALLET_PRIVATE_KEY
	// 2. TEST_WALLET_PRIVATE_KEY2 owns some MATIC to execute transactions
	test('make a gasless reclaim', async () => {
		const testingChainId = 80001
		const depositIndex = 6 // must be a withdrawable deposit
		const provider = await getDefaultProvider(String(testingChainId))
		const userWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)
		const relayerWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY2 ?? '', provider)
		console.log('Wallet addresses', { user: userWallet.address, relayer: relayerWallet.address })

		const link = getLinkFromParams(
			testingChainId,
			'v4.2',
			depositIndex,
			'12345678' // password - doesn't matter, we only check "claimed" status
		)
		// Make sure that the link exists and is not claimed
		let linkDetails = await getLinkDetails({ link, provider })
		expect(linkDetails.claimed).toBe(false)

		const { payload, message } = await makeGaslessReclaimPayload({
			address: userWallet.address,
			contractVersion: 'v4.2',
			depositIndex,
			chainId: testingChainId,
		})
		console.log('Result', { payload }, { message })

		const userDepositSignature = await userWallet._signTypedData(message.domain, message.types, message.values)
		console.log('Signature', userDepositSignature)

		const unsignedTx = await prepareGaslessReclaimTx({
			provider,
			payload,
			signature: userDepositSignature,
		})
		const { tx } = await signAndSubmitTx({
			structSigner: {
				signer: relayerWallet,
				eip1559: true,
				maxPriorityFeePerGas: BigNumber.from(2 * 1e9),
				gasLimit: BigNumber.from(300000),
			},
			unsignedTx,
		})
		await tx.wait()

		// Check that the link is now claimed
		linkDetails = await getLinkDetails({ link, provider })
		expect(linkDetails.claimed).toBe(true)

		console.log('Congrats! Test successful!')
	}, 30000) // 30 seconds timeout
})
