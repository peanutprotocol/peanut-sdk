import { peanut } from '@squirrel-labs/peanut-sdk'
import { ethers } from 'ethers' // ethers v5.7.2
import dotenv from 'dotenv'
dotenv.config({ path: '../../.env' })

console.log('Ethers version: ', ethers.version)
console.log('Peanut version: ', peanut.version)

////////////////////////////////////////////////////////////
// replace with ethers signer from browser wallet
const CHAINID = 5 // goerli
const RPC_URL = 'https://rpc.ankr.com/eth_goerli'
////////////////////////////////////////////////////////////
// create goerli wallet with optimism rpc
const wallet = new ethers.Wallet(process.env.TEST_WALLET_PRIVATE_KEY, new ethers.providers.JsonRpcProvider(RPC_URL))
////////////////////////////////////////////////////////////

// create link
const { link } = await peanut.createLink({
	signer: wallet,
	chainId: CHAINID,
	tokenAmount: 0.001,
	tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	verbose: true,
})

// get status of link
await new Promise((r) => setTimeout(r, 3000))
var { claimed } = await peanut.getLinkStatus({
	signer: wallet,
	link: link,
})
console.log('The link is claimed: ', claimed)

// claim link
const res = await peanut.claimLinkGasless(link, wallet.address, process.env.PEANUT_DEV_API_KEY)
console.log('res: ', res)

// check status of link again
await new Promise((r) => setTimeout(r, 3000))
;({ claimed } = await peanut.getLinkStatus({
	signer: wallet,
	link: link,
}))
console.log('The link is claimed: ', claimed)
