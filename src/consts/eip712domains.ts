import { VAULT_CONTRACTS_V4_2_ANDUP } from '../data'
import { EIP3009TokensInterface } from './interfaces.consts'

export const EIP3009Tokens: EIP3009TokensInterface = {
	// '1': {
	// 	'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
	// 		chainId: '1',
	// 		verifyingContract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
	// 		name: 'USD Coin',
	// 		version: '2',
	// 	},
	// },
	'43114': {
		'0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E': {
			chainId: '43114',
			verifyingContract: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
			name: 'USD Coin',
			version: '2',
		},
	},
	'534352': {
		'0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4': {
			chainId: '534352',
			verifyingContract: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
			name: 'USD Coin',
			version: '2',
		},
	},
	'137': {
		'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': {
			chainId: '137',
			verifyingContract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
			name: 'USD Coin',
			version: '2',
		},
	}, // usdc.e on polygon doe have transferWithAuthorization but not receiveWithAuthorization lol, so we don't add it to this list
	'42161': {
		'0xaf88d065e77c8cC2239327C5EDb3A432268e5831': {
			chainId: '42161',
			verifyingContract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
			name: 'USD Coin',
			version: '2',
		},
	}, // usdc.e on arb does not have transferWithAuthorization, so we don't add it to this list
	'10': {
		'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85': {
			chainId: '10',
			verifyingContract: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
			name: 'USD Coin',
			version: '2',
		},
	}, // usdc.e on opti does not have transferWithAuthorization, so we don't add it to this list
	'8453': {
		'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': {
			chainId: '8453',
			verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
			name: 'USD Coin',
			version: '2',
		},
	},
}

export const ReceiveWithAuthorizationTypes: any = {
	ReceiveWithAuthorization: [
		{ name: 'from', type: 'address' },
		{ name: 'to', type: 'address' },
		{ name: 'value', type: 'uint256' },
		{ name: 'validAfter', type: 'uint256' },
		{ name: 'validBefore', type: 'uint256' },
		{ name: 'nonce', type: 'bytes32' },
	],
}

export const GaslessReclaimTypes: any = {
	GaslessReclaim: [{ name: 'depositIndex', type: 'uint256' }],
}

export const VAULT_CONTRACTS_WITH_EIP_3009: Array<string> = VAULT_CONTRACTS_V4_2_ANDUP
export const VAULT_CONTRACTS_WITH_GASLESS_REVOKE: Array<string> = VAULT_CONTRACTS_V4_2_ANDUP
