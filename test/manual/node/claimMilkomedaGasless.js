// import peanut from '@squirrel-labs/peanut-sdk'
import peanut from '../../../index.js' // import directly from source code
import { ethers } from 'ethers' // ethers v6
import dotenv from 'dotenv'
dotenv.config({ path: '../../../.env' })

console.log('Peanut Version: ', peanut.version)

////////////////////////////////////////////////////////////
// replace with ethers signer from browser wallet
// const CHAINID = 5; // goerli
// const RPC_URL = "https://rpc.ankr.com/eth_goerli";
const CHAINID = 2001 // matic mainnet
const PEANUT_DEV_API_KEY = process.env.PEANUT_DEV_API_KEY
const RPC_URL = peanut.CHAIN_DETAILS[String(CHAINID)].rpc[0]
console.log('RPC_URL: ', RPC_URL)

// create goerli wallet with optimism rpc
const provider = new ethers.providers.JsonRpcBatchProvider(RPC_URL)
const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, provider)
////////////////////////////////////////////////////////////

const link = "https://peanut.to/claim?c=2001&v=v3&i=2&p=PQpNSo6nAZ2ox9OF&t=sdk"

const status = await peanut.getLinkStatus({ signer: wallet, link: link })
console.log('status: ', status)

const claimAddress = await wallet.getAddress()
// const localAPIUrl = "http://127.0.0.1:5001/claim"
const localAPIUrl = "local"
const res = await peanut.claimLinkGasless(link, claimAddress, PEANUT_DEV_API_KEY, true, localAPIUrl)
console.log('res: ', res)
