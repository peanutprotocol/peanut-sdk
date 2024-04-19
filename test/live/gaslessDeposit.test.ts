import peanut, { interfaces } from '../../src'
import { BigNumber, constants, ethers } from 'ethersv5' // v5
import * as consts from './test.consts'
import * as utils from './test.utils'

describe('gasless deposit', () => {
	it('should make and claim a gasless deposit', async () => {
		peanut.toggleVerbose(true)

		const testingChainId = '137'
		const provider = await peanut.getDefaultProvider(testingChainId)
		const userWallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY ?? '', provider)
		const relayerWallet = new ethers.Wallet(consts.TEST_RELAYER_PRIVATE_KEY ?? '', provider)

		const linkDetails: interfaces.IPeanutLinkDetails = {
			chainId: testingChainId,
			tokenAmount: 0.01,
			tokenType: peanut.TOKEN_TYPES.ERC20,
			tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC
			tokenDecimals: 6,
		}

		const password = await peanut.getRandomString(16)

		const contractVersion = peanut.getLatestContractVersion({
			chainId: testingChainId,
			type: 'normal',
		})

		const { payload, message } = await peanut.makeGaslessDepositPayload({
			address: userWallet.address,
			contractVersion: contractVersion,
			password,
			linkDetails,
		})
		console.log('Result', { payload }, { message })

		const userDepositSignature = await userWallet._signTypedData(message.domain, message.types, message.values)
		console.log('Signature', userDepositSignature)

		const unsignedTx = await peanut.prepareGaslessDepositTx({
			provider,
			payload,
			signature: userDepositSignature,
		})

		let txOptions
		try {
			txOptions = await peanut.setFeeOptions({
				chainId: testingChainId,
			})
		} catch (error: any) {
			console.log('error setting fee options, fallback to default')
		}
		const { tx, txHash } = await peanut.signAndSubmitTx({
			structSigner: {
				signer: relayerWallet,
				eip1559: true,
				maxPriorityFeePerGas: txOptions?.maxPriorityFeePerGas ?? BigNumber.from(2 * 1e9),
				gasLimit: txOptions?.gasLimit ?? BigNumber.from(300000),
			},
			unsignedTx,
		})
		console.log('Submitted transaction! Tx hash:', txHash)

		await tx.wait()
		console.log('The transaction has been executed!')

		const { links } = await peanut.getLinksFromTx({
			linkDetails,
			txHash: txHash,
			passwords: [password],
		})

		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before claiming

		const claimLinkResponse = await peanut.claimLinkGasless({
			link: links[0],
			recipientAddress: userWallet.address,
			APIKey: consts.PEANUT_DEV_API_KEY ?? '',
			baseUrl: consts.PEANUT_API_URL,
		})

		expect(claimLinkResponse.txHash).toBeDefined()
	}, 120000)

	it.only('make a gasless reclaim', async () => {
		const testingChainId = '137'
		const provider = await peanut.getDefaultProvider(String(testingChainId))
		const userWallet = new ethers.Wallet(consts.TEST_WALLET_PRIVATE_KEY ?? '', provider)
		const relayerWallet = new ethers.Wallet(consts.TEST_RELAYER_PRIVATE_KEY ?? '', provider)

		const { link } = await peanut.createLink({
			structSigner: {
				signer: userWallet,
			},
			linkDetails: {
				chainId: testingChainId,
				tokenAmount: 0.0001,
				tokenDecimals: 18,
				tokenAddress: constants.AddressZero,
			},
		})
		console.log('Created link', link)

		let linkDetails = await peanut.getLinkDetails({ link, provider })

		const contractVersion = peanut.getLatestContractVersion({
			chainId: testingChainId,
			type: 'normal',
		})

		const { payload, message } = await peanut.makeGaslessReclaimPayload({
			address: userWallet.address,
			contractVersion: contractVersion,
			depositIndex: linkDetails.depositIndex,
			chainId: testingChainId,
		})
		console.log('Gasless reclaim payload', { payload }, { message })

		const userDepositSignature = await userWallet._signTypedData(message.domain, message.types, message.values)
		console.log('Signature', userDepositSignature)

		const unsignedTx = await peanut.prepareGaslessReclaimTx({
			provider,
			payload,
			signature: userDepositSignature,
		})

		let txOptions
		try {
			txOptions = await peanut.setFeeOptions({
				chainId: testingChainId,
			})
		} catch (error: any) {
			console.log('error setting fee options, fallback to default')
		}

		const { tx } = await peanut.signAndSubmitTx({
			structSigner: {
				signer: relayerWallet,
				eip1559: true,
				maxPriorityFeePerGas: txOptions?.maxPriorityFeePerGas ?? BigNumber.from(2 * 1e9),
				gasLimit: txOptions?.gasLimit ?? BigNumber.from(300000),
			},
			unsignedTx,
		})
		await tx.wait()

		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second

		// Check that the link is now claimed
		linkDetails = await peanut.getLinkDetails({ link, provider })
		expect(linkDetails.claimed).toBe(true)
	}, 120000)
})
