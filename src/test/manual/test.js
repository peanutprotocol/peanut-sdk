import peanut from '../index' // import directly from source code
import { ethers } from 'ethersv5' // v5

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY
const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm'
const OPTIMISM_GOERLI_RPC_URL = 'https://rpc.goerli.optimism.gateway.fm'
const INFURA_API_KEY = process.env.INFURA_API_KEY
// const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL); // v6
const goerliProvider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL) // v5
const optimismGoerliProvider = new ethers.providers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL) // v5
// const optimismGoerliProvider = new ethers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v6

/** simple usdc test */
const link = 'https://peanut.to/claim?c=137&v=v3&i=1479&p=NMuAQpGTV7KvtGQD'
const polygonProviderUrl = 'https://polygon-mainnet.infura.io/v3/' + INFURA_API_KEY
const polygonProvider = new ethers.providers.JsonRpcProvider(polygonProviderUrl)
console.log('before gfp')
console.log(await peanut.checkRpc('https://polygon-rpc.com'))

// const defaultProvider = await peanut.getDefaultProvider("137", true)
// console.log('after gfp')
// const polygonWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, polygonProvider)
// // test default provider by getting blocknumber and wallet balance
// const blockNumber = await defaultProvider.getBlockNumber()
// console.log(blockNumber)

// console.log(await defaultProvider.getBalance("0xCEd763C2Ff8d5B726b8a5D480c17C24B6686837F"))

// // should have 1 usdc inside
// const linkDetails = await peanut.getLinkDetails({
//     // link, RPCProvider: polygonProvider // this works
//     link // this doesn't work

// })
// console.log(linkDetails)
