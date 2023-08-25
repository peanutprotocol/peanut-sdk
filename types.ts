export interface createLinkProp {
	signer: any
	chainId: number | string
	tokenAmount: number
	tokenAddress?: string
	tokenType?: number
	tokenId?: number
	tokenDecimals?: number
	password?: string
	baseUrl?: string
	trackId?: string
	maxFeePerGas?: any
	maxPriorityFeePerGas?: any
	gasLimit?: any
	eip1559?: boolean
	verbose?: boolean
	contractVersion?: string
	nonce?: any
	fallBackContractVersion?: string
}
