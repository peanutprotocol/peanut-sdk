import * as ethers from 'ethersv5'

import * as consts from '../consts'
import * as utils from '../utils'
import * as config from '../config'
import * as data from '../data'
import * as functions from './index'
import * as interfaces from '../interfaces'

export async function getSquidChains({ isTestnet }: { isTestnet: boolean }): Promise<interfaces.ISquidChain[]> {
	// TODO rate limits? Caching?
	const url = isTestnet ? `${consts.squidBaseUrlTestnet}/chains` : `${consts.squidBaseUrlMainnet}/chains`
	try {
		const response = await fetch(url, {
			headers: {
				'x-integrator-id': '11CBA45B-5EE9-4331-B146-48CCD7ED4C7C',
			},
		})
		if (response.ok) {
			const data = await response.json()
			if (data && Array.isArray(data.chains)) {
				return data.chains
			} else {
				throw new interfaces.SDKStatus(
					interfaces.EXChainStatusCodes.ERROR_GETTING_CHAINS,
					'Failed to get x-chain chains'
				)
			}
		} else {
			throw new interfaces.SDKStatus(
				interfaces.EXChainStatusCodes.ERROR_GETTING_CHAINS,
				'Failed to get x-chain chains'
			)
		}
	} catch (error) {
		throw error
	}
}

export async function getSquidTokens({ isTestnet }: { isTestnet: boolean }): Promise<interfaces.ISquidToken[]> {
	const url = isTestnet ? `${consts.squidBaseUrlTestnet}/tokens` : `${consts.squidBaseUrlMainnet}/tokens`

	try {
		const response = await fetch(url, {
			headers: {
				'x-integrator-id': '11CBA45B-5EE9-4331-B146-48CCD7ED4C7C',
			},
		})
		if (response.ok) {
			const data = await response.json()
			if (data && Array.isArray(data.tokens)) {
				return data.tokens
			} else {
				throw new interfaces.SDKStatus(
					interfaces.EXChainStatusCodes.ERROR_GETTING_CHAINS,
					'Failed to get x-chain tokens'
				)
			}
		} else {
			throw new interfaces.SDKStatus(
				interfaces.EXChainStatusCodes.ERROR_GETTING_CHAINS,
				'Failed to get x-chain tokens'
			)
		}
	} catch (error) {
		throw error
	}
}

export async function getXChainOptionsForLink({
	isTestnet,
	sourceChainId,
	tokenType,
}: interfaces.IGetCrossChainOptionsForLinkParams): Promise<
	Array<interfaces.ISquidChain & { tokens: interfaces.ISquidToken[] }>
> {
	if (tokenType > 1) {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_WRONG_LINK_TYPE,
			'Unsupported link type - can not bridge this link'
		)
	}

	const supportedChains = await getSquidChains({ isTestnet })

	const isSourceChainSupported = supportedChains.some((chain) => chain.chainId === sourceChainId)

	if (!isSourceChainSupported) {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNSUPPORTED_CHAIN,
			'Unsupported chain - can not bridge from this chain'
		)
	}

	const supportedTokens = await getSquidTokens({ isTestnet })

	const supportedTokensMap = new Map<string, interfaces.ISquidToken[]>()

	supportedTokens.forEach(({ chainId, address, name, symbol, logoURI }) => {
		if (!supportedTokensMap.has(chainId)) {
			supportedTokensMap.set(chainId, [])
		}
		supportedTokensMap.get(chainId)?.push({ chainId, address, name, symbol, logoURI })
	})

	const destinationChains = supportedChains
		.filter((chain) => chain.chainId !== sourceChainId && chain.chainType === 'evm')
		.map(({ chainId, axelarChainName, chainType, chainIconURI }) => ({
			chainId,
			axelarChainName,
			chainType,
			chainIconURI,
		}))

	const chainsWithTokens = destinationChains.map((chain) => {
		const chainId = chain.chainId
		const tokens = supportedTokensMap.get(chainId) || []
		return { ...chain, tokens }
	})

	return chainsWithTokens
}

/**
 * Gets raw json data about a squid route
 */
export async function getSquidRouteRaw({
	squidRouterUrl,
	fromChain,
	fromToken,
	fromAmount,
	toChain,
	toToken,
	fromAddress,
	toAddress,
	slippage,
	enableForecall = true,
	enableBoost = true,
}: interfaces.IGetSquidRouteParams): Promise<any> {
	// have a default for squidRouterUrl
	if (squidRouterUrl === undefined) squidRouterUrl = utils.getSquidRouterUrl(true, true)

	config.config.verbose && console.log('Using url for squid route call : ', squidRouterUrl)

	if (fromToken == '0x0000000000000000000000000000000000000000') {
		// Update for Squid compatibility
		config.config.verbose && console.log('Source token is 0x0000, converting to 0xEeee..')
		fromToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	if (toToken == '0x0000000000000000000000000000000000000000') {
		// Update for Squid compatibility
		config.config.verbose && console.log('Destination token is 0x0000, converting to 0xEeee..')
		toToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	// https://docs.squidrouter.com/squid-v1-docs-cosmos/api/get-a-route
	const params = {
		fromChain,
		fromToken,
		fromAmount,
		toChain,
		toToken,
		fromAddress,
		toAddress,
		// optionally set slippage manually, this will override slippageConfig
		slippageConfig: {
			slippage: slippage, // slippage in %
			autoMode: 1, // ignored if manual slippage is set,
		},
		enableForecall,
		enableBoost,
	}

	config.config.verbose && console.log('Getting squid route with params', params)

	try {
		const response: Response = await fetch(squidRouterUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-integrator-id': '11CBA45B-5EE9-4331-B146-48CCD7ED4C7C',
			},
			body: JSON.stringify(params),
		})

		if (!response.ok) {
			console.error(`Squid route endpoint ${squidRouterUrl} returned status: `, response.status)
			const responseBody = await response.text()
			console.error('Full response body: ', responseBody)
			throw new interfaces.SDKStatus(interfaces.EXChainStatusCodes.ERROR_GETTING_ROUTE, responseBody)
		}

		const data = await response.json()
		console.log('All squid data', data)
		return data
	} catch (error) {
		throw error
	}
}

/**
 * Gets a squid route
 */
export async function getSquidRoute(args: interfaces.IGetSquidRouteParams): Promise<interfaces.ISquidRoute> {
	const data = await getSquidRouteRaw(args)
	if (data && data.route) {
		config.config.verbose && console.log('Squid route: ', data.route)
		return {
			value: ethers.BigNumber.from(data.route.transactionRequest.value),
			calldata: data.route.transactionRequest.data,
		}
	}

	// implicit else
	throw new interfaces.SDKStatus(
		interfaces.EXChainStatusCodes.ERROR_UNDEFINED_DATA,
		'Undefined data received from Squid API'
	)
}

export function getSquidRouterUrl(isMainnet: boolean, usePeanutApi: boolean): string {
	let squidRouteUrl: string
	if (usePeanutApi) {
		if (isMainnet) {
			squidRouteUrl = consts.peanutSquidRouteUrlMainnet
		} else {
			squidRouteUrl = consts.peanutSquidRouteUrlTestnet
		}
	} else {
		// using squid api
		if (isMainnet) {
			squidRouteUrl = `${consts.squidBaseUrlMainnet}/route`
		} else {
			squidRouteUrl = `${consts.squidBaseUrlTestnet}/route`
		}
	}
	return squidRouteUrl
}
