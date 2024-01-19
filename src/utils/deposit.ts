import * as ethers from 'ethersv5'

import * as functions from '../modules'
import * as config from '../config'
import * as data from '../data'
/**

/**
 * Returns the deposit index from a tx receipt
 * @deprecated will be removed in Feb 2024
 */
export function getDepositIdx(txReceipt: any, chainId: string, contractVersion: string) {
	/* returns the deposit index from a tx receipt */
	const logs = txReceipt.logs
	let depositIdx
	let logIndex

	// Identify the logIndex based on chainId
	if (chainId === '137' || chainId === '80001') {
		logIndex = logs.length - 2
	} else {
		logIndex = logs.length - 1
	}

	// Handle the deposit index extraction based on contract version
	if (contractVersion === 'v3') {
		try {
			depositIdx = logs[logIndex].args[0]
		} catch (error) {
			// get uint256 from consts (first 32 bytes)
			const consts = logs[logIndex].consts
			const depositIdxHex = consts.slice(0, 66)
			//@HUGO: I've removed the parseInt here since it's already a bigInt
			depositIdx = BigInt(depositIdxHex)
		}
	} else if (['v4', 'V4.2'].includes(contractVersion)) {
		// In v4+, the index is now an indexed topic rather than part of the log consts
		try {
			// Based on the etherscan example, the index is now the 1st topic.
			//@HUGO: I've removed the parseInt here since it's already a bigInt
			depositIdx = BigInt(`0x${logs[logIndex].topics[1].slice(2)}`)
		} catch (error) {
			console.error(`Error parsing deposit index from ${contractVersion} logs:', error`)
		}
	} else {
		console.error('Unsupported contract version:', contractVersion)
	}

	return depositIdx
}

/**
 * Returns an array of deposit indices from a batch transaction receipt
 */
export function getDepositIdxs(txReceipt: any, chainId: string, contractVersion: string): number[] {
	config.config.verbose && console.log('getting deposit idxs from txHash: ', txReceipt.transactionHash)
	const logs = txReceipt.logs
	const depositIdxs = []
	config.config.verbose && console.log('logs: ', logs)
	const logTopic = ethers.utils.id('DepositEvent(uint256,uint8,uint256,address)') // Update with correct event signature

	const _PEANUT_CONTRACTS = data.PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const contractAddress = _PEANUT_CONTRACTS[chainId][contractVersion]
	config.config.verbose && console.log(contractAddress, contractVersion, chainId)

	for (let i = 0; i < logs.length; i++) {
		if (logs[i].address.toLowerCase() === contractAddress.toLowerCase() && logs[i].topics[0] === logTopic) {
			const depositIdx = ethers.BigNumber.from(logs[i].topics[1]).toNumber()
			depositIdxs.push(depositIdx)
		}
	}

	return depositIdxs
}

export function compareDeposits(deposit1: any, deposit2: any) {
	if (
		deposit1.pubKey20 == deposit2.pubKey20 &&
		BigInt(deposit1.amount._hex) == BigInt(deposit2.amount._hex) &&
		deposit1.tokenAddress == deposit2.tokenAddress &&
		deposit1.contractType == deposit2.contractType &&
		deposit1.claimed == deposit2.claimed &&
		(ethers.BigNumber.isBigNumber(deposit1.timestamp) ? BigInt(deposit1.timestamp._hex) : deposit1.timestamp) ==
			(ethers.BigNumber.isBigNumber(deposit2.timestamp) ? BigInt(deposit2.timestamp._hex) : deposit2.timestamp) &&
		deposit1.senderAddress == deposit2.senderAddress
	) {
		return true
	} else return false
}

/**
 * Gets all deposits for a given signer and chainId.
 *
 */
export async function getAllDepositsForSigner({
	signer,
	chainId,
	contractVersion = null,
}: {
	signer: ethers.providers.JsonRpcSigner
	chainId: string
	contractVersion?: string
	verbose?: boolean
}) {
	if (contractVersion == null) {
		functions.getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}
	const contract = await functions.getContract(chainId, signer, contractVersion)
	const address = await signer.getAddress()
	return await contract.getAllDepositsForAddress(address)
}
