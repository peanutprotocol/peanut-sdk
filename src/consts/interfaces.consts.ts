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
	status: boolean
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
	status: SDKStatus
}

//createLinks
export interface ICreateLinksParams extends Omit<ICreateLinkParams, 'password'> {
	numberOfLinks: number
	passwords?: string[]
}

export interface ICreateLinksResponse {
	createdLinks: ICreatedPeanutLink[]
	status: SDKStatus
}

export enum ECreateLinksStatusCodes {
	SUCCESS,
	ERROR_PREPARING_TXs,
	ERROR_SIGNING_AND_SUBMITTING_TX,
	ERROR_GETTING_LINKS_FROM_TX,
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
	status: SDKStatus
}

//ClaimLink
export interface IClaimLinkParams {
	structSigner: IPeanutSigner
	link: string
	recipient?: string
}

export interface IClaimLinkResponse {
	txHash: string
	status: SDKStatus
}

//prepareCreatetxs
export interface IPrepareCreateTxsParams {
	address: string
	linkDetails: IPeanutLinkDetails
	peanutContractVersion?: string
	batcherContractVersion?: string
	numberOfLinks?: number
	passwords: string[]
	provider?: ethers.providers.Provider
}

export interface IPrepareCreateTxsResponse {
	unsignedTxs: TransactionRequest[]
	status: SDKStatus
}

//signAndSubmitTx
export interface ISignAndSubmitTxParams {
	structSigner: IPeanutSigner
	unsignedTx: TransactionRequest
}

export interface ISignAndSubmitTxResponse {
	txHash: string
	status: SDKStatus
}

//getLink
export interface IGetLinkFromTxParams {
	linkDetails: IPeanutLinkDetails
	txHash: string
	provider?: ethers.providers.Provider
	passwords: string[]
}

export interface IGetLinkFromTxResponse {
	links: string[]
	status: SDKStatus
}

//prepareClaimTx
export interface IPrepareClaimTxParams extends IClaimLinkParams {}

export interface IPrepareClaimTxResponse {
	unsignedTx: TransactionRequest
	status: SDKStatus
}

//getLinkDetails
export interface IGetLinkDetailsParams {
	link: string
	provider?: ethers.providers.Provider
}

export interface IGetLinkDetailsResponse {
	linkDetails: IPeanutLinkChainDetails
	success: SDKStatus
}

//error object and enums

export enum ECreateLinkStatusCodes {
	SUCCESS,
	ERROR_VALIDATING_LINK_DETAILS,
	ERROR_PREPARING_TX,
	ERROR_SIGNING_AND_SUBMITTING_TX,
	ERROR_GETTING_LINKS_FROM_TX,
}

export enum EPrepareCreateTxsStatusCodes {
	SUCCESS,
	ERROR_VALIDATING_LINK_DETAILS,
	ERROR_GETTING_DEFAULT_PROVIDER,
	ERROR_GETTING_TX_COUNT,
	ERROR_PREPARING_APPROVE_ERC20_TX,
	ERROR_SETTING_FEE_OPTIONS,
	ERROR_ESTIMATING_GAS_LIMIT,
	ERROR_MAKING_DEPOSIT,
}

export enum ESignAndSubmitTx {
	SUCCESS,
	ERROR_SENDING_TX,
}

export enum EGetLinkFromTxStatusCodes {
	SUCCESS,
	ERROR_GETTING_TX_RECEIPT_FROM_HASH,
}

export enum EClaimLinkStatusCodes {
	SUCCESS,
	ERROR,
}

export type allErrorEnums =
	| ECreateLinkStatusCodes
	| EPrepareCreateTxsStatusCodes
	| ESignAndSubmitTx
	| EGetLinkFromTxStatusCodes
	| EClaimLinkStatusCodes

export class SDKStatus extends Error {
	code: allErrorEnums
	extraInfo?: any

	constructor(code: allErrorEnums, message?: string, extraInfo?: any) {
		super(message)
		this.code = code
		this.message = extraInfo

		// Ensure the instance of is correct
		Object.setPrototypeOf(this, SDKStatus.prototype)
	}
}
