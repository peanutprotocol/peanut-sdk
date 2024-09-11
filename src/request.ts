import { ethers, getDefaultProvider, utils } from 'ethersv5'
import { EPeanutLinkType, IPeanutUnsignedTransaction } from './consts/interfaces.consts'
import { ERC20_ABI, LATEST_STABLE_BATCHER_VERSION } from './data'
import { config, getSquidRoute, interfaces, prepareApproveERC20Tx } from '.'

// INTERFACES
export interface ICreateRequestLinkProps {
	chainId: string
	tokenAddress: string
	tokenAmount: string
	tokenType: EPeanutLinkType
	tokenDecimals: string
	recipientAddress: string
	tokenSymbol?: string
	recipientName?: string
	baseUrl?: string
	apiUrl?: string
	trackId?: string
	reference?: string
	attachment?: File
	APIKey?: string
}

export interface IGetRequestLinkDetailsProps {
	link: string
	APIKey?: string
	apiUrl?: string
}

export interface IPrepareRequestLinkFulfillmentTransactionProps {
	recipientAddress: string
	tokenAddress: string
	tokenAmount: string
	tokenType: EPeanutLinkType
	tokenDecimals: number
}

export interface IPrepareXchainRequestFulfillmentTransactionProps {
	fromChainId: string
	fromToken: string
	fromTokenDecimals: number
	apiUrl?: string
	senderAddress: string
	recipientAddress: string
	destinationChainId: string
	destinationToken: string
	fromAmount: string
	link: string
	squidRouterUrl: string
	provider: ethers.providers.Provider
	tokenType: EPeanutLinkType
}

export interface ISubmitRequestLinkFulfillmentProps {
	hash: string
	chainId: string
	payerAddress: string
	signedTx?: string
	apiUrl?: string
	link: string
}

export interface ICreateRequestLinkResponse {
	link: string
}

export interface IGetRequestLinkDetailsResponse {
	uuid: string
	link: string
	chainId: string
	recipientAddress: string | null
	tokenAmount: string
	tokenAddress: string
	tokenDecimals: number
	tokenType: string
	tokenSymbol: string | null
	createdAt: string
	updatedAt: string
	reference: string | null
	attachmentUrl: string | null
	payerAddress: string | null
	trackId: string | null
	destinationChainFulfillmentHash: string | null
	originChainFulfillmentHash: string | null
	status: string
}

export interface IPrepareRequestLinkFulfillmentTransactionResponse {
	unsignedTx: IPeanutUnsignedTransaction
}

export interface ISubmitRequestLinkFulfillmentResponse {
	success: boolean
}

// FUNCTIONS
export async function createRequestLink({
	chainId,
	tokenAddress,
	tokenAmount,
	tokenType,
	tokenDecimals,
	recipientAddress,
	baseUrl = 'https://peanut.to/request/pay',
	apiUrl = 'https://api.peanut.to/',
	trackId,
	reference,
	attachment,
	recipientName,
	tokenSymbol,
	APIKey,
}: ICreateRequestLinkProps): Promise<ICreateRequestLinkResponse> {
	try {
		const formData = new FormData()
		formData.append('chainId', chainId)
		formData.append('tokenAddress', tokenAddress)
		formData.append('tokenAmount', tokenAmount)
		formData.append('tokenType', tokenType.toString())
		formData.append('tokenDecimals', tokenDecimals)
		formData.append('recipientAddress', recipientAddress)
		formData.append('baseUrl', baseUrl)

		if (trackId) formData.append('trackId', trackId)
		if (reference) formData.append('reference', reference)
		if (recipientName) formData.append('recipientName', recipientName)
		if (tokenSymbol) formData.append('tokenSymbol', tokenSymbol)
		if (attachment) formData.append('attachment', attachment)

		const apiResponse = await fetch(`${apiUrl}/request-links`, {
			method: 'POST',
			body: formData,
			headers: {
				'api-key': APIKey!,
			},
		})

		if (apiResponse.status !== 200) {
			throw new Error('Failed to create request link')
		}

		const { link } = await apiResponse.json()
		return { link }
	} catch (error) {
		console.error('Error creating request link:', error)
		throw error
	}
}

export async function getRequestLinkDetails({
	link,
	APIKey,
	apiUrl = 'https://api.peanut.to/',
}: IGetRequestLinkDetailsProps): Promise<IGetRequestLinkDetailsResponse> {
	const uuid = getUuidFromLink(link)

	const apiResponse = await fetch(`${apiUrl}/request-links/${uuid}`, {
		method: 'GET',
		headers: {
			'api-key': APIKey!,
		},
	})

	if (apiResponse.status !== 200) {
		throw new Error('Failed to get request link details')
	}

	const x = await apiResponse.json()

	return x
}

export async function prepareXchainRequestFulfillmentTransaction({
	senderAddress,
	recipientAddress,
	destinationChainId,
	destinationToken,
	fromToken,
	fromTokenDecimals,
	fromAmount,
	fromChainId,
	link,
	squidRouterUrl,
	provider,
	apiUrl = 'https://api.peanut.to/',
	tokenType,
}: IPrepareXchainRequestFulfillmentTransactionProps): Promise<interfaces.IPrepareDepositFulfillmentTxsResponse> {
	const linkDetails = await getRequestLinkDetails({ link: link, apiUrl: apiUrl })

	if (!destinationToken) destinationToken = linkDetails.tokenAddress
	console.log('destination token', destinationToken)
	let txOptions: interfaces.ITxOptions = {}
	if (!provider) {
		try {
			provider = getDefaultProvider(linkDetails.chainId)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_GETTING_DEFAULT_PROVIDER,
				'Error getting the default provider'
			)
		}
	}
	// get wei of amount being withdrawn and send as string (e.g. "10000000000000000")
	const tokenAmount = utils.parseUnits(fromAmount, fromTokenDecimals)
	config.verbose && console.log('Getting squid info..')
	const unsignedTxs: interfaces.IPeanutUnsignedTransaction[] = []
	const routeResult = await getSquidRoute({
		squidRouterUrl,
		fromChain: fromChainId,
		fromToken: fromToken,
		fromAmount: tokenAmount.toString(),
		toChain: destinationChainId,
		toToken: destinationToken,
		fromAddress: senderAddress,
		toAddress: recipientAddress,
		enableBoost: true,
	})
	if (tokenType == EPeanutLinkType.native) {
		txOptions = {
			...txOptions,
			value: tokenAmount,
		}
	} else if (tokenType == EPeanutLinkType.erc20) {
		config.verbose && console.log('checking allowance...')
		try {
			const approveTx: interfaces.IPeanutUnsignedTransaction = await prepareApproveERC20Tx(
				senderAddress,
				linkDetails.chainId,
				fromToken,
				tokenAmount,
				fromTokenDecimals,
				true,
				LATEST_STABLE_BATCHER_VERSION,
				provider,
				routeResult.to
			)

			if (approveTx) {
				approveTx.from = senderAddress
				unsignedTxs.push(approveTx)
				config.verbose && console.log('approveTx:', approveTx)
			}
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_PREPARING_APPROVE_ERC20_TX,
				'Error preparing the approve ERC20 tx, please make sure you have enough balance and have approved the contract to spend your tokens'
			)
		}
	}

	config.verbose && console.log('Squid route calculated :)', { routeResult })
	console.log({ lol: routeResult.value.toString() })

	let unsignedTx: IPeanutUnsignedTransaction = {}

	if (tokenType == EPeanutLinkType.native) {
		unsignedTx = {
			data: routeResult.calldata,
			to: routeResult.to,
			value: BigInt(routeResult.value.toString()) + BigInt(txOptions.value.toString()),
		}
	} else if (tokenType == EPeanutLinkType.erc20) {
		unsignedTx = {
			data: routeResult.calldata,
			to: routeResult.to,
			value: BigInt(routeResult.value.toString()),
		}
	}

	unsignedTxs.push(unsignedTx)

	return { unsignedTxs }
}

export function prepareRequestLinkFulfillmentTransaction({
	recipientAddress,
	tokenAddress,
	tokenAmount,
	tokenType,
	tokenDecimals,
}: IPrepareRequestLinkFulfillmentTransactionProps): IPrepareRequestLinkFulfillmentTransactionResponse {
	try {
		tokenType = Number(tokenType)
		if (tokenType !== EPeanutLinkType.erc20 && tokenType !== EPeanutLinkType.native) return
		let unsignedTx: IPeanutUnsignedTransaction = {}
		if (tokenType === EPeanutLinkType.native) {
			tokenAmount = Number(tokenAmount).toFixed(7)
			const amount = ethers.utils.parseEther(tokenAmount).toBigInt()
			unsignedTx = {
				to: recipientAddress,
				value: amount,
			}
		} else {
			const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI)
			const amount = ethers.utils.parseUnits(tokenAmount, tokenDecimals)
			const data = erc20Contract.interface.encodeFunctionData('transfer', [recipientAddress, amount])

			unsignedTx = {
				to: tokenAddress,
				data,
				value: BigInt(0),
			}
		}

		return { unsignedTx }
	} catch (error) {
		console.error('Error preparing request link fulfillment transaction:', error)
		throw error
	}
}

export async function submitRequestLinkFulfillment({
	chainId,
	hash,
	payerAddress,
	signedTx,
	apiUrl = 'https://api.peanut.to/',
	link,
}: ISubmitRequestLinkFulfillmentProps): Promise<ISubmitRequestLinkFulfillmentResponse> {
	try {
		const uuid = getUuidFromLink(link)
		const apiResponse = await fetch(`${apiUrl}request-links/${uuid}`, {
			method: 'PATCH',
			body: JSON.stringify({
				destinationChainFulfillmentHash: hash,
				payerAddress,
				chainId,
				// signedTx,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (apiResponse.status !== 200) {
			throw new Error('Failed to submit request link fulfillment')
		}

		const data = await apiResponse.json()

		return data
	} catch (error) {
		console.error('Error submitting request link fulfillment:', error)
		throw error
	} // TODO: handle error
}

export function getUuidFromLink(link: string): string {
	const url = new URL(link)
	const searchParams = new URLSearchParams(url.search)
	return searchParams.get('id')!
}
