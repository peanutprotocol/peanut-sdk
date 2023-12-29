import { promisify } from 'util'
import { exec as execRaw } from 'child_process'
import { ethers } from 'ethersv5'
import { formatEther } from 'ethersv5/lib/utils'
import { config } from '../../src/index'

const exec = promisify(execRaw)

const TENDERLY_PROJECT_NAME = 'peanut'

// Templates that need to be created in Tenderly's UI for each chain
const TEMPLATE_BY_CHAIN: Record<number, string> = {
	1: 'basic-mainnet',
	42161: 'basic-arbitrum',
	137: 'basic-polygon',
}

// Since everything happens on devnets, private keys can be shared publicly
export const SAMPLE_PRIVATE_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
export const SAMPLE_ADDRESS = '0x8fd379246834eac74B8419FfdA202CF8051F7A03'

export const SAMPLE_PRIVATE_KEY_2 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
export const SAMPLE_ADDRESS_2 = '0x88f9B82462f6C4bf4a0Fb15e5c3971559a316e7f'

/**
 * Creates a devnet on Tenderly. Forks the specified chain id at the latest block.
 * Requires tenderly cli to be installed and logged in.
 * @param chainId chain to fork
 * @returns devnet rpc url
 */
export async function createDevnet(chainId: number) {
	const templateSlug = TEMPLATE_BY_CHAIN[chainId]
	if (templateSlug === undefined) throw new Error(`No tenderly template is known for chain id ${chainId}`)

	const command = `tenderly devnet spawn-rpc --project ${TENDERLY_PROJECT_NAME} --template ${templateSlug}`
	const { stderr } = await exec(command)
	const devnetUrl = stderr.trim().toString()

	const provider = new ethers.providers.JsonRpcProvider({
		url: devnetUrl,
	})
	return provider
}

/**
 * Faucets 10k ETH to the specified address
 */
export async function faucetETH(
	tenderlyProvider: ethers.providers.JsonRpcProvider,
	address: string,
	amount: number = 10000
) {
	tenderlyProvider.send('tenderly_addBalance', [address, `0x${(amount * 1e18).toString(16)}`])
	if (config.verbose) {
		const newBalanceWei = await tenderlyProvider.getBalance(address)
		console.log(`Fauceted ${amount} ETH to ${address}. New balance: ${formatEther(newBalanceWei)} ETH.`)
	}
}

/**
 * Create a new devnet, create 2 wallets and faucet 10k ETH to each wallet.
 * @returns JsonRpcProvider and 2 wallets
 */
export async function setupDevnetEnvironment(chainId: number) {
	const provider = await createDevnet(chainId)
	const wallet1 = new ethers.Wallet(SAMPLE_PRIVATE_KEY, provider)
	const wallet2 = new ethers.Wallet(SAMPLE_PRIVATE_KEY_2, provider)
	await faucetETH(provider, wallet1.address)
	await faucetETH(provider, wallet2.address)

	return {
		provider,
		wallet1,
		wallet2,
	}
}
