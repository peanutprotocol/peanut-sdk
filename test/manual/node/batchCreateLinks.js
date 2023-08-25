// import peanut from '@squirrel-labs/peanut-sdk'
import peanut from '../../../index.js' // can also import directly from source code if clone repo
import { ethers } from 'ethers' // ethers v5
import dotenv from 'dotenv'
dotenv.config({ path: '../../../.env' })

console.log('Peanut Version: ', peanut.version)

////////////////////////////////////////////////////////////
const CHAIN_ID = 137 // 80001 for mumbai, 5 for goerli
const TOKEN_AMOUNT = 0.0002
const TOKEN_TYPE = 0
const TOKEN_ADDRESS = ethers.constants.AddressZero
const TOKEN_DECIMALS = 18
const NUM_LINKS = 5
const PEANUT_DEV_API_KEY = process.env.PEANUT_DEV_API_KEY
const RPC_URL = peanut.CHAIN_DETAILS[String(CHAIN_ID)].rpc[0].replace('${INFURA_API_KEY}', process.env.INFURA_API_KEY)
const CHAIN_NAME = peanut.CHAIN_DETAILS[String(CHAIN_ID)].name
console.log('Chain Name: ', CHAIN_NAME, 'Chain ID: ', CHAIN_ID)
console.log('RPC_URL: ', RPC_URL)

// create wallet
const provider = new ethers.providers.JsonRpcBatchProvider(RPC_URL)
const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, provider)
////////////////////////////////////////////////////////////

// create links
const { links, txReceipt } = await peanut.createLinks({
	signer: wallet,
	chainId: CHAIN_ID,
	tokenAmount: TOKEN_AMOUNT,
	numberOfLinks: NUM_LINKS,
	tokenType: TOKEN_TYPE, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	tokenAddress: TOKEN_ADDRESS,
	tokenDecimals: TOKEN_DECIMALS,
	verbose: true,
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
