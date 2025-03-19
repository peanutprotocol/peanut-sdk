import { BigNumber, ethers } from 'ethersv5'
import {
	CHAIN_MAP,
	PEANUT_CONTRACTS,
	VAULT_CONTRACTS_V4_ANDUP,
	VAULT_CONTRACTS_V4_2_ANDUP,
	VERSION,
	CORAL_SQUID_INTEGRATOR_ID,
	DEFAULT_SQUID_INTEGRATOR_ID,
} from './data.ts'
import { config } from './config.ts'
import * as interfaces from './consts/interfaces.consts.ts'
import { ANYONE_WITHDRAWAL_MODE, PEANUT_SALT, RECIPIENT_WITHDRAWAL_MODE } from './consts/misc.ts'
import { TransactionRequest } from '@ethersproject/abstract-provider'
import { getSquidRoute } from '.'
import { SQUID_API_URL } from './consts/misc.ts'

export function assert(condition: any, message: string) {
	if (!condition) {
		throw new Error(message || 'Assertion failed')
	}
}

/**
 * Prints a greeting message to the console.
 */
export function greeting() {
	console.log(
		'🥜 Hello & thanks for using the Peanut SDK! Currently running version ' +
			VERSION +
			'. Support available at https://discord.com/invite/BX9Ak7AW28'
	)
}

/**
 * Generates a deterministic key pair from an arbitrary length string
 *
 * @param {string} string - The string to generate a key pair from
 * @returns {Object} - An object containing the address and privateKey
 */
export function generateKeysFromString(string: string) {
	const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(string))
	const wallet = new ethers.Wallet(privateKey)
	return {
		address: wallet.address,
		privateKey: privateKey,
	}
}

/**
 * Converts a string to bytes, pads it to 32 bytes and hashes it
 */
export function hash_string(str: string) {
	//@HUGO: I've added in a .toString() here, but I'm not sure if it's good
	let hash = ethers.utils.toUtf8Bytes(str).toString()
	hash = ethers.utils.hexlify(hash)
	hash = ethers.utils.hexZeroPad(hash, 32)
	hash = ethers.utils.keccak256(hash)
	return hash
}

/**
 * Signs a message with a private key and returns the signature
 * THIS SHOULD BE AN UNHASHED, UNPREFIXED MESSAGE
 */
export async function signMessageWithPrivatekey(message: string, privateKey: string) {
	const signer = new ethers.Wallet(privateKey)
	return signer.signMessage(message) // this calls ethers.hashMessage and prefixes the hash
}

/**
 * Verifies a signature with a public key and returns true if valid
 */
export function verifySignature(message: string, signature: string, address: string) {
	const messageSigner = ethers.utils.verifyMessage(message, signature)
	return messageSigner == address
}

/**
 * Adds the EIP191 prefix to a message and hashes it same as solidity
 */
export function solidityHashBytesEIP191(bytes: any) {
	return ethers.utils.hashMessage(bytes)
}

/**
 * Hashes an address to a 32 byte hex string
 */
export function solidityHashAddress(address: string) {
	return ethers.utils.solidityKeccak256(['address'], [address])
}

/**
 * Hashes a plain address, adds an Ethereum message prefix, hashes it again and then signs it
 */
export async function signAddress(string: string, privateKey: string) {
	const stringHash = ethers.utils.solidityKeccak256(['address'], [string]) // v4
	const stringHashbinary = ethers.utils.arrayify(stringHash) // v4
	const signer = new ethers.Wallet(privateKey)
	const signature = await signer.signMessage(stringHashbinary) // this calls ethers.hashMessage and prefixes the hash
	return signature
}

/**
 * Hashes & signs a withdrawal message for peanut vault
 * @returns a fully ready list of claim params to be passed to the withdrawal function
 */
export async function signWithdrawalMessage(
	vaultVersion: string,
	chainId: string,
	vaultAddress: string,
	depositIdx: number,
	recipient: string,
	privateKey: string,
	onlyRecipientMode?: boolean // only for v4.2+
) {
	let claimParams: any[]
	if (VAULT_CONTRACTS_V4_2_ANDUP.includes(vaultVersion)) {
		const extraData = onlyRecipientMode ? RECIPIENT_WITHDRAWAL_MODE : ANYONE_WITHDRAWAL_MODE
		const stringHash = ethers.utils.solidityKeccak256(
			['bytes32', 'uint256', 'address', 'uint256', 'address', 'bytes32'],
			[PEANUT_SALT, chainId, vaultAddress, depositIdx, recipient, extraData]
		)
		const stringHashbinary = ethers.utils.arrayify(stringHash)
		const signer = new ethers.Wallet(privateKey)
		const signature = await signer.signMessage(stringHashbinary) // this calls ethers.hashMessage and prefixes the hash
		claimParams = [depositIdx, recipient, signature]
	} else {
		const addressHash = solidityHashAddress(recipient)
		const addressHashBinary = ethers.utils.arrayify(addressHash)
		config.verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
		const addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
		const signature = await signAddress(recipient, privateKey) // sign with link keys
		claimParams = [depositIdx, recipient, addressHashEIP191, signature]
	}

	return claimParams
}

/**
 * Signs a hash
 */
export async function signHash(stringHash: string, privateKey: string) {
	const stringHashbinary = ethers.utils.arrayify(stringHash)
	const signer = new ethers.Wallet(privateKey)
	const signature = await signer.signMessage(stringHashbinary) // this calls ethers.hashMessage and prefixes the hash
	return signature
}

/**
 * Generates a random string of the specified length
 *  need to avoid bias: https://gist.github.com/joepie91/7105003c3b26e65efcea63f3db82dfba#so-how-do-i-obtain-random-values-securely
 * h/t to Nanak Nihal from Holonym
 * browser: tries to use secure generateKey if available, otherwise falls back to getRandomValues
 * node: uses secure crypto.randomBytes
 */
export async function getRandomString(n: number = 16): Promise<string> {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	const charsetLength = charset.length
	const maxByteValue = 256 // Each byte has 256 possible values
	const maxUnbiasedByte = maxByteValue - (maxByteValue % charsetLength)

	let randomString = ''

	const generateKeyRandomBytes = async (length: number): Promise<Uint8Array> => {
		if (crypto.subtle) {
			try {
				// Use generateKey to generate a symmetric key of sufficient length
				const key = await crypto.subtle.generateKey(
					{
						name: 'AES-GCM',
						length: 256, // length * 8, // Convert byte length to bit length
						// TODO: non 16/32 length passwords?
					},
					true,
					['encrypt', 'decrypt']
				)
				// Export the key to raw bytes
				const keyBuffer = await crypto.subtle.exportKey('raw', key)
				return new Uint8Array(keyBuffer)
			} catch (error) {
				console.warn('Failed to use generateKey. Falling back to getRandomValues.', error)
			}
		}
		return getRandomValuesRandomBytes(length)
	}

	const getRandomValuesRandomBytes = async (length: number): Promise<Uint8Array> => {
		if (crypto.getRandomValues) {
			// Browser
			const array = new Uint8Array(length)
			crypto.getRandomValues(array)
			return array
		} else {
			// Node
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const crypto = await import('node:crypto')
			return crypto.randomBytes(length)
		}
	}

	while (randomString.length < n) {
		const randomBytes = await generateKeyRandomBytes(n - randomString.length)
		for (const byte of randomBytes) {
			if (byte < maxUnbiasedByte) {
				const randomIndex = byte % charsetLength
				randomString += charset.charAt(randomIndex)
			}
		}
	}

	return randomString.substring(0, n) // Return only the first 'n' characters
}

/**
 * Returns raw params from the link (so just unpacks the params)
 * without converting deposit index to a number
 * @param link
 */
export function getRawParamsFromLink(link: string): interfaces.ILinkRawParams {
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

	search = search.replace(/amp;/g, '')

	const params = new URLSearchParams(search)

	const _chainId: string = params.get('c') ?? '' // can be chain name or chain id
	let chainId: string = _chainId
	const contractVersion = params.get('v') ?? ''
	let depositIndices: string | number = params.get('i') ?? ''
	const password = params.get('p') ?? ''
	let trackId = '' // optional
	if (params.get('t')) {
		trackId = params.get('t') ?? ''
	}
	return { chainId, contractVersion, depositIndices, password, trackId }
}

/**
 * Returns the parameters from a link
 */
export function getParamsFromLink(link: string): interfaces.ILinkParams {
	const { chainId, contractVersion, depositIndices, password, trackId } = getRawParamsFromLink(link)
	return {
		chainId,
		contractVersion,
		password,
		depositIdx: parseInt(depositIndices),
		trackId,
	}
}

/**
 * Returns a link from the given parameters
 */
export function getLinkFromParams(
	chainId: string,
	contractVersion: string,
	depositIdx: number | string,
	password: string,
	baseUrl: string = 'https://peanut.to/claim',
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
	if (chainId === '137') {
		logIndex = logs.length - 2
	} else {
		logIndex = logs.length - 1
	}

	// Handle the deposit index extraction based on contract version
	if (contractVersion === 'v3') {
		try {
			depositIdx = logs[logIndex].args[0]
		} catch (error) {
			// get uint256 from data (first 32 bytes)
			const data = logs[logIndex].data
			const depositIdxHex = data.slice(0, 66)
			//@HUGO: I've removed the parseInt here since it's already a bigInt
			depositIdx = BigInt(depositIdxHex)
		}
	} else if (VAULT_CONTRACTS_V4_ANDUP.includes(contractVersion)) {
		// In v4+, the index is now an indexed topic rather than part of the log data
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
	config.verbose && console.log('getting deposit idxs from txHash: ', txReceipt.transactionHash)
	const logs = txReceipt.logs
	const depositIdxs = []
	config.verbose && console.log('logs: ', logs)
	const logTopic = ethers.utils.id('DepositEvent(uint256,uint8,uint256,address)') // Update with correct event signature

	const _PEANUT_CONTRACTS = PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const contractAddress = _PEANUT_CONTRACTS[chainId][contractVersion]
	config.verbose && console.log(contractAddress, contractVersion, chainId)

	for (let i = 0; i < logs.length; i++) {
		if (logs[i].address.toLowerCase() === contractAddress.toLowerCase() && logs[i].topics[0] === logTopic) {
			const depositIdx = ethers.BigNumber.from(logs[i].topics[1]).toNumber()
			depositIdxs.push(depositIdx)
		}
	}

	return depositIdxs
}

/**
 * Returns an object with the keys in lowerCase
 */
export function toLowerCaseKeys(obj: any): any {
	let newObj: any = {}
	Object.keys(obj).forEach((key) => {
		// Convert only the top-level keys to lowercase
		let lowerCaseKey = key.toLowerCase()
		newObj[lowerCaseKey] = obj[key]
	})
	return newObj
}

export function isShortenedLink(link) {
	const url = new URL(link)
	const i = url.searchParams.get('i')
	const shortenedLinkRegex = /^(\(\d+,\d+\))(,\(\d+,\d+\))*$/
	return shortenedLinkRegex.test(i)
}

export function getLinksFromMultilink(link: string): string[] {
	let _link = link
	if (isShortenedLink(link)) {
		_link = expandMultilink(link)
	}
	const url = new URL(_link)
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
		if (newSearchParams.has('p')) {
			newUrl.hash = '#?' + newSearchParams.toString()
		} else {
			newUrl.hash = 'p=' + (url.hash.slice(3) ?? '')
			newUrl.search = '?' + newSearchParams.toString()
		}
		return newUrl.toString()
	})

	return links
}

export function createMultiLinkFromLinks(links: string[]): string {
	if (links.length === 0) {
		throw new Error('No links provided')
	}
	let firstPValue = null
	let firstVValue = null

	for (let url of links) {
		const urlObj = new URL(url)
		const vValue = urlObj.searchParams.get('v')
		const fragment = urlObj.hash.substring(1)
		const pValue = new URLSearchParams(fragment).get('p')

		if (firstPValue === null) {
			firstPValue = pValue
		} else if (firstPValue !== pValue) {
			throw new Error("Inconsistent 'p' parameter values found.")
		}

		if (firstVValue === null) {
			firstVValue = vValue
		} else if (firstVValue !== vValue) {
			throw new Error("Inconsistent 'v' parameter values found.")
		}
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

		if (searchParams.has('p')) {
			password = searchParams.get('p') || ''
		} else {
			password = url.hash.slice(3)
		}

		cParams.push(searchParams.get('c') || '')
		iParams.push(searchParams.get('i') || '')
		baseUrl = url.origin + url.pathname
		contractVersion = searchParams.get('v') || ''
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

	const shortenedLink = shortenMultilink(url.toString())

	return shortenedLink
}

export function shortenMultilink(link: string): string {
	const url = new URL(link)
	const params = new URLSearchParams(url.search)

	const i = params.get('i')
	if (!i) {
		throw new Error('Error shortening the multilink')
	}

	const numbers = i.split(',').map((num) => parseInt(num, 10))
	let grouped = []
	let start = numbers[0]
	let count = 1

	for (let i = 1; i <= numbers.length; i++) {
		if (numbers[i] === numbers[i - 1] + 1) {
			count++
		} else {
			grouped.push(`(${start},${count})`)
			start = numbers[i]
			count = 1
		}
	}

	params.set('i', grouped.join(','))
	url.search = decodeURIComponent(params.toString())
	return url.href
}

export function expandMultilink(link: string): string {
	const url = new URL(link)
	const params = new URLSearchParams(url.search)

	const i = params.get('i')
	if (!i) {
		throw new Error('Error expanding the multilink')
	}

	const expandedIValues = []
	const groupRegex = /\((\d+),(\d+)\)/g
	let match

	while ((match = groupRegex.exec(i)) !== null) {
		const start = parseInt(match[1], 10)
		const count = parseInt(match[2], 10)
		for (let j = 0; j < count; j++) {
			expandedIValues.push(start + j)
		}
	}

	params.set('i', expandedIValues.join(','))
	url.search = decodeURIComponent(params.toString())

	return url.href
}
/**
 * Cobmines multiple raffle links into one
 * @param links array of raffle links
 * @returns 1 raffle link
 */
export function combineRaffleLink(links: string[]): string {
	const expandedLinks = links.map((link) => expandMultilink(link))
	const combinedLink = createMultiLinkFromLinks(expandedLinks)

	return combinedLink
}

export function compareDeposits(deposit1: any, deposit2: any) {
	if (
		deposit1.pubKey20 == deposit2.pubKey20 &&
		BigInt(deposit1.amount._hex) == BigInt(deposit2.amount._hex) &&
		deposit1.tokenAddress == deposit2.tokenAddress &&
		deposit1.contractType == deposit2.contractType &&
		deposit1.claimed == deposit2.claimed &&
		(BigNumber.isBigNumber(deposit1.timestamp) ? BigInt(deposit1.timestamp._hex) : deposit1.timestamp) ==
			(BigNumber.isBigNumber(deposit2.timestamp) ? BigInt(deposit2.timestamp._hex) : deposit2.timestamp) &&
		deposit1.senderAddress == deposit2.senderAddress
	) {
		return true
	} else return false
}

export function getSquidRouterUrl(isMainnet: boolean, usePeanutApi: boolean): string {
	let squidRouteUrl: string
	if (usePeanutApi) {
		if (isMainnet) {
			squidRouteUrl = 'https://api.peanut.to/get-squid-route'
		} else {
			squidRouteUrl = 'https://api.peanut.to/get-squid-route/testnet'
		}
	} else {
		// using squid api
		if (isMainnet) {
			squidRouteUrl = `${SQUID_API_URL}/route`
		} else {
			squidRouteUrl = 'https://testnet.apiplus.squidrouter.com/v2/route'
		}
	}
	return squidRouteUrl
}

export function ethersV5ToPeanutTx(txRequest: TransactionRequest): interfaces.IPeanutUnsignedTransaction {
	// Do this instead of a simple `if (txRequest.value) {...}` so that if the value is
	// explicitly set to a zero, we keep it as zero instead of turning into null.
	const valueSet = txRequest.value !== null && txRequest.value !== undefined

	return {
		from: txRequest.from,
		to: txRequest.to,
		data: txRequest.data as string | null, // should always be a string
		value: valueSet ? BigInt(txRequest.value.toString()) : null,
	}
}

export function peanutToEthersV5Tx(unsignedTx: interfaces.IPeanutUnsignedTransaction): TransactionRequest {
	// Do this instead of a simple `if (txRequest.value) {...}` so that if the value is
	// explicitly set to a zero, we keep it as zero instead of turning into null.
	const valueSet = unsignedTx.value !== null && unsignedTx.value !== undefined

	return {
		from: unsignedTx.from,
		to: unsignedTx.to,
		data: unsignedTx.data,
		value: valueSet ? BigNumber.from(unsignedTx.value.toString()) : null,
	}
}

/**
 * Validates a name entered by the user and throws an error if anything is bad.
 * Checks:
 * 1. Length - max 16 characters
 * 2. Scam - forbids stuff like links inside names
 * @returns the validated name
 */
export function validateUserName(name: string | null): string {
	if (!name) return name // Empty name - all good :)
	name = name.trim()

	if (name.length > 30) {
		throw new interfaces.SDKStatus(interfaces.EGenericErrorCodes.ERROR_NAME_TOO_LONG, 'Name too long')
	}

	if (name.includes('.') && name.indexOf('.') !== name.indexOf('.eth')) {
		throw new interfaces.SDKStatus(
			interfaces.EGenericErrorCodes.ERROR_PROHIBITED_SYMBOL,
			'Names cant contain dots except for ENS domains'
		)
	}

	return name
}

/**
 * This is a helper function to compare versions, if version1 is greater than version2, it returns false, otherwise true
 * Always pass in the LTS version as version1
 * @param version1 the LTS version
 * @param version2 the version to compare against
 * @param lead either 'v' or 'Bv' depending on if it's vault or batch contract
 * @returns true if the version2 is greater than version1
 */

export function compareVersions(version1: string, version2: string, lead: string): boolean {
	const v1 = version1.startsWith(lead) ? version1.substring(lead.length) : version1
	const v2 = version2.startsWith(lead) ? version2.substring(lead.length) : version2

	const parts1 = v1.split('.').map(Number)
	const parts2 = v2.split('.').map(Number)

	const maxLength = Math.max(parts1.length, parts2.length)

	for (let i = 0; i < maxLength; i++) {
		const part1 = i < parts1.length ? parts1[i] : 0
		const part2 = i < parts2.length ? parts2[i] : 0

		if (part1 > part2) return false
		if (part1 < part2) return true
	}
	return true
}

export async function getTokenPrice({
	tokenAddress,
	chainId,
	squidIntegratorId = DEFAULT_SQUID_INTEGRATOR_ID,
}: {
	tokenAddress: string
	chainId: string | number
	squidIntegratorId?: string
}): Promise<number> {
	const response = await fetch(`${SQUID_API_URL}/token-price?tokenAddress=${tokenAddress}&chainId=${chainId}`, {
		headers: { 'x-integrator-id': squidIntegratorId },
	})
	const data = await response.json()
	return data.token.usdPrice
}

interface TokenData {
	chainId: string
	address: string
	decimals: number
}

export async function prepareXchainFromAmountCalculation({
	fromToken,
	toAmount,
	toToken,
	slippagePercentage = 0.3, // 0.3%
	fromTokenPrice,
	toTokenPrice,
	squidIntegratorId = DEFAULT_SQUID_INTEGRATOR_ID,
}: {
	fromToken: TokenData
	toToken: TokenData
	toAmount: string
	slippagePercentage?: number
	fromTokenPrice?: number
	toTokenPrice?: number
	squidIntegratorId?: string
}): Promise<string | null> {
	if (slippagePercentage < 0) {
		console.error('Invalid slippagePercentage: Cannot be negative.')
		return null
	}

	try {
		// Get usd prices for both tokens
		;[fromTokenPrice, toTokenPrice] = await Promise.all([
			fromTokenPrice
				? Promise.resolve(fromTokenPrice)
				: getTokenPrice({
						chainId: fromToken.chainId,
						tokenAddress: fromToken.address,
						squidIntegratorId,
					}),
			toTokenPrice
				? Promise.resolve(toTokenPrice)
				: getTokenPrice({
						chainId: toToken.chainId,
						tokenAddress: toToken.address,
						squidIntegratorId,
					}),
		])

		// Normalize prices to account for different decimal counts between tokens.
		// This ensures calculations are consistent and prevents issues with scientific notation
		// that could arise from small price values or different token decimals.
		const normalizedDecimalCount = Math.max(fromToken.decimals, toToken.decimals)
		const fromTokenPriceBN = ethers.utils.parseUnits(
			fromTokenPrice.toFixed(normalizedDecimalCount),
			normalizedDecimalCount
		)
		const toTokenPriceBN = ethers.utils.parseUnits(
			toTokenPrice.toFixed(normalizedDecimalCount),
			normalizedDecimalCount
		)
		const toAmountBN = ethers.utils.parseUnits(
			Number(toAmount).toFixed(normalizedDecimalCount),
			normalizedDecimalCount
		)
		const fromAmountBN = toTokenPriceBN.mul(toAmountBN).div(fromTokenPriceBN)
		// Slippage percentage is multiplied by 1000 to convert it into an integer form that represents the fraction.
		// because BigNumber cannot handle floating points directly.
		// TODO: use bigint
		const slippageFractionBN = ethers.BigNumber.from(Math.floor(slippagePercentage * 1000))
		const slippageBN = fromAmountBN.mul(slippageFractionBN).div(100000) // 1000 * 100 (10e5)
		const totalFromAmountBN = fromAmountBN.add(slippageBN)
		const amount = ethers.utils.formatUnits(totalFromAmountBN, normalizedDecimalCount)
		return stringToFixed(amount, fromToken.decimals)
	} catch (error) {
		console.error('Failed to calculate fromAmount:', error)
		return null
	}
}

async function estimateRouteWithMinSlippage({
	slippagePercentage,
	fromToken,
	toToken,
	targetAmount,
	squidRouterUrl,
	fromAddress,
	toAddress,
	fromTokenPrice,
	toTokenPrice,
	squidIntegratorId = DEFAULT_SQUID_INTEGRATOR_ID,
}: {
	slippagePercentage: number
	fromToken: TokenData
	toToken: TokenData
	targetAmount: string
	squidRouterUrl: string
	fromAddress: string
	toAddress: string
	fromTokenPrice: number
	toTokenPrice: number
	squidIntegratorId?: string
}): Promise<{
	estimatedFromAmount: string
	weiFromAmount: ethers.BigNumber
	routeResult: interfaces.ISquidRoute
}> {
	const estimatedFromAmount = await prepareXchainFromAmountCalculation({
		fromToken,
		toAmount: targetAmount,
		toToken,
		slippagePercentage,
		fromTokenPrice,
		toTokenPrice,
		squidIntegratorId,
	})
	console.log('estimatedFromAmount', estimatedFromAmount)
	if (!estimatedFromAmount) {
		throw new Error('Failed to estimate from amount')
	}
	const weiFromAmount = ethers.utils.parseUnits(estimatedFromAmount, fromToken.decimals)
	const routeResult = await getSquidRoute({
		squidRouterUrl,
		fromChain: fromToken.chainId,
		fromToken: fromToken.address,
		fromAmount: weiFromAmount.toString(),
		toChain: toToken.chainId,
		toToken: toToken.address,
		fromAddress,
		toAddress,
		enableBoost: true,
		slippage: slippagePercentage,
		squidIntegratorId,
	})
	return { estimatedFromAmount, weiFromAmount, routeResult }
}

/**
 * For a token pair and target amount calculates the minium from amount
 * needed to get the target amount, and the squid route to get there
 */
export async function routeForTargetAmount({
	slippagePercentage,
	fromToken,
	toToken,
	targetAmount,
	squidRouterUrl,
	fromAddress,
	toAddress,
	squidIntegratorId = DEFAULT_SQUID_INTEGRATOR_ID,
}: {
	slippagePercentage?: number
	fromToken: TokenData
	toToken: TokenData
	targetAmount: string
	squidRouterUrl: string
	fromAddress: string
	toAddress: string
	squidIntegratorId?: string
}): Promise<{
	estimatedFromAmount: string
	weiFromAmount: ethers.BigNumber
	routeResult: interfaces.ISquidRoute
	finalSlippage: number
}> {
	const [fromTokenPrice, toTokenPrice] = await Promise.all([
		getTokenPrice({
			chainId: fromToken.chainId,
			tokenAddress: fromToken.address,
			squidIntegratorId,
		}),
		getTokenPrice({
			chainId: toToken.chainId,
			tokenAddress: toToken.address,
			squidIntegratorId,
		}),
	])

	if (slippagePercentage) {
		return {
			...(await estimateRouteWithMinSlippage({
				slippagePercentage,
				fromToken,
				toToken,
				targetAmount,
				squidRouterUrl,
				fromAddress,
				toAddress,
				fromTokenPrice,
				toTokenPrice,
				squidIntegratorId,
			})),
			finalSlippage: slippagePercentage,
		}
	}

	let result: { estimatedFromAmount: string; weiFromAmount: ethers.BigNumber; routeResult: interfaces.ISquidRoute }

	const weiToAmount = ethers.utils.parseUnits(targetAmount, toToken.decimals)
	let minToAmount: ethers.BigNumber = ethers.BigNumber.from(0)
	slippagePercentage = 0
	while (minToAmount.lt(weiToAmount)) {
		result = await estimateRouteWithMinSlippage({
			slippagePercentage,
			fromToken,
			toToken,
			targetAmount,
			squidRouterUrl,
			fromAddress,
			toAddress,
			fromTokenPrice,
			toTokenPrice,
			squidIntegratorId,
		})
		minToAmount = ethers.BigNumber.from(result.routeResult.txEstimation.toAmountMin)
		slippagePercentage += 0.1
		if (5.0 < slippagePercentage) {
			// we dont want to go over 5% slippage
			throw new Error('Slippage percentage exceeded maximum allowed value')
		}
	}
	return { ...result, finalSlippage: slippagePercentage }
}

export function normalizePath(url: string): string {
	try {
		const urlObject = new URL(url)
		urlObject.pathname = urlObject.pathname.replace(/\/+/g, '/')
		return urlObject.toString()
	} catch (error: unknown) {
		// Assume we are getting only a path
		return url.replace(/\/+/g, '/')
	}
}

export function stringToFixed(numStr: string, precision: number = 0): string {
	const match = numStr.match(/^(-?\d+)\.(?<decimals>\d*)$/)
	if (!match) return numStr

	const [_, intPart, decimals] = match
	const rounded = decimals.padEnd(precision, '0').slice(0, precision)
	return rounded ? `${intPart}.${rounded}` : intPart
}

/**
 * Checks if a Squid route is a Coral (RFQ) route
 * @param routeData The raw route data returned from Squid API
 * @returns boolean indicating if the route is a Coral route
 */
export function isCoralRoute(routeData: any): boolean {
	if (!routeData || !routeData.route) {
		return false
	}

	const route = routeData.route

	// Check for type: "rfq" (coral type)
	if (route.type === 'rfq') {
		return true
	}

	// Check for expiry field (present in Coral routes)
	if (route.expiry !== undefined) {
		return true
	}

	// Check if transaction value is 0
	if ((route.transactionRequest && route.transactionRequest.value === '0') || route.transactionRequest.value === 0) {
		return true
	}

	return false
}

/**
 * Gets the appropriate Squid integrator ID based on whether Coral should be used
 * @param useCoral Whether to use Coral routes
 * @returns The appropriate integrator ID
 */
export function getSquidIntegratorId(useCoral: boolean = false): string {
	return useCoral ? CORAL_SQUID_INTEGRATOR_ID : DEFAULT_SQUID_INTEGRATOR_ID
}
