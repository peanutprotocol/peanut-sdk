import peanut from '@squirrel-labs/peanut-sdk'
import { ethers } from 'ethers'

const CHAINID = 5 // goerli
const RPC_URL = 'https://rpc.goerli.eth.gateway.fm'

const mnemonic = 'announce room limb pattern dry unit scale effort smooth jazz weasel alcohol'
let walletMnemonic = ethers.Wallet.fromMnemonic(mnemonic)
const address = await walletMnemonic.getAddress()
console.log('Test address: ' + address)

const wallet = new ethers.Wallet(walletMnemonic.privateKey, new ethers.providers.JsonRpcProvider(RPC_URL))

// create link
const createLinkResponse = await peanut.createLink({
	structSigner: {
		signer: wallet,
	},
	linkDetails: {
		chainId: CHAINID,
		tokenAmount: 0.01,
		tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	},
})

console.log('New link: ' + createLinkResponse.createdLink.link[0])

const link = createLinkResponse.createdLink.link[0]
const provider = wallet.provider

// get status of link
const getLinkDetailsResponse = await peanut.getLinkDetails({
	link,
	provider,
})
console.log('The link is claimed: ' + getLinkDetailsResponse.claimed)

// claim link
const claimTx = await peanut.claimLink({
	structSigner: {
		signer: wallet,
	},
	link: link,
})
console.log('success: ' + claimTx.success + 'claimTx: ' + claimTx.txHash)
