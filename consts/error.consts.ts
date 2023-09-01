interface ICustomError {
	code: string
	message: string
}

export class InvalidVersionError extends Error implements ICustomError {
	code = 'Invalid version'
	message = 'Invalid version of the peanut contract.'
}

export class ContractNotDeployedError extends Error implements ICustomError {
	code: string
	message: string

	constructor(version: string, chainId: string) {
		super()
		this.code = 'Contract not deployed'
		this.message = `Contract ${version} not deployed on chain with ID ${chainId}.`
	}
}

export class NoProviderFoundError extends Error implements ICustomError {
	code: string
	message: string

	constructor(chainId: string) {
		super()
		this.code = 'No provider found'
		this.message = `No alive provider found for chain with ID ${chainId}.`
	}
}

export class TokenAddressAndTypeError extends Error implements ICustomError {
	code = 'Token address and type'
	message = 'tokenAddress is null but tokenType is not 0.'
}

export class AllowanceError extends Error implements ICustomError {
	code = 'Allowance'
	message = 'Allowance is not enough.'
}

export class TokenAmountError extends Error implements ICustomError {
	code = 'Token amount'
	message = 'Either tokenAmount or tokenAmounts must be provided.'
}

export class NotImlementedError extends Error implements ICustomError {
	code = 'Not implemented'
	message = 'This functionality is not implemented yet.'
}

export class ChaindetailsNotFoundError extends Error implements ICustomError {
	code = 'Chain details not found'
	message = 'Chain details not found.d'
}
export class TokendetailsNotFoundError extends Error implements ICustomError {
	code = 'Token details not found'
	message = 'Token details not found.'
}
export class ConnectError extends Error implements ICustomError {
	code = 'Connect wallet'
	message = 'Connect wallet first please.'
}
