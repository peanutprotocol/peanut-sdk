import * as ethers from 'ethersv5'

import * as consts from '../consts'
import * as utils from '.'
import * as config from '../config'
import * as data from '../data'
import * as functions from '../modules'
import * as interfaces from '../interfaces'

export async function getAllowanceERC20(
	tokenContract: any,
	spender: any,
	address: string,
	signerOrProvider?: ethers.providers.JsonRpcSigner | ethers.providers.Provider
) {
	let allowance
	try {
		if (!signerOrProvider) {
			signerOrProvider = await functions.getDefaultProvider(tokenContract.chainId)
		}

		if (!address) {
			const signer = signerOrProvider as ethers.providers.JsonRpcSigner
			address = await signer.getAddress()
		}
		allowance = await tokenContract.allowance(address, spender)
	} catch (error) {
		console.error('Error fetching ERC20 allowance status:', error)
	}
	return allowance
}

export async function getApprovedERC721(
	tokenContract: any,
	tokenId: number,
	signerOrProvider?: ethers.providers.JsonRpcSigner | ethers.providers.Provider
) {
	let approved
	try {
		if (!signerOrProvider) {
			signerOrProvider = await functions.getDefaultProvider(tokenContract.chainId)
		}

		approved = await tokenContract.getApproved(tokenId)
	} catch (error) {
		console.error('Error fetching ERC721 approval status:', error)
	}
	return approved
}

export async function getApprovedERC1155(
	tokenContract: any,
	addressOwner: string,
	addressOperator: string,
	signerOrProvider?: ethers.providers.JsonRpcSigner | ethers.providers.Provider
) {
	let approved
	try {
		if (!signerOrProvider) {
			signerOrProvider = await functions.getDefaultProvider(tokenContract.chainId)
		}

		approved = await tokenContract.isApprovedForAll(addressOwner, addressOperator)
	} catch (error) {
		console.error('Error fetching ERC1155 approval status:', error)
	}
	return approved
}

export async function prepareApproveERC20Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	_amount: number | ethers.BigNumber,
	tokenDecimals = 18,
	isRawAmount = false,
	contractVersion = null,
	provider?: any, // why does TS complain about string here?
	spenderAddress?: string | undefined
): Promise<ethers.providers.TransactionRequest | null> {
	//TODO: implement address
	const defaultProvider = provider || (await functions.getDefaultProvider(chainId))
	const tokenContract = new ethers.Contract(tokenAddress, data.ERC20_ABI, defaultProvider)

	let amount: ethers.BigNumber | number = _amount
	if (_amount == -1) {
		// if amount is -1, approve infinite amount
		amount = ethers.constants.MaxUint256
	}

	if (!isRawAmount) {
		amount = ethers.utils.parseUnits(amount.toString(), tokenDecimals)
	}

	const _PEANUT_CONTRACTS = data.PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	// get allowance
	const allowance = await getAllowanceERC20(tokenContract, spender, address, defaultProvider)
	if (allowance.gte(amount)) {
		config.config.verbose &&
			console.log('Allowance already enough, no need to approve more (allowance: ' + allowance.toString() + ')')
		return null
	}
	config.config.verbose && console.log('Approving ' + amount.toString() + ' tokens for spender ' + spender)

	const tx = tokenContract.populateTransaction.approve(spender, amount)
	return tx
}

export async function prepareApproveERC721Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	tokenId: number,
	provider?: any,
	spenderAddress?: string | undefined,
	contractVersion = null
): Promise<ethers.providers.TransactionRequest | null> {
	if (contractVersion == null) {
		contractVersion = functions.getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}
	const defaultProvider = provider || (await functions.getDefaultProvider(chainId))
	const tokenContract = new ethers.Contract(tokenAddress, data.ERC721_ABI, defaultProvider)

	const _PEANUT_CONTRACTS = data.PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	config.config.verbose && console.log('Checking approval for ' + tokenAddress + ' token ID: ' + tokenId)
	// Check if approval is already sufficient
	const currentApproval = await getApprovedERC721(tokenContract, tokenId, defaultProvider)
	if (currentApproval.toLowerCase() === spender.toLowerCase()) {
		config.config.verbose && console.log('Approval already granted to the spender for token ID: ' + tokenId)
		return null
	} else {
		config.config.verbose &&
			console.log('Approval granted to different address: ' + currentApproval + ' for token ID: ' + tokenId)
	}

	// Prepare the transaction to approve the spender for the specified token ID
	const tx = tokenContract.populateTransaction.approve(spender, tokenId, { from: address })
	return tx
}

export async function prepareApproveERC1155Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	provider?: any,
	spenderAddress?: string | undefined,
	contractVersion = null
): Promise<ethers.providers.TransactionRequest | null> {
	if (contractVersion == null) {
		contractVersion = functions.getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}
	const defaultProvider = provider || (await functions.getDefaultProvider(chainId))
	const tokenContract = new ethers.Contract(tokenAddress, data.ERC1155_ABI, defaultProvider)

	const _PEANUT_CONTRACTS = data.PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	config.config.verbose &&
		console.log('Checking approval for ' + tokenAddress + ' owner: ' + address + ' operator: ' + spender)
	// Check if approval is already granted for the operator
	const isApproved = await getApprovedERC1155(tokenContract, address, spender, defaultProvider)

	if (isApproved) {
		config.config.verbose && console.log('Approval already granted to the operator')
		return null
	}

	// Prepare the transaction to approve the spender for the specified token ID
	const tx = tokenContract.populateTransaction.setApprovalForAll(spender, true, { from: address })
	config.config.verbose && console.log('Approval needed for operator')
	return tx
}

export async function validateLinkDetails(
	linkDetails: interfaces.IPeanutLinkDetails,
	passwords: string[],
	numberOfLinks: number,
	provider: ethers.providers.Provider
): Promise<interfaces.IPeanutLinkDetails> {
	linkDetails.tokenAddress = linkDetails.tokenAddress ?? '0x0000000000000000000000000000000000000000'

	if (linkDetails.tokenDecimals == undefined || linkDetails.tokenType == undefined) {
		try {
			const contractDetails = await functions.getTokenContractDetails({
				address: linkDetails.tokenAddress,
				provider: provider,
			})

			linkDetails.tokenType = contractDetails.type
			contractDetails.decimals && (linkDetails.tokenDecimals = contractDetails.decimals)
		} catch (error) {
			throw new Error('Contract type not supported')
		}
	}

	if (!linkDetails || !linkDetails.chainId || !linkDetails.tokenAmount) {
		throw new Error(
			'validateLinkDetails function requires linkDetails object with chainId and tokenAmount properties'
		)
	}

	// Assert that linkDetails conforms to IPeanutLinkDetails
	linkDetails = linkDetails as interfaces.IPeanutLinkDetails

	if (linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155) {
		linkDetails.tokenDecimals = linkDetails.tokenDecimals ?? 0
	} else {
		linkDetails.tokenDecimals = linkDetails.tokenDecimals ?? 18
	}

	// Use nullish coalescing operator to provide default values
	linkDetails.tokenType = linkDetails.tokenType ?? 0
	linkDetails.tokenId = linkDetails.tokenId ?? 0
	linkDetails.baseUrl = linkDetails.baseUrl ?? 'https://peanut.to/claim'
	linkDetails.trackId = linkDetails.trackId ?? 'sdk'

	if (numberOfLinks > 1) {
		utils.assert(
			passwords.length === numberOfLinks,
			'when creating multiple links, passwords must be an array of length numberOfLinks'
		)
	}

	utils.assert(
		linkDetails.tokenType == interfaces.EPeanutLinkType.native ||
			linkDetails.tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-ETH tokens'
	)
	if (
		linkDetails.tokenType == interfaces.EPeanutLinkType.erc721 ||
		linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155
	) {
		utils.assert(numberOfLinks == 1, 'can only send one ERC721 or ERC1155 at a time')
		utils.assert('tokenId' in linkDetails, 'tokenId needed')
	}
	utils.assert(
		!(
			linkDetails.tokenType == interfaces.EPeanutLinkType.erc20 ||
			linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155
		) || linkDetails.tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
	)

	if (
		linkDetails.tokenType !== interfaces.EPeanutLinkType.native &&
		linkDetails.tokenAddress === '0x000000cl0000000000000000000000000000000000'
	) {
		throw new Error('need to provide tokenAddress if tokenType is not 0')
	}

	const tokenAmountString = utils.trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals) // v5
	utils.assert(tokenAmountBigNum.gt(0), 'tokenAmount must be greater than 0')

	return linkDetails
}

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
