import dotenv from 'dotenv'
dotenv.config()

export const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY!
export const TEST_RELAYER_PRIVATE_KEY = process.env.TEST_RELAYER_PRIVATE_KEY!
export const PEANUT_DEV_API_KEY = process.env.PEANUT_DEV_API_KEY!

// The native tests will run on these chains. These are all the 'big' chains that are used the most
export const chains = ['56', '42161', '137', '10', '324', '43114', '11155111']

// The ERC20 tests will run on these chains, where the address is defined, all USDC
// TODO: update the address to the correct USDC address and fund test wallet
export const erc20Addresses = {
	'137': {
		address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
		decimals: 6,
	},
	'56': {
		address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
		decimals: 18,
	},
	'43114': {
		address: '',
		decimals: 6,
	},
	'10': {
		address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
		decimals: 6,
	},
	'324': {
		address: '',
		decimals: 6,
	},
	'42161': {
		address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
		decimals: 6,
	},
}

// The chains that will be used for the xchain tests, a random chain will be selected for source and destination.
// Only 3 big chains are in here, these will always have enough liquidity to claim the link xchain from any to any chain
export const xchainChains = ['42161', '137', '10']

// Random list of recipient addresses that are used for the raffle claiming tests
// Multiple wallets in here to claim raffle tests
export const recipientAddresses = [
	'0x2d826aD1EAD5c8a2bC46ab93d9D0c6BEe0d39918',
	'0x04B5f21facD2ef7c7dbdEe7EbCFBC68616adC45C',
]
