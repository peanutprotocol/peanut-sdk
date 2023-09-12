import { ethers } from 'ethersv5'
import { TransactionRequest } from '@ethersproject/abstract-provider'

//General export interface s and enums
export interface IPeanutSigner {
	signer: ethers.Signer
	nonce?: number
	maxFeePerGas?: number
	maxPriorityFeePerGas?: number
	gasLimit?: number
	eip1559?: boolean
}

export interface ITxOptions {
	nonce?: number
	value?: ethers.BigNumber
	gasLimit?: ethers.BigNumber
	gasPrice?: ethers.BigNumber
	maxFeePerGas?: ethers.BigNumber
	maxPriorityFeePerGas?: ethers.BigNumber
}

enum EPeanutLinkType {
	native,
	erc20,
	erc721,
	erc1155,
	inflationarytokens, // we might leave this out for now?
}

export interface IPeanutLinkDetails {
	chainId: number
	tokenAmount: number
	tokenType: EPeanutLinkType
	tokenAddress?: string
	tokenId?: number
	tokenDecimals?: number
	baseUrl?: string
	trackId?: string
}

export interface ICreatedPeanutLink {
	link: string | string[]
	txHash: string
}

export interface IPeanutLinkChainDetails {
	linkDetails: IPeanutLinkDetails
	depositTimestamp: number
	claimed: boolean
}

export interface IPeanutUnsignedTransactions {
	unsignedTxs: TransactionRequest // change this any type to correct type
}

export interface IReturnSuccessObject {
	success: boolean
	errorCode?: number
	errorMessage?: string
}

//createLink
export interface ICreateLinkParams {
	structSigner: IPeanutSigner
	linkDetails: IPeanutLinkDetails
	peanutContractVersion?: string
	password?: string
}
export interface ICreateLinkResponse {
	createdLink: ICreatedPeanutLink
	success: IReturnSuccessObject
}

//createLinks
export interface ICreateLinksParams extends Omit<ICreateLinkParams, 'password'> {
	numberOfLinks: number
	passwords?: string[]
}

export interface ICreateLinksResponse {
	createdLinks: ICreatedPeanutLink[]
	success: IReturnSuccessObject
}

//claimLinkGasless
export interface IClaimLinkGaslessParams {
	APIKey: string
	baseUrl?: string
	recipientAddress: string
	link: string
}

export interface IClaimLinkGaslessResponse {
	txHash: string
	success: IReturnSuccessObject // change this to correct error handling
}

//ClaimLink
export interface IClaimLinkParams {
	structSigner: IPeanutSigner
	link: string
}

export interface IClaimLinkResponse {
	txHash: string
	success: IReturnSuccessObject // change this to correct error handling
}

//prepareCreatetxs
export interface IPrepareCreateTxsParams {
	address: string
	linkDetails: IPeanutLinkDetails
	peanutContractVersion?: string
	batcherContractVersion?: string
	numberOfLinks?: number
	passwords: string[]
}

export interface IPrepareCreateTxsResponse {
	unsignedTxs: TransactionRequest[]
	success: IReturnSuccessObject
}

//signAndSubmitTx
export interface ISignAndSubmitTxParams {
	structSigner: IPeanutSigner
	unsignedTx: TransactionRequest
}

export interface ISignAndSubmitTxResponse {
	txHash: string
	success: IReturnSuccessObject
}

//getLink
export interface IGetLinkFromTxParams {
	linkDetails: IPeanutLinkDetails
	txHash: string
	signerOrProvider?: ethers.Signer | ethers.providers.Provider
	passwords: string[]
}

export interface IGetLinkFromTxResponse {
	links: string[]
	success: IReturnSuccessObject
}

//prepareClaimTx
export interface IPrepareClaimTxParams extends IClaimLinkParams { }

export interface IPrepareClaimTxResponse {
	unsignedTx: TransactionRequest
	success: IReturnSuccessObject
}

//getLinkDetails
export interface IGetLinkDetailsParams {
	link: string
	provider?: ethers.providers.Provider
}

export interface IGetLinkDetailsResponse {
	linkDetails: IPeanutLinkChainDetails
	success: IReturnSuccessObject
}
