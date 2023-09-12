
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


// console.log(await peanut.checkRpc('https://rpc.goerli.eth.gateway.fm'))
// console.log(await peanut.checkRpc('https://rpc.goerli.optimism.gateway.fm'))
// console.log(await peanut.checkRpc('https://polygon-mainnet.infura.io/v3/' + INFURA_API_KEY))
const defaultProvider = await peanut.getDefaultProvider("137", true)
console.log(defaultProvider.connection.url)
console.log(await peanut.checkRpc(defaultProvider.connection.url))
const blockNumber = await defaultProvider.getBlockNumber()
const walletBalance = await defaultProvider.getBalance("0xd9bfc89d0186dbb0c7c0ab27196ccbb1ea64bc6a")
const network = await defaultProvider.getNetwork()

console.log(blockNumber, walletBalance, network)

console.log(walletBalance)
// should have 1 usdc inside
const linkDetails = await peanut.getLinkDetails({
    // link, RPCProvider: polygonProvider // this works
    link // this doesn't work

})
console.log(linkDetails)