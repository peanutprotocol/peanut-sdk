import { BigNumber, ethers } from 'ethersv5'
import { Provider } from '@ethersproject/abstract-provider'

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
	chainId: string
	tokenAmount: number | string
	tokenType?: EPeanutLinkType
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

export interface IPeanutUnsignedTransaction {
	from?: string
	to?: string
	data?: string
	value?: BigInt
}

export interface IReturnSuccessObject {
	status: boolean
	errorCode?: number
	errorMessage?: string
}

export interface IGetAllUnclaimedDepositsWithIdxForAddressParams {
	address: string
	chainId: string
	peanutContractVersion: string
	provider?: ethers.providers.JsonRpcProvider
	claimedOnly?: boolean
}

export interface IClaimAllUnclaimedAsSenderPerChainParams {
	structSigner: IPeanutSigner
	peanutContractVersion?: string
}

//createLink
export interface ICreateLinkParams {
	structSigner: IPeanutSigner
	linkDetails: IPeanutLinkDetails
	peanutContractVersion?: string
	password?: string
	recipient?: string // only this address will be able to claim if set
	reclaimableAfter?: number // timestamp in seconds
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

//claimLinkXChainGasless
export interface IClaimLinkXChainGaslessParams {
	APIKey: string
	recipientAddress: string
	link: string
	destinationChainId: string
	destinationToken?: string
	isMainnet?: boolean
	baseUrl?: string
	squidRouterUrl?: string
	slippage?: number
	squidIntegratorId?: string
}

export interface IClaimLinkXChainGaslessResponse {
	txHash: string
}

export interface IClaimLinkGaslessResponse {
	txHash: string
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
	squidIntegratorId?: string
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
export interface IPrepareDepositTxsParams {
	address: string
	linkDetails: IPeanutLinkDetails
	peanutContractVersion?: string
	batcherContractVersion?: string
	numberOfLinks?: number
	passwords: string[]
	provider?: ethers.providers.Provider
	recipient?: string // only this address will be able to claim if set
	// after what timestamp (in seconds) is the recipient-bound link reclaimable by the sender
	reclaimableAfter?: number
}

export interface IPrepareDepositTxsResponse {
	unsignedTxs: IPeanutUnsignedTransaction[]
}

export interface IPrepareXchainRequestFulfillmentTransactionResponse {
	unsignedTxs: IPeanutUnsignedTransaction[]
	feeEstimation: string
	estimatedFromAmount: string
	slippagePercentage: number
}

//signAndSubmitTx
export interface ISignAndSubmitTxParams {
	structSigner: IPeanutSigner
	unsignedTx: IPeanutUnsignedTransaction
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

// X-Chain

export interface ISquidRoute {
	value: BigNumber
	calldata: string
	to: string
	txEstimation?: any
}

//getCrossChainoptionsForLink
export interface IGetCrossChainOptionsForLinkParams {
	isTestnet: boolean
	sourceChainId: string
	tokenType: number
}

//getSquidRoute
export interface IGetSquidRouteParams {
	squidRouterUrl?: string
	fromChain: string
	fromToken: string
	fromAmount: string
	toChain: string
	toToken: string
	fromAddress: string
	toAddress: string
	slippage?: number
	enableForecall?: boolean
	enableBoost?: boolean
	squidIntegratorId?: string
}

//squid chain and token interfaces
export interface ISquidChain {
	chainId: string
	axelarChainName: string
	chainType: string
	chainIconURI: string
}

export interface ISquidToken {
	active: boolean
	chainId: string
	address: string
	decimals: number
	name: string
	symbol: string
	logoURI: string
	usdPrice: number
}

export interface ICreateClaimXChainPayload {
	link: string
	recipient: string
	destinationChainId: string
	destinationToken?: string
	squidRouterUrl?: string
	isMainnet?: boolean
	slippage?: number
	squidIntegratorId?: string
}

export interface IXchainClaimPayload {
	chainId: string
	contractVersion: string

	// Payload to the withdrawAndBridge function
	peanutAddress: string
	depositIndex: number
	withdrawalSignature: string
	squidFee: BigNumber
	peanutFee: BigNumber
	squidData: string
	routingSignature: string
}

export interface IPopulateXChainClaimTxParams {
	payload: IXchainClaimPayload
	provider?: Provider
}

// Gasless deposits with EIP-3009 via EIP-712

export interface EIP712Domain {
	name: string
	version: string
	chainId: string // Hex
	verifyingContract: string // address
}

export interface EIP3009TokensInterface {
	[chainId: string]: {
		[address: string]: EIP712Domain // Important! Address must be checksummed
	}
}

export interface IPrepareGaslessDepositParams {
	address: string
	contractVersion: string
	linkDetails: IPeanutLinkDetails
	password: string
}

export interface IPreparedEIP712Message {
	types: any
	primaryType: string
	domain: EIP712Domain
	values: any
}

export interface IGaslessDepositPayload {
	chainId: string
	contractVersion: string

	// Payload to the function itself
	tokenAddress: string
	from: string
	uintAmount: ethers.BigNumber
	pubKey20: string
	nonce: string // Hex
	validAfter: ethers.BigNumber
	validBefore: ethers.BigNumber
}

export interface IMakeGaslessDepositPayloadResponse {
	payload: IGaslessDepositPayload
	message: IPreparedEIP712Message
}

export interface IPrepareGaslessDepositTxParams {
	provider?: Provider
	payload: IGaslessDepositPayload
	signature: string
}

// Gasless reclaims via a EIP-712 signature

export interface IMakeGaslessReclaimPayloadParams {
	address: string
	chainId: string
	depositIndex: number
	contractVersion?: string
}

export interface IGaslessReclaimPayload {
	chainId: string
	contractVersion: string

	// payload to the function itself
	depositIndex: number
	signer: string
}

export interface IMakeGaslessReclaimPayloadResponse {
	payload: IGaslessReclaimPayload
	message: IPreparedEIP712Message
}

export interface IPrepareGaslessReclaimTxParams {
	provider?: Provider
	payload: IGaslessReclaimPayload
	signature: string
}

export interface IExecuteGaslessReclaimResponse {
	txHash: string
}

export interface IMakeDepositGaslessParams {
	APIKey: string
	baseUrl?: string
	payload: IGaslessDepositPayload
	signature: string
}

export interface IMakeReclaimGaslessParams {
	APIKey: string
	baseUrl?: string
	payload: IGaslessReclaimPayload
	signature: string
}

export interface IPrepareRaffleDepositTxsParams {
	userAddress: string
	linkDetails: IPeanutLinkDetails
	numberOfLinks: number
	tokenIds?: BigNumber[]
	amounts?: BigNumber[]
	password: string
	withMFA: boolean
	// no need for other withX options as withMFA is the only one that matters here
	provider?: Provider
}

export interface IGetRaffleLinkFromTxParams {
	txHash: string
	linkDetails: IPeanutLinkDetails
	password: string
	numberOfLinks: number
	provider?: Provider
	name?: string
	APIKey: string
	baseUrl?: string
	withMFA: boolean
	withCaptcha: boolean
	withENS: boolean
	withWeb3Email: boolean
	withSignedMessage: boolean
}

export interface IGetRaffleLinkFromTxResponse {
	link: string
}

export interface IGetRaffleInfoParams {
	link: string
	APIKey?: string
	baseUrl?: string
}

export interface IRaffleInfo {
	chainId: string
	isActive: boolean
	totalSlotsNumber: number
	claimedSlotsNumber: number
	senderAddress: string
	senderName: string
	withMFA: boolean
	withCaptcha: boolean
	withENS: boolean
	withWeb3Email: boolean
	withSignedMessage: boolean
}

export interface ILinkParams {
	chainId: string
	contractVersion: string
	depositIdx: number
	password: string
	trackId: string
}

export interface ILinkRawParams {
	chainId: string
	contractVersion: string
	depositIndices: string
	password: string
	trackId: string
}

export interface IPeanutV4_2Deposit {
	pubKey20: string
	amount: BigNumber
	tokenAddress: string
	contractType: number
	claimed: boolean
	timestamp: number
	tokenId: BigNumber
	senderAddress: string
}

export interface IClaimRaffleLinkParams {
	link: string
	APIKey: string
	recipientAddress: string
	recipientName?: string
	captchaResponse?: string
	baseUrlAuth?: string
	baseUrlClaim?: string
	provider?: Provider
}

export interface IClaimRaffleLinkResponse {
	txHash?: string
	chainId: string
	amountReceived: string
	tokenAddress: string
	tokenDecimals: number
	tokenSymbol: string
	tokenName: string
}

export interface IGetRaffleAuthorisationParams {
	link: string
	APIKey: string
	recipientAddress: string
	recipientName: string
	captchaResponse?: string
	baseUrl?: string
}

export interface IGetRaffleAuthorisationResponse {
	depositIdx: number
	authorisation: string // MFA signature
}

export interface IRaffleLeaderboardEntry {
	address: string
	name: string | null
	amount: string
	usdValue: string | null
	tokenAddress: string
	tokenSymbol: string
}

export interface IGenerosityLeaderboardEntry {
	address: string
	name: string | null
	linksCreated: number
}

export interface IPopularityLeaderboardEntry {
	address: string
	name: string | null
	popularity: number
}

export interface IAddUsername {
	address: string
	name: string
	link: string
	APIKey: string
	baseUrl?: string
}

export interface IGetUsername {
	address: string
	link: string
	APIKey: string
	baseUrl?: string
}

export interface IAddLinkClaim {
	claimerAddress: string
	name?: string
	depositIndex: number
	amount: string
	link: string
	APIKey: string
	baseUrl?: string
}

export interface IAddLinkCreation {
	name?: string
	link: string
	withMFA: boolean
	withCaptcha: boolean
	withENS: boolean
	withWeb3Email: boolean
	withSignedMessage: boolean
	APIKey: string
	baseUrl?: string
}

export interface IGetRaffleLeaderboard {
	link: string
	userAddress?: string
	APIKey: string
	baseUrl?: string
}

export interface IGetLeaderboard {
	baseUrl?: string
}

export interface IIsAddressEligible {
	address: string
	link: string
	APIKey: string
	baseUrl?: string
}

export interface IValidateRaffleLink {
	link: string
}

export interface IUserRaffleStatus {
	requiresCaptcha: boolean
	userResults: IRaffleLeaderboardEntry | null
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
	ERROR_RESOLVING_ENS_NAME,
}

export enum ESignAndSubmitTx {
	ERROR_BROADCASTING_TX,
	ERROR_SETTING_FEE_OPTIONS,
	ERROR_INSUFFICIENT_NATIVE_TOKEN,
}

export enum ESetFeeOptionsStatusCodes {
	ERROR_PROVIDER_OR_CHAINID_REQUIRED,
	ERROR_PROVIDER_CHAINID_MISMATCH,
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
	ERROR_UNSUPPORTED_CHAIN,
	ERROR_NAME_TOO_LONG,
	ERROR_PROHIBITED_SYMBOL,
	ERROR_GETTING_TOKENBALANCE,
	ERROR_UNSUPPORTED_TOKEN,
	// Add more generic error codes here if needed
}

export enum ERaffleErrorCodes {
	ERROR_VALIDATING_LINK_DETAILS,
	ALL_SLOTS_ARE_CLAIMED,
	CAPTCHA_REQUIRED,
	ERROR,
}

// Don't forget to add the new enum to the allErrorEnums type
export type allErrorEnums =
	| ECreateLinkStatusCodes
	| EPrepareCreateTxsStatusCodes
	| ESignAndSubmitTx
	| EGetLinkFromTxStatusCodes
	| EClaimLinkStatusCodes
	| EXChainStatusCodes
	| ERaffleErrorCodes
	| EGenericErrorCodes // New enum added here
	| ESetFeeOptionsStatusCodes

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
