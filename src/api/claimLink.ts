import { BigNumber, Signer, ethers } from 'ethersv5'
import { JsonRpcProvider } from '@ethersproject/providers'
import {
	assert,
	generateKeysFromString,
	getAbstractSigner,
	getParamsFromLink,
	signAddress,
	solidityHashAddress,
	solidityHashBytesEIP191,
} from '../common/index'
import {
	getContract,
	setFeeOptions
} from './'

interface ClaimLinkPram {
	signer: Signer
	link: string
	recipient?: string | null
	verbose?: boolean
	maxFeePerGas?: number | bigint | BigNumber | null
	maxPriorityFeePerGas?: number | bigint | BigNumber | null
	gasLimit?: number | bigint | BigNumber | null
	eip1559?: boolean
}

/**
 * Claims the contents of a link
 *
 * @param {ClaimLinkPram} options - An object containing the options to use for claiming the link
 * @param {Signer} options.signer - The signer to use for claiming
 * @param {string} options.link - The link to claim
 * @param {string} [options.recipient=null] - The address to claim the link to. Defaults to the signer's address if not provided
 * @param {boolean} [options.verbose=false] - Whether or not to print verbose output
 * @returns {Object} - The transaction receipt
 */
export async function claimLink({
	signer,
	link,
	recipient = null,
	verbose = false,
	maxFeePerGas = null,
	maxPriorityFeePerGas = null,
	gasLimit = null,
	eip1559 = true,
}: ClaimLinkPram) {
	// claims the contents of a link
	assert(!!signer, 'signer arg is required')
	assert(!!link, 'link arg is required')

	signer = await getAbstractSigner(signer)

	const params = getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	if (recipient == null) {
		recipient = await signer.getAddress()
		verbose && console.log('recipient not provided, using signer address: ', recipient)
	}

	assert(!!password, 'password is required')
	assert(!!contractVersion, 'contractVersion is required')

	const keys = generateKeysFromString(password!) // deterministically generate keys from password
	const contract = await getContract(chainId, signer, contractVersion!)

	// cryptography
	var addressHash = solidityHashAddress(recipient)
	var addressHashBinary = ethers.utils.arrayify(addressHash) // v5
	verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
	var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
	var signature = await signAddress(recipient, keys.privateKey) // sign with link keys

	if (verbose) {
		// print the params
		console.log('params: ', params)
		console.log('addressHash: ', addressHash)
		console.log('addressHashEIP191: ', addressHashEIP191)
		console.log('signature: ', signature)
	}

	// Prepare transaction options
	let txOptions = {}
	txOptions = await setFeeOptions({
		txOptions,
		provider: signer.provider as JsonRpcProvider,
		eip1559,
		maxFeePerGas,
		maxPriorityFeePerGas,
		gasLimit,
		verbose,
	})

	const claimParams = [depositIdx, recipient, addressHashEIP191, signature]
	verbose && console.log('claimParams: ', claimParams)

	// withdraw the deposit
	const tx = await contract.withdrawDeposit(...claimParams, txOptions)
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	const txReceipt = await tx.wait()

	return txReceipt
}
