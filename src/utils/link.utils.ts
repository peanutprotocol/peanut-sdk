import * as ethers from 'ethersv5'

import * as interfaces from '../interfaces/interfaces.consts.ts'
import * as config from '../config/config.ts'
import * as data from '../data'
import * as consts from '../consts'
/**
 * Returns the parameters from a link
 */
export function getParamsFromLink(link: string): {
	chainId: string
	contractVersion: string
	depositIdx: number
	password: string
	trackId: string
} {
	/* returns the parameters from a link */
	let url
	try {
		url = new URL(link)
	} catch (error) {
		// throw sdk error
		throw new interfaces.SDKStatus(
			interfaces.EGenericErrorCodes.GENERIC_ERROR,
			error,
			"link: '" + link + "' is not a valid URL"
		)
	}
	let search = url.search
	// If there is no search params, try to get params after hash
	if (search === '') {
		search = url.hash.startsWith('#?') ? url.hash.substring(1) : ''
	}

	if (!search.includes('#p')) {
		search = search + '&' + url.hash.substring(1)
	}

	const params = new URLSearchParams(search)

	const _chainId: string = params.get('c') ?? '' // can be chain name or chain id
	let chainId: string = _chainId
	const contractVersion = params.get('v') ?? ''
	let depositIdx: string | number = params.get('i') ?? ''
	depositIdx = parseInt(depositIdx)
	const password = params.get('p') ?? ''
	let trackId = '' // optional
	if (params.get('t')) {
		trackId = params.get('t') ?? ''
	}

	return { chainId, contractVersion, depositIdx, password, trackId }
}

/**
 * Returns a link from the given parameters
 */
export function getLinkFromParams(
	chainId: string,
	contractVersion: string,
	depositIdx: number | string,
	password: string,
	baseUrl: string = consts.peanutClaimBaseUrl,
	trackId: string = ''
) {
	/* returns a link from the given parameters */

	const link =
		baseUrl +
		'?c=' +
		chainId +
		'&v=' +
		contractVersion +
		'&i=' +
		depositIdx +
		(trackId ? '&t=' + trackId : '') +
		'#p=' +
		password

	return link
}

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

export function getLinksFromMultilink(link: string): string[] {
	const url = new URL(link)
	const searchParams = new URLSearchParams(url.search)

	// If there is a hash, treat the part after the hash as additional search parameters
	if (url.hash.startsWith('#?')) {
		const hashParams = new URLSearchParams(url.hash.slice(2))
		for (const [key, value] of hashParams) {
			searchParams.append(key, value)
		}
	}

	const cParams = searchParams.get('c')?.split(',') || []
	const iParams = searchParams.get('i')?.split(',') || []

	if (cParams.length !== iParams.length && cParams.length !== 1) {
		throw new Error('Mismatch in length of c and i parameters')
	}

	const links = iParams.map((i, index) => {
		const newUrl = new URL(url.origin + url.pathname) // clone the original URL without search and hash
		const newSearchParams = new URLSearchParams(searchParams.toString()) // clone the original search parameters
		newSearchParams.set('c', cParams.length === 1 ? cParams[0] : cParams[index])
		newSearchParams.set('i', i)
		newUrl.hash = '#?' + newSearchParams.toString()
		return newUrl.toString()
	})

	return links
}

export function createMultiLinkFromLinks(links: string[]): string {
	if (links.length === 0) {
		throw new Error('No links provided')
	}

	const cParams: string[] = []
	const iParams: string[] = []
	let baseUrl = ''
	let contractVersion = ''
	let password = ''
	let trackId = ''
	const additionalParams = new Map<string, string>()

	links.forEach((link) => {
		const url = new URL(link)
		const searchParams = new URLSearchParams(url.search)

		if (url.hash.startsWith('#?')) {
			const hashParams = new URLSearchParams(url.hash.slice(2))
			for (const [key, value] of hashParams) {
				searchParams.append(key, value)
			}
		}

		cParams.push(searchParams.get('c') || '')
		iParams.push(searchParams.get('i') || '')
		baseUrl = url.origin + url.pathname
		contractVersion = searchParams.get('v') || ''
		password = searchParams.get('p') || ''
		trackId = searchParams.get('t') || ''

		// Store all additional parameters
		for (const [key, value] of searchParams.entries()) {
			if (!['c', 'v', 'i', 'p', 't'].includes(key)) {
				additionalParams.set(key, value)
			}
		}
	})

	// Check if all chainIds are the same
	const allSameChainId = cParams.every((val) => val === cParams[0])

	const multiLink = getLinkFromParams(
		allSameChainId ? cParams[0] : cParams.join(','),
		contractVersion,
		iParams.join(','),
		password,
		baseUrl,
		trackId
	)

	// Add all additional parameters to the hash of the multi-link
	const url = new URL(multiLink)
	let hashString = url.hash.slice(2) // remove the '#?' at the start
	for (const [key, value] of additionalParams.entries()) {
		hashString += `&${key}=${value}`
	}
	url.hash = '#?' + hashString

	return url.toString()
}
