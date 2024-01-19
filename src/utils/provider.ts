import * as ethers from 'ethersv5'

import * as consts from '../consts'
import * as utils from '.'
import * as config from '../config'
import * as data from '../data'

const providerCache: { [chainId: string]: ethers.providers.JsonRpcProvider } = {}
export function resetProviderCache() {
	for (const key in providerCache) {
		delete providerCache[key]
	}
}

async function createValidProvider(rpcUrl: string): Promise<ethers.providers.JsonRpcProvider> {
	try {
		const provider = new ethers.providers.JsonRpcProvider({
			url: rpcUrl,
		})

		// Check if the RPC is valid by calling fetchGetBalance
		const response = await fetchGetBalance(rpcUrl)
		if (response.error) {
			config.config.verbose && console.log('JSON RPC Error for:', rpcUrl, response.error.message)
			throw new Error('Invalid RPC: ' + rpcUrl)
		}

		config.config.verbose && console.log('RPC is valid:', rpcUrl)
		return provider
	} catch (error) {
		try {
			if (error.code === 'NETWORK_ERROR') {
				config.config.verbose && console.log('Network error for RPC:', rpcUrl, 'Trying with skipFetchSetup...')
				const provider = new ethers.providers.JsonRpcProvider({
					url: rpcUrl,
					skipFetchSetup: true,
				})

				// Check if the RPC is valid by calling fetchGetBalance
				const response = await fetchGetBalance(rpcUrl)
				if (response.error) {
					config.config.verbose && console.log('JSON RPC Error for:', rpcUrl, response.error.message)
					throw new Error('Invalid RPC: ' + rpcUrl)
				}

				return provider
			} else {
				config.config.verbose && console.log('Error checking RPC:', rpcUrl, 'Error:', error)
				// Introduce a delay before throwing the error. This is necessary so that the Promise.any
				// call in getDefaultProvider doesn't immediately reject the promise and instead waits for a success.
				await new Promise((resolve) => setTimeout(resolve, 5000))
				throw new Error('Invalid RPC: ' + rpcUrl)
			}
		} catch (error) {
			config.config.verbose && console.log('Error checking RPC (fallback):', rpcUrl, 'Error:', error)
			await new Promise((resolve) => setTimeout(resolve, 5000))
			throw new Error('Invalid RPC: ' + rpcUrl)
		}
	}
}

async function fetchGetBalance(rpcUrl: string) {
	const res = await fetch(rpcUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_getBalance',
			params: ['0x0000000000000000000000000000000000000000', 'latest'],
			id: 1,
		}),
	})

	const json = await res.json()
	return json
}

/**
 * Like getDefaultProvider, but only returns a string with the RPC URL.
 */
export async function getDefaultProviderUrl(chainId: string): Promise<string> {
	const provider = await getDefaultProvider(chainId)
	return provider.connection.url
}

/**
 * This function is used to get the default provider for a given chainId.
 */
export async function getDefaultProvider(chainId: string): Promise<ethers.providers.JsonRpcProvider> {
	config.config.verbose && console.log('Getting default provider for chainId ', chainId)
	if (!data.CHAIN_DETAILS[chainId]) {
		throw new Error(`Chain ID ${chainId} not supported yet`)
	}

	if (providerCache[chainId]) {
		config.config.verbose && console.log('Found cached provider for chainId ', chainId)
		return providerCache[chainId]
	}

	const rpcs = data.CHAIN_DETAILS[chainId as keyof typeof data.CHAIN_DETAILS].rpc
	config.config.verbose && console.log('rpcs', rpcs)

	// Check if there is an Infura RPC and check for its liveliness
	let infuraRpc = rpcs.find((rpc) => rpc.includes('infura.io'))
	const INFURA_API_KEY = '4478656478ab4945a1b013fb1d8f20fd'
	if (infuraRpc) {
		infuraRpc = infuraRpc.replace('${INFURA_API_KEY}', INFURA_API_KEY)
		config.config.verbose && console.log('Infura RPC found:', infuraRpc)
		const provider = await createValidProvider(infuraRpc)
		if (provider) {
			providerCache[chainId] = provider
			return provider
		}
	}

	// If no valid Infura RPC, continue with the current behavior
	const providerPromises = rpcs.map((rpcUrl) =>
		createValidProvider(rpcUrl.replace('${INFURA_API_KEY}', INFURA_API_KEY)).catch((error) => null)
	)

	try {
		const provider = await Promise.any(providerPromises)
		if (provider === null) {
			throw new Error('No alive provider found for chainId ' + chainId)
		}
		providerCache[chainId] = provider
		return provider
	} catch (error) {
		throw new Error('No alive provider found for chainId ' + chainId)
	}
}
