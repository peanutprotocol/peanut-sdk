import { ethers, getDefaultProvider } from 'ethersv5'
import { EPeanutLinkType, IPeanutUnsignedTransaction } from './consts/interfaces.consts'
import { ERC20_ABI, LATEST_STABLE_BATCHER_VERSION } from './data'
import { config, interfaces, prepareApproveERC20Tx, resolveFromEnsName } from '.'
import { routeForTargetAmount } from './util'

// INTERFACES
export interface IPrepareRequestLinkFulfillmentTransactionProps {
	recipientAddress: string
	tokenAddress: string
	tokenAmount: string
	tokenType: EPeanutLinkType
	tokenDecimals: number
}

export type IPrepareXchainRequestFulfillmentTransactionProps = {
	senderAddress: string
	fromToken: string
	fromTokenDecimals: number
	fromChainId: string
	squidRouterUrl: string
	provider: ethers.providers.Provider
	tokenType: EPeanutLinkType
	slippagePercentage?: number
	slippageIncrement?: number
	linkDetails: {
		chainId: string
		recipientAddress: string | null
		tokenAmount: string
		tokenAddress: string
		tokenDecimals: number
	}
}

export interface IPrepareRequestLinkFulfillmentTransactionResponse {
	unsignedTx: IPeanutUnsignedTransaction
}

// FUNCTIONS

export async function prepareXchainRequestFulfillmentTransaction(
	props: IPrepareXchainRequestFulfillmentTransactionProps
): Promise<interfaces.IPrepareXchainRequestFulfillmentTransactionResponse> {
	let {
		senderAddress,
		fromToken,
		fromTokenDecimals,
		fromChainId,
		squidRouterUrl,
		provider,
		tokenType,
		slippagePercentage,
		slippageIncrement,
		linkDetails,
	} = props
	let {
		chainId: destinationChainId,
		recipientAddress,
		tokenAmount: destinationTokenAmount,
		tokenDecimals: destinationTokenDecimals,
		tokenAddress: destinationToken,
	} = linkDetails
	if (recipientAddress.endsWith('.eth')) {
		recipientAddress = await resolveFromEnsName({ ensName: recipientAddress })
		if (undefined === recipientAddress) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_RESOLVING_ENS_NAME,
				'Error resolving ENS name'
			)
		}
	}
	let txOptions: interfaces.ITxOptions = {}
	if (!provider) {
		try {
			provider = getDefaultProvider(destinationChainId)
		} catch (error) {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_GETTING_DEFAULT_PROVIDER,
				'Error getting the default provider'
			)
		}
	}
	if (fromToken == '0x0000000000000000000000000000000000000000') {
		// Update for Squid compatibility
		config.verbose && console.log('Source token is 0x0000, converting to 0xEeee..')
		fromToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	if (destinationToken == '0x0000000000000000000000000000000000000000') {
		// Update for Squid compatibility
		config.verbose && console.log('Destination token is 0x0000, converting to 0xEeee..')
		destinationToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
	}

	const fromTokenData = {
		address: fromToken,
		chainId: fromChainId,
		decimals: fromTokenDecimals,
	}
	const toTokenData = {
		address: destinationToken,
		chainId: destinationChainId,
		decimals: destinationTokenDecimals,
	}

	const { estimatedFromAmount, weiFromAmount, routeResult, finalSlippage } = await routeForTargetAmount({
		slippagePercentage,
		fromToken: fromTokenData,
		toToken: toTokenData,
		targetAmount: destinationTokenAmount,
		squidRouterUrl,
		fromAddress: senderAddress,
		toAddress: recipientAddress,
		slippageIncrement,
	})

	// Transaction estimation from Squid API allows us to know the transaction fees (gas and fee), then we can iterate over them and add the values ​​that are in dollars
	// Explanation:
	// feeCosts: Service fees that may be charged by the Squid.
	// gasCosts: Network gas fees charged for blockchain transactions.
	// feeEstimation: The total estimated fee, which is the sum of both feeCosts and gasCosts.
	// Why loops?: Each of these costs can contain multiple items (multiple txs such as approve, swap, etc), so we iterate through each to add their USD values to the total estimated fee.

	let feeEstimation = 0
	if (routeResult.txEstimation.feeCosts.length > 0) {
		routeResult.txEstimation.feeCosts.forEach((fee: { amountUsd: string }) => {
			feeEstimation += Number(fee.amountUsd)
		})
	}

	if (routeResult.txEstimation.gasCosts.length > 0) {
		routeResult.txEstimation.gasCosts.forEach((gas: { amountUsd: string }) => {
			feeEstimation += Number(gas.amountUsd)
		})
	}

	const unsignedTxs: interfaces.IPeanutUnsignedTransaction[] = []

	if (tokenType == EPeanutLinkType.native) {
		txOptions = {
			...txOptions,
		}
	} else if (tokenType == EPeanutLinkType.erc20) {
		config.verbose && console.log('checking allowance...')
		try {
			const approveTx: interfaces.IPeanutUnsignedTransaction = await prepareApproveERC20Tx(
				senderAddress,
				destinationChainId,
				fromToken,
				weiFromAmount,
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

	unsignedTxs.push({
		data: routeResult.calldata,
		to: routeResult.to,
		value: BigInt(routeResult.value.toString()),
	})

	return {
		unsignedTxs,
		feeEstimation: feeEstimation.toString(),
		estimatedFromAmount,
		slippagePercentage: finalSlippage,
	}
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

function throwDeprecatedError(): never {
	throw new Error(
		'This function has been deprecated. Please check how to use the request API in https://docs.peanut.to/request-api'
	)
}

export function createRequestLink(_data: object): Promise<object> {
	throwDeprecatedError()
}

export function getRequestLinkDetails(_data: object): Promise<object> {
	throwDeprecatedError()
}

export function submitRequestLinkFulfillment(_data: object): Promise<object> {
	throwDeprecatedError()
}

export function getUuidFromLink(_data: string): string {
	throwDeprecatedError()
}
