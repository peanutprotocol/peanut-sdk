// import peanut from '@squirrel-labs/peanut-sdk'
// import peanut from '../../index.ts' // can also import directly from source code if clone repo
import peanut from './dist/peanut-sdk.node.js' // can also import directly from source code if clone repo
// import peanut from './dist/peanut-sdk.browser.js' // can also import directly from source code if clone repo
import { ethers } from 'ethersv5' // ethers v5
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

console.log('Peanut Version: ', peanut.version)

////////////////////////////////////////////////////////////
const CHAIN_ID = 137
const TOKEN_AMOUNT = 0.001
const TOKEN_TYPE = 0
const TOKEN_ADDRESS = ethers.constants.AddressZero
const TOKEN_DECIMALS = 18
const NUM_LINKS = 30
// const CHAIN_ID = 42161
// const TOKEN_AMOUNT = 1
// const TOKEN_TYPE = 1
// const TOKEN_ADDRESS = "0xaf88d065e77c8cc2239327c5edb3a432268e5831"
// const TOKEN_DECIMALS = 6
// const NUM_LINKS = 100

const PEANUT_DEV_API_KEY = process.env.PEANUT_DEV_API_KEY
const RPC_URL = peanut.CHAIN_DETAILS[String(CHAIN_ID)].rpc[0].replace('${INFURA_API_KEY}', process.env.INFURA_API_KEY)
const CHAIN_NAME = peanut.CHAIN_DETAILS[String(CHAIN_ID)].name
console.log('Chain Name: ', CHAIN_NAME, 'Chain ID: ', CHAIN_ID)
console.log('RPC_URL: ', RPC_URL)

// create wallet
const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, provider)
// test provider with simple call
const blockNumber = await provider.getBlockNumber()
const balance = await provider.getBalance(wallet.address)
console.log
console.log('blockNumber: ', blockNumber)
console.log('balance: ', balance.toString())
console.log(await provider.send('eth_chainId', []))
////////////////////////////////////////////////////////////

console.log(await provider.send('eth_chainId', []))

console.log(await provider.getBlockNumber())
console.log(await provider.getBalance('0x0000000000000000000000000000000000000000'))

const defaultProvider = await peanut.getDefaultProvider(String(CHAIN_ID))
console.log('defaultProvider: ', defaultProvider)

// create links
const { links, txReceipt } = await peanut.createLinks({
	structSigner: { signer: wallet },
	linkDetails: {
		chainId: CHAIN_ID,
		tokenAmount: TOKEN_AMOUNT,
		tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
		tokenAddress: TOKEN_ADDRESS,
		tokenDecimals: TOKEN_DECIMALS,
	},
	numberOfLinks: NUM_LINKS,

	// signer: wallet,
	// chainId: CHAIN_ID,
	// tokenAmount: TOKEN_AMOUNT,
	// numberOfLinks: NUM_LINKS,
	// tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	// tokenAddress: TOKEN_ADDRESS,
	// tokenDecimals: TOKEN_DECIMALS,
	// verbose: true,
	// gasLimit: 300000 * NUM_LINKS, // 500k gas per link
})

console.log('links: ', links)
console.log('txHash: ', txReceipt.transactionHash)

// // claim links
// for (let i = 0; i < links.length; i++) {
//     console.log('Link ' + i + ': ' + links[i])
//     const link = links[i]
//     const txReceipt = await peanut.claimLink({
// 		signer: wallet,
// 		link: link,
// 		verbose: true,
// 	})
//     console.log('txHash: ', txReceipt.transactionHash)
// }

////// store as json file
import fs from 'fs'

function saveLinksToFile(newLinks) {
	const filePath = 'links.json'

	fs.readFile(filePath, 'utf8', (err, data) => {
		let linksToSave = []

		// If file exists and has content, parse it.
		if (!err && data) {
			linksToSave = JSON.parse(data)
		}

		// Append new links.
		linksToSave.push(...newLinks)

		// Write the combined data back to the file.
		fs.writeFile(filePath, JSON.stringify(linksToSave, null, 2), (writeErr) => {
			if (writeErr) {
				console.error('Error writing file:', writeErr)
			} else {
				console.log('New links appended to links.json')
			}
		})
	})
}

saveLinksToFile(links)
