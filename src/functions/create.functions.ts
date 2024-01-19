import * as ethers from 'ethersv5'

import * as consts from '../consts'
import * as utils from '../utils'
import * as config from '../config'
import * as data from '../data'
import * as functions from '../functions'
import * as interfaces from '../interfaces'

/**
 * Returns an array of transactions necessary to create a link (e.g. 1. approve, 2. makeDeposit)
 * all values obligatory
 *
 * @param address - The senders wallet address. This is NOT the token contract address.
 */
export async function prepareTxs({
	address,
	linkDetails,
	peanutContractVersion = null,
	batcherContractVersion = consts.LATEST_STABLE_BATCHER_VERSION,
	numberOfLinks = 1,
	passwords = [],
	provider,
}: interfaces.IPrepareTxsParams): Promise<interfaces.IPrepareTxsResponse> {
	if (!provider) {
		provider = await functions.getDefaultProvider(linkDetails.chainId)
	}

	if (peanutContractVersion == null) {
		peanutContractVersion = functions.getLatestContractVersion({
			chainId: linkDetails.chainId,
			type: 'normal',
		})
	}

	try {
		linkDetails = await utils.validateLinkDetails(linkDetails, passwords, numberOfLinks, provider)
	} catch (error) {
		console.error({ 'Error validating link details:': error })
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: please make sure all required fields are provided and valid'
		)
	}
	const tokenAmountString = utils.trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals)
	const totalTokenAmount = tokenAmountBigNum.mul(numberOfLinks)

	const unsignedTxs: ethers.providers.TransactionRequest[] = []
	let txOptions: interfaces.ITxOptions = {}
	if (!provider) {
		try {
			provider = await functions.getDefaultProvider(linkDetails.chainId)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_GETTING_DEFAULT_PROVIDER,
				'Error getting the default provider'
			)
		}
	}

	if (linkDetails.tokenType == interfaces.EPeanutLinkType.native) {
		txOptions = {
			...txOptions,
			value: totalTokenAmount,
		}
	} else if (linkDetails.tokenType == interfaces.EPeanutLinkType.erc20) {
		config.config.verbose && console.log('checking allowance...')
		try {
			let approveTx
			if (numberOfLinks == 1) {
				approveTx = await utils.prepareApproveERC20Tx(
					address,
					linkDetails.chainId,
					linkDetails.tokenAddress!,
					tokenAmountBigNum,
					linkDetails.tokenDecimals,
					true,
					peanutContractVersion,
					provider
				)
			} else {
				// approve to the batcher contract
				approveTx = await utils.prepareApproveERC20Tx(
					address,
					linkDetails.chainId,
					linkDetails.tokenAddress!,
					totalTokenAmount,
					linkDetails.tokenDecimals,
					true,
					batcherContractVersion,
					provider
				)
			}
			approveTx && unsignedTxs.push(approveTx)
			approveTx && config.config.verbose && console.log('approveTx:', approveTx)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_PREPARING_APPROVE_ERC20_TX,
				'Error preparing the approve ERC20 tx, please make sure you have enough balance and have approved the contract to spend your tokens'
			)
		}
	} else if (linkDetails.tokenType == interfaces.EPeanutLinkType.erc721) {
		config.config.verbose && console.log('checking ERC721 allowance...')
		try {
			const approveTx = await utils.prepareApproveERC721Tx(
				address,
				linkDetails.chainId,
				linkDetails.tokenAddress!,
				linkDetails.tokenId
			)

			approveTx && unsignedTxs.push(approveTx)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_PREPARING_APPROVE_ERC721_TX,
				'Error preparing the approve ERC721 tx, please make sure you have approved the contract to spend your tokens'
			)
		}
	} else if (linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155) {
		config.config.verbose && console.log('checking ERC1155 allowance...')
		// Note for testing https://goerli.etherscan.io/address/0x246c7802c82598bff1521eea314cf3beabc33197
		// can be used for generating and playing with 1155s
		try {
			const approveTx = await utils.prepareApproveERC1155Tx(
				address,
				linkDetails.chainId,
				linkDetails.tokenAddress!
			)

			approveTx && unsignedTxs.push(approveTx)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_PREPARING_APPROVE_ERC1155_TX,
				'Error preparing the approve ERC1155 tx, please make sure you have approved the contract to spend your tokens'
			)
		}
	} else {
		utils.assert(false, 'Unsupported link type')
	}

	if (passwords.length == 0) {
		passwords = await Promise.all(Array.from({ length: numberOfLinks }, () => utils.getRandomString(16)))
	}

	const keys = passwords.map((password) => utils.generateKeysFromString(password)) // deterministically generate keys from password

	let contract
	let depositParams
	let depositTx
	if (numberOfLinks == 1) {
		depositParams = [
			linkDetails.tokenAddress,
			linkDetails.tokenType,
			tokenAmountBigNum,
			linkDetails.tokenId,
			keys[0].address,
		]
		contract = await functions.getContract(linkDetails.chainId, provider, peanutContractVersion) // get the contract instance

		try {
			depositTx = await contract.populateTransaction.makeDeposit(...depositParams, txOptions)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
				error,
				'Error making the deposit to the contract'
			)
		}
	} else {
		depositParams = [
			data.PEANUT_CONTRACTS[linkDetails.chainId][peanutContractVersion], // The address of the PeanutV4 contract
			linkDetails.tokenAddress,
			linkDetails.tokenType,
			tokenAmountBigNum,
			linkDetails.tokenId,
			keys.map((key) => key.address),
		]
		contract = await functions.getContract(linkDetails.chainId, provider, batcherContractVersion) // get the contract instance

		try {
			depositTx = await contract.populateTransaction.batchMakeDeposit(...depositParams, txOptions)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
				'Error making the deposit to the contract'
			)
		}
	}

	unsignedTxs.push(depositTx)

	// if 2 or more transactions, assign them sequential nonces
	if (unsignedTxs.length > 1) {
		// txOptions.nonce = structSigner.nonce || (await structSigner.signer.getTransactionCount()) // no nonce anymore?
		let nonce
		try {
			nonce = await provider.getTransactionCount(address)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_GETTING_TX_COUNT,
				'Error getting the transaction count'
			)
		}

		unsignedTxs.forEach((tx, i) => (tx.nonce = nonce + i))
	}

	config.config.verbose && console.log('unsignedTxs: ', unsignedTxs)

	return {
		unsignedTxs: unsignedTxs.map((unsignedTx) => {
			const tx: interfaces.IPeanutUnsignedTransaction = {
				to: unsignedTx.to,
				nonce: unsignedTx.nonce ? Number(unsignedTx.nonce) : null,
				data: unsignedTx.data.toString(),
				value: unsignedTx.value ? BigInt(unsignedTx.value.toString()) : null,
			}
			return tx
		}),
	}
}

export async function signAndSubmitTx({
	structSigner,
	unsignedTx,
}: interfaces.ISignAndSubmitTxParams): Promise<interfaces.ISignAndSubmitTxResponse> {
	config.config.verbose && console.log('unsigned tx: ', unsignedTx)
	let _unsignedTx = { ...unsignedTx, value: unsignedTx.value ? ethers.BigNumber.from(unsignedTx.value) : null }

	// Set the transaction options using setFeeOptions
	let txOptions
	try {
		txOptions = await functions.setFeeOptions({
			provider: structSigner.signer.provider,
			eip1559: structSigner.eip1559,
			maxFeePerGas: structSigner.maxFeePerGas,
			maxPriorityFeePerGas: structSigner.maxPriorityFeePerGas,
			gasLimit: structSigner.gasLimit,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.ESignAndSubmitTx.ERROR_SETTING_FEE_OPTIONS,
			'Error setting the fee options',
			error
		)
	}

	// Merge the transaction options into the unsigned transaction
	_unsignedTx = { ..._unsignedTx, ...txOptions, ...{ nonce: structSigner.nonce } }

	let tx: ethers.providers.TransactionResponse
	try {
		config.config.verbose && console.log('sending tx: ', _unsignedTx)
		config.config.verbose && console.log('....')
		tx = await structSigner.signer.sendTransaction(_unsignedTx)
		config.config.verbose && console.log('sent tx.')
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.ESignAndSubmitTx.ERROR_SENDING_TX,
			error,
			'Error sending the transaction'
		)
	}

	config.config.verbose && console.log('tx: ', tx)
	return { txHash: tx.hash, tx }
}

export async function getLinksFromTx({
	linkDetails,
	txHash,
	passwords,
	provider,
}: interfaces.IGetLinkFromTxParams): Promise<interfaces.IGetLinkFromTxResponse> {
	let txReceipt
	try {
		config.config.verbose && console.log(txHash, linkDetails.chainId, provider)
		txReceipt = await utils.getTxReceiptFromHash(txHash, linkDetails.chainId, provider)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EGetLinkFromTxStatusCodes.ERROR_GETTING_TX_RECEIPT_FROM_HASH,
			'Error getting the transaction receipt from the hash'
		)
	}

	// get deposit idx
	const peanutContractVersion = functions.detectContractVersionFromTxReceipt(txReceipt, linkDetails.chainId)
	const idxs: number[] = utils.getDepositIdxs(txReceipt, linkDetails.chainId, peanutContractVersion)
	const links: string[] = []
	idxs.map((idx) => {
		links.push(
			utils.getLinkFromParams(
				linkDetails.chainId,
				peanutContractVersion,
				idx,
				passwords[idxs.indexOf(idx)],
				linkDetails.baseUrl,
				linkDetails.trackId
			)
		)
	})

	return {
		links: links,
	}
}

/**
 * Generates a link with the specified parameters
 */
export async function createLink({
	structSigner,
	linkDetails,
	peanutContractVersion = null,
	password = null,
}: interfaces.ICreateLinkParams): Promise<interfaces.ICreatedPeanutLink> {
	if (peanutContractVersion == null) {
		functions.getLatestContractVersion({ chainId: linkDetails.chainId, type: 'normal' })
	}
	password = password || (await utils.getRandomString(16))
	linkDetails = await utils.validateLinkDetails(linkDetails, [password], 1, structSigner.signer.provider)
	const provider = structSigner.signer.provider

	// Prepare the transactions
	let prepareTxsResponse
	try {
		prepareTxsResponse = await prepareTxs({
			address: await structSigner.signer.getAddress(),
			linkDetails,
			peanutContractVersion,
			numberOfLinks: 1,
			passwords: [password],
			provider: provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_PREPARING_TX, error)
	}

	// Sign and submit the transactions sequentially
	const signedTxs = []
	for (const unsignedTx of prepareTxsResponse.unsignedTxs) {
		try {
			const signedTx = await signAndSubmitTx({ structSigner, unsignedTx })
			signedTxs.push(signedTx)
			config.config.verbose && console.log('awaiting tx to be mined...')
			await signedTx.tx.wait()
			config.config.verbose && console.log('mined tx: ', signedTx.tx)
		} catch (error) {
			throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_SIGNING_AND_SUBMITTING_TX, error)
		}
	}

	// Get the links from the transactions
	let linksFromTxResp
	try {
		linksFromTxResp = await getLinksFromTx({
			linkDetails,
			txHash: signedTxs[signedTxs.length - 1].txHash,
			passwords: [password],
			provider: provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_GETTING_LINKS_FROM_TX, error)
	}

	return {
		link: linksFromTxResp.links,
		txHash: signedTxs[signedTxs.length - 1].txHash,
	}
}

export async function createLinks({
	structSigner,
	linkDetails,
	numberOfLinks = 2,
	peanutContractVersion = null,
	passwords = null,
}: interfaces.ICreateLinksParams): Promise<interfaces.ICreatedPeanutLink[]> {
	if (peanutContractVersion == null) {
		functions.getLatestContractVersion({ chainId: linkDetails.chainId, type: 'normal' })
	}
	passwords = passwords || (await Promise.all(Array.from({ length: numberOfLinks }, () => utils.getRandomString(16))))
	linkDetails = await utils.validateLinkDetails(linkDetails, passwords, numberOfLinks, structSigner.signer.provider)
	const provider = structSigner.signer.provider

	// Prepare the transactions
	let prepareTxsResponse
	try {
		prepareTxsResponse = await prepareTxs({
			address: await structSigner.signer.getAddress(),
			linkDetails,
			peanutContractVersion,
			numberOfLinks: numberOfLinks,
			passwords: passwords,
			provider: provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_PREPARING_TX, error)
	}

	// Sign and submit the transactions
	const signedTxs = []
	for (const unsignedTx of prepareTxsResponse.unsignedTxs) {
		try {
			const signedTx = await signAndSubmitTx({ structSigner, unsignedTx })
			signedTxs.push(signedTx)
			await signedTx.tx.wait()
		} catch (error) {
			throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_SIGNING_AND_SUBMITTING_TX, error)
		}
	}

	config.config.verbose && console.log('signedTxs: ', signedTxs)
	let linksFromTxResp: interfaces.IGetLinkFromTxResponse
	try {
		linksFromTxResp = await getLinksFromTx({
			linkDetails,
			txHash: signedTxs[signedTxs.length - 1].txHash,
			passwords: passwords,
			provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_GETTING_LINKS_FROM_TX, error)
	}
	const createdLinks = linksFromTxResp.links.map((link) => {
		return { link: link, txHash: signedTxs[signedTxs.length - 1].txHash }
	})

	return createdLinks
}
