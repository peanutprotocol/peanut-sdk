// import peanut from '@squirrel-labs/peanut-sdk'
import peanut from '../../../index.js' // import directly from source code
import { ethers } from 'ethers' // ethers v6
import dotenv from 'dotenv'
dotenv.config({ path: '../../../.env' })

////////////////////////////////////////////////////////////
// replace with ethers signer from browser wallet
// const CHAINID = 5; // goerli
// const RPC_URL = "https://rpc.ankr.com/eth_goerli";
const CHAINID = 137 // matic mainnet
const RPC_URL = peanut.CHAIN_DETAILS[String(CHAINID)].rpc[0]
console.log('RPC_URL: ', RPC_URL)

// create goerli wallet with optimism rpc
const provider = new ethers.providers.JsonRpcBatchProvider(RPC_URL)
const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, provider)
////////////////////////////////////////////////////////////

const deposits = await peanut.getAllDeposits({ signer: wallet, chainId: CHAINID })
