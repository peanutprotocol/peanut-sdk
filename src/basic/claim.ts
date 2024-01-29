import * as ethers from 'ethersv5'

import * as consts from '../consts'
import * as utils from '../advanced'
import * as config from '../config'
// import * as data from '../data'
import * as functions from '.'
import * as interfaces from '../interfaces'

/**
 * Claims the contents of a link
 */
export async function claimLink({
	structSigner,
	link,
	// maxPriorityFeePerGas = null,
	// gasLimit = null,
	// eip1559 = true,
	// maxFeePerGas = null,
	recipient = null,
}: interfaces.IClaimLinkParams): Promise<interfaces.IClaimLinkResponse> {
	// TODO: split into 2

	const signer = structSigner.signer
	const params = utils.getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	if (recipient == null) {
		recipient = await signer.getAddress()
		config.config.verbose && console.log('recipient not provided, using signer address: ', recipient)
	}
	const keys = utils.generateKeysFromString(password) // deterministically generate keys from password
	const contract = await functions.getContract(chainId, signer, contractVersion)

	// cryptography
	const claimParams = await utils.signWithdrawalMessage(
		contractVersion,
		chainId,
		contract.address,
		depositIdx,
		recipient,
		keys.privateKey
	)

	// Prepare transaction options
	let txOptions = {}
	txOptions = await functions.setFeeOptions({
		txOptions,
		provider: signer.provider,
	})

	config.config.verbose &&
		console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')

	// withdraw the deposit
	const tx = await contract.withdrawDeposit(...claimParams, txOptions)
	console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
	const txReceipt = await tx.wait()

	return {
		txHash: txReceipt.transactionHash,
	}
}

/**
 * Claims the contents of a link as a sender. Can only be used if a link has not been claimed in a set time period.
 * (24 hours). Only works with links created with v4 of the contract. More gas efficient than claimLink.
 */
export async function claimLinkSender({
	structSigner,
	depositIndex,
	contractVersion = null,
}: interfaces.IClaimLinkSenderParams): Promise<interfaces.IClaimLinkSenderResponse> {
	const signer = structSigner.signer
	const chainId = await signer.getChainId()
	const contract = await functions.getContract(String(chainId), signer, contractVersion)
	if (contractVersion == null) {
		functions.getLatestContractVersion({ chainId: chainId.toString(), type: 'normal' })
	}
	// Prepare transaction options
	let txOptions = {}
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

	config.config.verbose &&
		console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')

	// withdraw the deposit
	let tx
	try {
		tx = await contract.withdrawDepositSender(depositIndex, txOptions)
		console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
		const txReceipt = await tx.wait()

		return {
			txHash: txReceipt.transactionHash,
		}
	} catch (error) {
		if (error.error.reason.includes('NOT 24 HOURS YET')) {
			throw new Error('Link cannot be claimed yet, please wait 24 hours from creation time')
		}
	}
}

/**
 * Claims a link through the Peanut API
 */
export async function claimLinkGasless({
	link,
	recipientAddress,
	APIKey,
	baseUrl = 'https://api.peanut.to/claim-v2',
}: interfaces.IClaimLinkGaslessParams) {
	config.config.verbose && console.log('claiming link through Peanut API...')
	const payload = await utils.createClaimPayload(link, recipientAddress)
	config.config.verbose && console.log('payload: ', payload)

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		claimParams: payload.claimParams,
		chain: payload.chainId,
		version: payload.contractVersion,
		apiKey: APIKey,
	}

	// if axios error, return the error message

	const response = await fetch(baseUrl, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})

	config.config.verbose && console.log('response status: ', response.status)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	} else {
		return await response.json()
	}
}

/**
 * Claims a link x-chain through the Peanut API
 */
export async function claimLinkXChainGasless({
	link,
	recipientAddress,
	APIKey,
	baseUrl = 'https://api.peanut.to/claim-x-chain',
	destinationChainId,
	destinationToken = null,
	squidRouterUrl,
	isMainnet = true,
	slippage,
}: interfaces.IClaimLinkXChainGaslessParams): Promise<interfaces.IClaimLinkXChainGaslessResponse> {
	const payload = await utils.createClaimXChainPayload({
		isMainnet,
		destinationChainId,
		destinationToken: destinationToken,
		link: link,
		recipient: recipientAddress,
		squidRouterUrl,
		slippage,
	})

	const claimParams = {
		apiKey: APIKey,
		chainId: payload.chainId,
		contractVersion: payload.contractVersion,
		peanutAddress: payload.peanutAddress,
		depositIndex: payload.depositIndex,
		withdrawalSignature: payload.withdrawalSignature,
		squidFee: payload.squidFee.toString(),
		peanutFee: payload.peanutFee.toString(),
		squidData: payload.squidData,
		routingSignature: payload.routingSignature,
	}

	const claimResponse = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(claimParams),
	})
	const data = await claimResponse.json()
	console.log('Claim x-chain response', { data })
	return { txHash: data.txHash }
}

export async function claimAllUnclaimedAsSenderPerChain({
	structSigner,
	peanutContractVersion = null,
}: interfaces.IClaimAllUnclaimedAsSenderPerChainParams): Promise<string[]> {
	const chainId = (await structSigner.signer.getChainId()).toString()
	const address = await structSigner.signer.getAddress()
	const provider = structSigner.signer.provider as ethers.providers.JsonRpcProvider

	if (peanutContractVersion == null) {
		peanutContractVersion = functions.getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}

	const addressDepositsWithIdx = await utils.getAllUnclaimedDepositsWithIdxForAddress({
		address: address,
		chainId: chainId,
		provider: provider,
		peanutContractVersion,
	})
	const txHashes: string[] = []

	config.config.verbose && console.log(addressDepositsWithIdx)

	for (const deposit of addressDepositsWithIdx) {
		try {
			const tx = await claimLinkSender({
				structSigner,
				depositIndex: deposit.idx,
				contractVersion: peanutContractVersion,
			})
			txHashes.push(tx.txHash)
		} catch (error) {
			console.log('error claiming link with deposit idx: ', deposit.idx, ' error: ', error)
		}
	}

	config.config.verbose && console.log(txHashes)

	return txHashes
}

/**
 * Makes a gasless eip-3009 deposit through Peanut API
 */
export async function makeReclaimGasless({
	APIKey,
	baseUrl = consts.peanutReclaimApiBaseUrl,
	payload,
	signature,
}: interfaces.IMakeReclaimGaslessParams) {
	config.config.verbose && console.log('depositing gaslessly through Peanut API...')
	config.config.verbose && console.log('payload: ', payload)

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		apiKey: APIKey,
		chainId: payload.chainId,
		contractVersion: payload.contractVersion,
		depositIndex: payload.depositIndex,
		signer: payload.signer,
		signature,
	}

	// if axios error, return the error message

	const response = await fetch(baseUrl, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})

	config.config.verbose && console.log('response status: ', response.status)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	} else {
		return await response.json()
	}
}
