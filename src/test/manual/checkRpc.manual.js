import peanut from '@squirrel-labs/peanut-sdk'
import { ethers } from 'ethersv5' // v5

const provider = await peanut.getDefaultProvider('137')
// try getting block number and balance of zero adddress
const blockNumber = await provider.getBlockNumber()
expect(blockNumber).toBeGreaterThan(0)
const balance = await provider.getBalance(ethers.constants.AddressZero)
console.log('balance: ', balance)
