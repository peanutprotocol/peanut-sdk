import { ethers } from 'ethersv5'
import peanut from '../src/index' // import directly from source code
import dotenv from 'dotenv'
import { describe, it, expect } from '@jest/globals'

dotenv.config()

describe('Peanut SDK tests', function () {
	it('should create and claim link', async function () {
		// goerli
		const CHAINID = 5
		const RPC_URL = 'https://goerli.blockpi.network/v1/rpc/public' //'https://rpc.goerli.eth.gateway.fm'

		const wallet = new ethers.Wallet(
			process.env.TEST_WALLET_PRIVATE_KEY ?? '',
			new ethers.providers.JsonRpcBatchProvider(RPC_URL)
		)
		console.log('Using ' + wallet.address)
		let link = 'https://peanut.to/claim#?c=5&v=v5&i=27&p=N5zPNFggvTqVeKt5&t=sdk'

		if (link.length == 0) {
			// create link
			console.log('No link supplied, creating..')
			const createLinkResponse = await peanut.createLink({
				structSigner: {
					signer: wallet,
				},
				linkDetails: {
					chainId: CHAINID,
					tokenAmount: 0.1,
					tokenType: 0, // 0 is for native tokens
				},
				peanutContractVersion: 'v5',
			})

			link = createLinkResponse.link
			console.log('New link: ' + link)
		} else {
			console.log('Link supplied : ' + link)
		}

		// get status of link
		const getLinkDetailsResponse = await peanut.getLinkDetails({
			link,
			provider: wallet.provider,
		})
		console.log('The link is claimed: ' + getLinkDetailsResponse.claimed)

		// claim link
		// const claimTx = await peanut.claimLinkXChain(
		// 	{
		// 		signer: wallet,
		// 		gasLimit: ethers.BigNumber.from(1000000),
		// 	},
		// 	link,
		// 	59140 // linea testnet / 421613 arbitrum / 43113 avax and appear to be supported

		//     )

		const claimTx = await peanut.claimLinkXChain({
			structSigner: {
				signer: wallet,
			},
			link: link,
			destinationChainId: '421613',
			isTestnet: true,
			maxSlippage: 1.0,
			recipient: await wallet.getAddress(), // replace with actual recipient address
		})

		console.log('success: x claimTx: ' + claimTx.txHash)

		// Add your assertions here
		expect(claimTx).toBeTruthy()
		expect(claimTx.txHash).toBeDefined()
	}, 60000) // Increase timeout if necessary
})
