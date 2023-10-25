import { peanut } from '@squirrel-labs/peanut-sdk'
import { ethers } from 'ethers'
import assert from 'assert'

async function claimLinkXChain(
	structSigner,
	link,
	destinationChainId,
	destinationTokenAddress,
	maxSlippage = 1.0, // (e.g. 0.x - x.y, example from SDK is 1.0 which is ~ 1%)
	recipient = null
) {
	const config = { verbose: true }

	const signer = structSigner.signer
	const params = peanut.getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	if (recipient == null) {
		recipient = await signer.getAddress()
		config.verbose && console.log('recipient not provided, using signer address: ', recipient)
	}
	const keys = peanut.generateKeysFromString(password)
	const contract = await peanut.getContract(String(chainId), signer, contractVersion)

	// Need to check information about the link
	const linkDetails = await peanut.getLinkDetails({ link: link })

	assert(linkDetails.tokenType < 2, 'Only type 0/1 supported for x-chain')

	// TODO: check if the requested tokens are within the routing information available
	// this can be done by checking access using squid.chains and squid.tokens and bailing
	// if they do not appear on the list. Note, we don't have to do this here as when we
	// query the Squid API for a route it will fail if the chain or tokens are not supported

	var sourceToken = linkDetails.tokenAddress
	var destinationToken = destinationTokenAddress

	if (sourceToken == '0x0000000000000000000000000000000000000000') {
		assert(linkDetails.tokenType == 0, 'Native token address passed for non-native token link type')
		// Update for Squid compatibility
		console.log('Source token is 0x0000, converting to 0xEeee..')
		sourceToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	if (destinationToken == '0x0000000000000000000000000000000000000000' || destinationToken == null) {
		console.log('Destination token is 0x0000, converting to 0xEeee..')
		// Update for Squid compatibility
		destinationToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	// get wei of amount being withdrawn and send as string (e.g. "10000000000000000")
	// TODO DANGER : this assumes 18 dp and needs to match the input token decimals
	const tokenAmount = (linkDetails.tokenAmount * Math.pow(10, 18)).toString()
	console.log('tokenAmount (link details) : ' + linkDetails.tokenAmount)
	console.log('tokenAmount (str) : ' + tokenAmount)

	// Call squid to get routing information

	const { route } = await peanut.getSquidRoute(
		true, // is testnet
		chainId,
		sourceToken,
		tokenAmount,
		destinationChainId,
		destinationToken,
		recipient,
		recipient,
		maxSlippage
	)

	// TODO check if route is possible or failed due to slippage etc
	if (route.transactionRequest == null) {
		// TODO better error description and code needed
		console.error('Failed to get x-chain route')
		return {
			status: new interfaces.SDKStatus(interfaces.EClaimLinkStatusCodes.ERROR),
			txHash: null,
		}
	}

	console.log('Squid route calculated :)')

	console.log(recipient)
	console.log(route.transactionRequest.targetAddress)
	console.log(route.transactionRequest.data)

	// cryptography

	const squidDataHash = ethers.utils.solidityKeccak256(['address'], [route.transactionRequest.data])

	// Combine into an single block and hash again
	const combinedPayload = ethers.utils.solidityPack(
		['address', 'address', 'bytes32', 'uint256'],
		[recipient, route.transactionRequest.targetAddress, squidDataHash, route.transactionRequest.value]
	)
	console.log('combined : ', combinedPayload)
	console.log('..')

	const hash1 = ethers.utils.solidityKeccak256(['address'], [combinedPayload])
	console.log('hash1: ', hash1)

	const hashEIP191 = peanut.solidityHashBytesEIP191(ethers.utils.arrayify(hash1))
	const signature = await peanut.signAddress(hashEIP191, keys.privateKey) // sign with link keyss

	if (config.verbose) {
		// print the params
		console.log('params: ', params)
		//console.log('addressHash: ', addressHash)
		console.log('hashEIP191: ', hashEIP191)
		console.log('signature: ', signature)
	}

	// Prepare transaction options
	let txOptions = {}
	txOptions = await peanut.setFeeOptions({
		txOptions,
		provider: signer.provider,
		// eip1559,
		// maxFeePerGas,
		// maxPriorityFeePerGas,
		// gasLimit,
		// verbose,
	})

	const claimParams = [
		// Peanut link details
		depositIdx,
		recipient,
		// Squid params to mediate execution
		route.transactionRequest.data,
		route.transactionRequest.value,
		route.transactionRequest.targetAddress,
		// Auth details
		hashEIP191,
		signature,
	]

	config.verbose && console.log('claimParams: ', claimParams)
	config.verbose && console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')

	// withdraw the deposit
	const tx = await contract.withdrawDepositXChain(...claimParams, txOptions)
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	const txReceipt = await tx.wait()

	const axelarScanLink = 'https://testnet.axelarscan.io/gmp/' + txReceipt.transactionHash
	console.log('Success : ' + axelarScanLink)

	return {
		status: 'OK', //new interfaces.SDKStatus(interfaces.EClaimLinkStatusCodes.SUCCESS),
		txHash: txReceipt.transactionHash,
	}
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// init and create link if needed

// goerli
const CHAINID = 5
const RPC_URL = 'https://goerli.blockpi.network/v1/rpc/public' //'https://rpc.goerli.eth.gateway.fm'

const wallet = new ethers.Wallet('KEY', new ethers.providers.JsonRpcProvider(RPC_URL))
console.log('Using ' + wallet.address)

var link = ''

if (link.length == 0) {
	// create link
	console.log('No link supplied, creating..')
	const createLinkResponse = await peanut.createLink({
		structSigner: {
			signer: wallet,
		},
		linkDetails: {
			chainId: CHAINID,
			tokenAmount: 0.001,
			// Values for tokenType are defined in SDK documentation:
			// https://docs.peanut.to/integrations/building-with-the-sdk/sdk-reference/common-types#epeanutlinktype
			tokenType: 0, // 0 is for native tokens
		},
	})

	link = createLinkResponse.createdLink.link[0]
	console.log('New link: ' + link)
} else {
	console.log('Link supplied : ' + link)
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// x-chain claim ..

const provider = wallet.provider

// get status of link
const getLinkDetailsResponse = await peanut.getLinkDetails({
	link,
	provider,
})
console.log('The link is claimed: ' + getLinkDetailsResponse.claimed)

// claim link
const claimTx = await claimLinkXChain(
	//peanut.claimLinkXChain
	{
		signer: wallet,
	},
	link,
	43113 // 421613 arbitrum / 43113 avax and appear to be supported
)

console.log('success: ' + claimTx.success + 'claimTx: ' + claimTx.txHash)
