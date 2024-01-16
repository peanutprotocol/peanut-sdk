import { BigNumber, ethers } from 'ethersv5'
import { CHAIN_MAP, PEANUT_CONTRACTS, VERSION } from './data.ts'
import { config } from './config.ts'
import * as interfaces from './consts/interfaces.consts.ts'
import { ANYONE_WITHDRAWAL_MODE, PEANUT_SALT, RECIPIENT_WITHDRAWAL_MODE } from './consts/misc.ts'

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
	chainId: number,
	vaultAddress: string,
	depositIdx: number,
	recipient: string,
	privateKey: string,
	onlyRecipientMode?: boolean // only for v4.2
) {
	let claimParams: any[]
	if (vaultVersion == 'v4.2') {
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
 * Returns the parameters from the current page url
 */
export function getParamsFromPageURL() {
	/* returns the parameters from the current page url */
	const params = new URLSearchParams(window.location.search)
	let chainId = params.get('c') // can be chain name or chain id
	chainId = CHAIN_MAP[String(chainId) as keyof typeof CHAIN_MAP].toString()
	const contractVersion = params.get('v')
	let depositIdx = params.get('i') ?? ''
	depositIdx = parseInt(depositIdx).toString()
	const password = params.get('p')

	return { chainId, contractVersion, depositIdx, password }
}

/**
 * Returns the parameters from a link
 */
export function getParamsFromLink(link: string): {
	chainId: number
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

	const _chainId: string | number = params.get('c') ?? '' // can be chain name or chain id
	let chainId: number = 0
	// if can be casted to int, then it's a chain id
	if (parseInt(_chainId)) {
		chainId = parseInt(_chainId)
	} else {
		// otherwise it's a chain name
		chainId = CHAIN_MAP[String(_chainId) as keyof typeof CHAIN_MAP]
	}

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
	chainId: number | string,
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
export function getDepositIdx(txReceipt: any, chainId: number | string, contractVersion: string) {
	/* returns the deposit index from a tx receipt */
	const logs = txReceipt.logs
	let depositIdx
	let logIndex

	// Identify the logIndex based on chainId
	if (chainId === 137 || chainId === 80001) {
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
	} else if (['v4', 'V4.2'].includes(contractVersion)) {
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
export function getDepositIdxs(txReceipt: any, chainId: number | string, contractVersion: string): number[] {
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
			squidRouteUrl = 'https://v2.api.squidrouter.com/v2/route'
		} else {
			squidRouteUrl = 'https://testnet.v2.api.squidrouter.com/v2/route'
		}
	}
	return squidRouteUrl
}
