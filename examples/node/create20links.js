// import peanut from '@squirrel-labs/peanut-sdk';
import peanut from '../../index.js'
import { ethers } from 'ethers'
import dotenv from 'dotenv'
dotenv.config({ path: '../../.env' })

console.log('Ethers version: ', ethers.version)
console.log('Peanut version: ', peanut.version)

////////////////////////////////////////////////////////////
// replace with ethers signer from browser wallet
const CHAINID = 137 // polygon
const RPC_URL = 'https://polygon-rpc.com/'
const tokenType = 1
const tokenAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'
const tokenDecimals = 6
////////////////////////////////////////////////////////////
// create polygon wallet with optimism rpc
const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, new ethers.providers.JsonRpcProvider(RPC_URL))
////////////////////////////////////////////////////////////

// create link
const { link, txReceipt } = await peanut.createLink({
	signer: wallet,
	chainId: CHAINID,
	tokenAmount: 0.001,
	tokenAddress: tokenAddress,
	tokenDecimals: tokenDecimals,
	tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	verbose: true,
})

console.log('Link: ', link)

// create loop to create and print to console 20 links
// for (let i = 0; i < 20; i++) {
