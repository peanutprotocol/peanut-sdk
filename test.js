
import { ethers } from 'ethersv5'

const rpc_url = "https://polygon-mainnet.infura.io/v3/c710a08b1dd6455b9090ec10aed18a96"
const provider = new ethers.providers.JsonRpcProvider(rpc_url)

const feeData = await provider.getFeeData(provider)
console.log(feeData)
