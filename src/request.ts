import { ethers } from 'ethersv5'
import { EPeanutLinkType, IPeanutUnsignedTransaction } from './consts/interfaces.consts'
import { ERC20_ABI } from './data'

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
	link: string
	chainId: string
	tokenAmount: string
	tokenAddress: string
	recipientAddress: string
	tokenDecimals: string
	tokenType: EPeanutLinkType
	tokenSymbol: string
	createdDate: string
	reference?: string
	attachment?: string // TODO: update this type
	payerAddress?: string
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
		formData.append('tokenType', EPeanutLinkType[tokenType])
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

export function prepareRequestLinkFulfillmentTransaction({
	recipientAddress,
	tokenAddress,
	tokenAmount,
	tokenType,
	tokenDecimals,
}: IPrepareRequestLinkFulfillmentTransactionProps): IPrepareRequestLinkFulfillmentTransactionResponse {
	try {
		console.log(tokenType)
		console.log(EPeanutLinkType.erc20)
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
