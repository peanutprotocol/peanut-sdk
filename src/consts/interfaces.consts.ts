import { ethers } from 'ethersv5'
import { TransactionRequest } from '@ethersproject/abstract-provider'

//General export interface s and enums
export interface IPeanutSigner {
	signer: ethers.Signer
	nonce?: number
	maxFeePerGas?: ethers.BigNumber
	maxPriorityFeePerGas?: ethers.BigNumber
	gasLimit?: ethers.BigNumber
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

export enum EPeanutLinkType {
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
	link: string
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

//createLinks
export interface ICreateLinksParams extends Omit<ICreateLinkParams, 'password'> {
	numberOfLinks: number
	passwords?: string[]
}

//claimLinkGasless
export interface IClaimLinkGaslessParams {
	APIKey: string
	baseUrl?: string
	recipientAddress: string
	link: string
}

//ClaimLink
export interface IClaimLinkParams {
	structSigner: IPeanutSigner
	link: string
	recipient?: string
}

export interface IClaimLinkXChainParams {
	structSigner: IPeanutSigner
	link: string
	destinationChainId: string
	isTestnet?: boolean
	maxSlippage: number
	recipient?: string
	destinationTokenAddress?: string
}

export interface IClaimLinkXChainResponse {
	txHash: string
}
export interface IClaimLinkResponse {
	txHash: string
}

export interface IClaimLinkSenderParams {
	structSigner: IPeanutSigner
	depositIndex: number
	contractVersion?: string
}

export interface IClaimLinkSenderResponse {
	txHash: string
}

//prepareCreatetxs
export interface IPrepareTxsParams {
	address: string
	linkDetails: IPeanutLinkDetails
	peanutContractVersion?: string
	batcherContractVersion?: string
	numberOfLinks?: number
	passwords: string[]
	provider?: ethers.providers.Provider
}

export interface IPrepareTxsResponse {
	unsignedTxs: TransactionRequest[]
}

//signAndSubmitTx
export interface ISignAndSubmitTxParams {
	structSigner: IPeanutSigner
	unsignedTx: TransactionRequest
}

export interface ISignAndSubmitTxResponse {
	txHash: string
	tx: ethers.providers.TransactionResponse
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
}

//getLinkDetails
export interface IGetLinkDetailsParams {
	link: string
	provider?: ethers.providers.Provider
}

export interface IGetLinkDetailsResponse {
	linkDetails: IPeanutLinkChainDetails
}

//getCrossChainoptionsForLink
export interface IGetCrossChainOptionsForLinkParams {
	isTestnet: boolean
	sourceChainId: number
	tokenType: number
}

//getSquidRoute
export interface IGetSquidRouteParams {
	isTestnet: boolean
	fromChain: string
	fromToken: string
	fromAmount: string
	toChain: string
	toToken: string
	fromAddress: string
	toAddress: string
	slippage: number
}

//ClaimLinkCrossChain
export interface IClaimLinkCrossChainParams {
	structSigner: IPeanutSigner
	link: string
	destinationChainId: string
	maxSlippage: number
	recipient?: string
	destinationTokenAddress: string
	isTestnet: boolean
}

export interface IClaimLinkCrossChainResponse {
	txHash: string
}

//ClaimLinkCrossChainGasless
export interface IClaimLinkCrossChainGaslessParams {
	APIKey: string
	baseUrl?: string
	recipientAddress: string
	link: string
	destinationChainId: string
	destinationToken: string
	isTestnet: boolean
}

export interface IClaimLinkCrossChainGaslessResponse {
	txHash: string
}

//squid chain and token interfaces
export interface ISquidChain {
	chainId: number
	chainName: string
	chainType: string
	chainIconURI: string
}

export interface ISquidToken {
	chainId: number
	address: string
	name: string
	symbol: string
	logoURI: string
}

// error object and enums

export enum ECreateLinkStatusCodes {
	ERROR_PREPARING_TX,
	ERROR_SIGNING_AND_SUBMITTING_TX,
	ERROR_GETTING_LINKS_FROM_TX,
}

export enum EPrepareCreateTxsStatusCodes {
	ERROR_VALIDATING_LINK_DETAILS,
	ERROR_GETTING_DEFAULT_PROVIDER,
	ERROR_GETTING_TX_COUNT,
	ERROR_PREPARING_APPROVE_ERC20_TX,
	ERROR_PREPARING_APPROVE_ERC721_TX,
	ERROR_PREPARING_APPROVE_ERC1155_TX,
	ERROR_SETTING_FEE_OPTIONS,
	ERROR_ESTIMATING_GAS_LIMIT,
	ERROR_MAKING_DEPOSIT,
}

export enum ESignAndSubmitTx {
	ERROR_SENDING_TX,
	ERROR_SETTING_FEE_OPTIONS,
}

export enum EGetLinkFromTxStatusCodes {
	ERROR_GETTING_TX_RECEIPT_FROM_HASH,
}

export enum EClaimLinkStatusCodes {
	ERROR,
}

export enum EXChainStatusCodes {
	ERROR_GETTING_ROUTE,
	ERROR_GETTING_CHAINS,
	ERROR_GETTING_TOKENS,
	ERROR_WRONG_LINK_TYPE,
	ERROR_UNSUPPORTED_CHAIN,
	ERROR_UNDEFINED_DATA,
	ERROR_UNSUPPORTED_CONTRACT_VERSION,
	ERROR,
}
export enum EGenericErrorCodes {
	GENERIC_ERROR,
	// Add more generic error codes here if needed
}

// Don't forget to add the new enum to the allErrorEnums type
export type allErrorEnums =
	| ECreateLinkStatusCodes
	| EPrepareCreateTxsStatusCodes
	| ESignAndSubmitTx
	| EGetLinkFromTxStatusCodes
	| EClaimLinkStatusCodes
	| EXChainStatusCodes
	| EGenericErrorCodes // New enum added here

export class SDKStatus extends Error {
	code: allErrorEnums
	extraInfo?: any
	originalError?: Error

	constructor(code: allErrorEnums, messageOrOriginalError?: string | Error, extraInfo?: any) {
		let fullMessage = ''
		let originalError: Error | undefined

		if (typeof messageOrOriginalError === 'string') {
			fullMessage = messageOrOriginalError
		} else if (messageOrOriginalError instanceof Error) {
			originalError = messageOrOriginalError
			fullMessage = originalError.message
		}

		if (typeof extraInfo === 'string') {
			fullMessage += ' ' + extraInfo
		} else if (typeof extraInfo === 'object') {
			fullMessage += ' ' + JSON.stringify(extraInfo)
		}

		super(fullMessage.trim())
		this.code = code
		this.message = fullMessage.trim()
		this.extraInfo = extraInfo
		this.originalError = originalError

		// If an original error is provided, use its stack trace
		if (originalError) {
			this.stack = originalError.stack
		}

		// Ensure the instance of is correct
		Object.setPrototypeOf(this, SDKStatus.prototype)
	}
}
