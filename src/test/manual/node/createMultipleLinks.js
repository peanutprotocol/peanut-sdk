// import peanut from '@squirrel-labs/peanut-sdk'
import peanut from '../../../index.js' // can also import directly from source code if clone repo
import { ethers } from 'ethers' // ethers v5
import dotenv from 'dotenv'
dotenv.config({ path: '../../../.env' })

console.log('Peanut Version: ', peanut.version)

////////////////////////////////////////////////////////////
const CHAIN_ID = 56
const TOKEN_AMOUNT = 0.0001
const NUM_LINKS = 1
const PEANUT_DEV_API_KEY = process.env.PEANUT_DEV_API_KEY
const RPC_URL = peanut.CHAIN_DETAILS[String(CHAIN_ID)].rpc[0] // choose which rpc to use from the list, or add your own
const CHAIN_NAME = peanut.CHAIN_DETAILS[String(CHAIN_ID)].name
console.log('Chain Name: ', CHAIN_NAME, 'Chain ID: ', CHAIN_ID)
console.log('RPC_URL: ', RPC_URL)

// create wallet
const provider = new ethers.providers.JsonRpcBatchProvider(RPC_URL)
const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, provider)
////////////////////////////////////////////////////////////

// create links
const links = []
for (let i = 0; i < NUM_LINKS; i++) {
	const { link, txReceipt } = await peanut.createLink({
		signer: wallet,
		chainId: CHAIN_ID,
		tokenAmount: TOKEN_AMOUNT,
		tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
		verbose: true,
	})
	console.log('Link: ', link)
	links.push(link)
}

console.log('links: ', links)
