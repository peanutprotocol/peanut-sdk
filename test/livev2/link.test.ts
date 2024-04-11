import { CHAIN_DETAILS } from "../../src"
import peanut from '../../src/index' // import directly from source code

import * as interfaces from '../../src/consts/interfaces.consts'
import { ethers } from "ethersv5"

const TEST_WALLET_PRIVATE_KEY = '66621003b3e0171faf9e51a6c537c05718d3024b11fdb51f885f476f753376a1'

async function waitForTransaction(provider, txHash, timeout = 60000) {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		const receipt = await provider.getTransactionReceipt(txHash) 
		if (receipt && receipt.blockNumber) {
			return receipt
		}
		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before retrying
	}

	throw new Error('Transaction was not confirmed within the timeout period.')
}
async function createAndClaimLink(options: interfaces.ICreateLinkParams, inbetweenDelay = 1000) {
	const response = await peanut.createLink(options)
	if (response.link) {
		await waitForTransaction(options.structSigner.signer.provider, response.txHash)
	}
	console.log('Link created: ' + response.link)
	await new Promise((res) => setTimeout(res, inbetweenDelay)) // Wait for 1 second before claiming
	return peanut.claimLink({
		structSigner: {
			signer: options.structSigner.signer,
		},
		link: response.link,
	})
}
describe('create and claim normal link tests', ()=>{

    test.each(Object.keys(CHAIN_DETAILS))('Should have the latest contract version for chain %s deployed',async function (chainId){
        console.log('chainId', chainId)
        const provider = await peanut.getDefaultProvider(CHAIN_DETAILS[chainId].chainId)
        const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY ?? '', provider)

        const balance = await wallet.getBalance()
        console.log('balance', balance.toString())

        const response = await createAndClaimLink({
            structSigner: {signer: wallet}, 
            linkDetails:{
                chainId: CHAIN_DETAILS[chainId].chainId,
                tokenAmount: 0.000001,
                tokenType: 0
            }
        })

        expect(response).toHaveProperty('txHash')        
    }, 1000000)
})