import * as ethers from 'ethersv5'

import * as consts from '../consts'
import * as utils from '.'
import * as config from '../config'
import * as data from '../data'
import * as functions from '../basic/index'
import * as interfaces from '../interfaces'

export function getContractAddress(chainId: string, version: string) {
	// Find the contract address based on the chainId and version provided
	const _PEANUT_CONTRACTS = data.PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const contractAddress = _PEANUT_CONTRACTS[chainId.toString()] && _PEANUT_CONTRACTS[chainId.toString()][version]
	return contractAddress
}

export async function getContract(chainId: string, signerOrProvider: any, version = null) {
	if (signerOrProvider == null) {
		config.config.verbose && console.log('signerOrProvider is null, getting default provider...')
		signerOrProvider = await functions.getDefaultProvider(chainId)
	}
	if (version == null) {
		version = getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}

	// Determine which ABI version to use based on the version provided
	let PEANUT_ABI
	switch (version) {
		case 'v4':
			PEANUT_ABI = data.PEANUT_ABI_V4
			break
		case 'v4.2':
			PEANUT_ABI = data.PEANUT_ABI_V4_2
			break
		case 'Bv4':
			PEANUT_ABI = data.PEANUT_BATCHER_ABI_V4
			break
		case 'Rv4.2':
			PEANUT_ABI = data.PEANUT_ROUTER_ABI_V4_2
			break
		default:
			throw new Error('Unable to find Peanut contract for this version, check for correct version or updated SDK')
	}

	const contractAddress = getContractAddress(chainId, version)

	// If the contract address is not found, throw an error
	if (!contractAddress) {
		throw new Error(`Contract ${version} not deployed on chain ${chainId}`)
	}

	const contract = new ethers.Contract(contractAddress, PEANUT_ABI, signerOrProvider)

	config.config.verbose && console.log(`Connected to contract ${version} on chain ${chainId} at ${contractAddress}`)

	return contract
	// TODO: return class
}

export function detectContractVersionFromTxReceipt(txReceipt: any, chainId: string): string {
	const contractAddresses = Object.values(data.PEANUT_CONTRACTS[chainId])
	const contractVersions = Object.keys(data.PEANUT_CONTRACTS[chainId])
	const txReceiptContractAddresses = txReceipt.logs.map((log: any) => log.address.toLowerCase())

	let txReceiptContractVersion = -1

	for (let i = 0; i < contractAddresses.length; i++) {
		if (txReceiptContractAddresses.includes(String(contractAddresses[i]).toLowerCase())) {
			txReceiptContractVersion = i
			break
		}
	}

	return contractVersions[txReceiptContractVersion]
}

/*
please note that a contract version has to start with 'v' and a batcher contract version has to start with 'Bv'. We support major & inor versions (e.g. v1.0, v1.1, v2.0, v2.1, but not v1.0.1)
*/
export function getLatestContractVersion({
	chainId,
	type,
	experimental = false,
}: {
	chainId: string
	type: 'normal' | 'batch'
	experimental?: boolean
}): string {
	try {
		const _data = data.PEANUT_CONTRACTS

		const chainData = _data[chainId as unknown as keyof typeof _data]

		// Filter keys starting with "v" or "Bv" based on type
		let versions = Object.keys(chainData)
			.filter((key) => key.startsWith(type === 'batch' ? 'Bv' : 'v'))
			.sort((a, b) => {
				const partsA = a.substring(1).split('.').map(Number)
				const partsB = b.substring(1).split('.').map(Number)

				// Compare major version first
				if (partsA[0] !== partsB[0]) {
					return partsB[0] - partsA[0]
				}

				// If major version is the same, compare minor version (if present)
				return (partsB[1] || 0) - (partsA[1] || 0)
			})

		// Adjust the filtering logic based on the experimental flag and contract version variables
		if (!experimental && type === 'normal') {
			versions = versions.filter((version) => version.startsWith(consts.LATEST_STABLE_CONTRACT_VERSION))

			if (versions.length === 0) {
				versions = [consts.FALLBACK_CONTRACT_VERSION]
			}

			if (consts.LATEST_STABLE_CONTRACT_VERSION !== consts.LATEST_EXPERIMENTAL_CONTRACT_VERSION) {
				versions = versions.filter((version) => version !== consts.LATEST_EXPERIMENTAL_CONTRACT_VERSION)
			}
		}

		const highestVersion = versions[0]

		config.config.verbose && console.log('latest contract version: ', highestVersion)
		return highestVersion
	} catch (error) {
		throw new Error('Failed to get latest contract version')
	}
}

/**
 * gets the contract type
 */
export async function getTokenContractType({
	provider,
	address,
}: {
	provider: ethers.providers.Provider
	address: string
}): Promise<interfaces.EPeanutLinkType> {
	const minimalABI = [
		'function supportsInterface(bytes4) view returns (bool)',
		'function totalSupply() view returns (uint256)',
		'function balanceOf(address) view returns (uint256)',
	]

	// Interface Ids for ERC721 and ERC1155
	const ERC721_INTERFACE_ID = '0x80ac58cd' // ERC721
	const ERC1155_INTERFACE_ID = '0xd9b67a26' // ERC1155

	const contract = new ethers.Contract(address, minimalABI, provider)

	const isERC721 = await supportsInterface(contract, ERC721_INTERFACE_ID)
	const isERC1155 = await supportsInterface(contract, ERC1155_INTERFACE_ID)
	let isERC20 = false

	// Check for ERC20 if it's not ERC721 or ERC1155
	if (!isERC721 && !isERC1155) {
		isERC20 = await contract
			.totalSupply()
			.then(() => true)
			.catch(() => false)
	}

	if (address.toLowerCase() === ethers.constants.AddressZero.toLowerCase()) return 0
	if (isERC20) return 1
	if (isERC721) return 2
	if (isERC1155) return 3
}

export async function supportsInterface(contract, interfaceId) {
	try {
		return await contract.supportsInterface(interfaceId)
	} catch (error) {
		return false
	}
}

export async function getTokenContractDetails({
	address,
	provider,
}: {
	address: string
	provider: ethers.providers.Provider
}): Promise<{ type: interfaces.EPeanutLinkType; decimals?: number; name?: string; symbol?: string }> {
	//@ts-ignore
	const batchProvider = new ethers.providers.JsonRpcBatchProvider(provider.connection.url)

	//get the contract type
	const contractType = await getTokenContractType({ address: address, provider: batchProvider })

	config.config.verbose && console.log('contractType: ', contractType)
	switch (contractType) {
		case 0: {
			return {
				type: 0,
				decimals: 18,
			}
		}
		case 1: {
			const contract = new ethers.Contract(address, data.ERC20_ABI, batchProvider)
			const [name, symbol, decimals] = await Promise.all([
				contract.name(),
				contract.symbol(),
				contract.decimals(),
			])
			config.config.verbose && console.log('details: ', [name, symbol, decimals])
			return {
				type: 1,
				name: name,
				symbol: symbol,
				decimals: decimals,
			}
		}
		case 2: {
			const contract = new ethers.Contract(address, data.ERC721_ABI, batchProvider)
			const [fetchedName, fetchedSymbol] = await Promise.all([contract.name(), contract.symbol()])
			config.config.verbose && console.log('details: ', [fetchedName, fetchedSymbol])
			return {
				type: 2,
				name: fetchedName,
				symbol: fetchedSymbol,
			}
		}
		case 3: {
			const contract = new ethers.Contract(address, data.ERC1155_ABI, batchProvider)
			const [fetchedName, fetchedSymbol] = await Promise.all([contract.name(), contract.symbol()])
			config.config.verbose && console.log('details: ', [fetchedName, fetchedSymbol])
			return {
				type: 3,
				name: fetchedName,
				symbol: fetchedSymbol,
				decimals: null,
			}
		}
	}
}
