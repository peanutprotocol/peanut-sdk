// // import peanut from '@squirrel-labs/peanut-sdk'; // v6
// import peanut from '@squirrel-labs/peanut-sdk'; // v5
import peanut from '../index';  // import directly from source code
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// load .env file
dotenv.config();

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;

async function createAndClaimLink(options, inbetweenDelay = 1000) {
	const { link, txReceipt } = await peanut.createLink(options);
	if (txReceipt && txReceipt.hash) {
		await waitForTransaction(options.signer.provider, txReceipt.hash);
	}
	await new Promise(res => setTimeout(res, inbetweenDelay)); // Wait for 1 second before claiming
	return peanut.claimLink({
		signer: options.signer,
		link: link,
	});
}

async function waitForTransaction(provider, txHash, timeout = 60000) {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const receipt = await provider.getTransactionReceipt(txHash); // v5/v6?
		if (receipt && receipt.blockNumber) {
			return receipt;
		}
		await new Promise(res => setTimeout(res, 1000)); // Wait for 1 second before retrying
	}

	throw new Error('Transaction was not confirmed within the timeout period.');
}

describe('Peanut SDK LIVE Integration Tests', function () {
	describe('optimism goerli', function () {
		const OPTIMISM_GOERLI_RPC_URL = 'https://rpc.goerli.optimism.gateway.fm';

		// const optimismGoerliProvider = new ethers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v6
		const optimismGoerliProvider = new ethers.providers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v5
		const optimismGoerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, optimismGoerliProvider);

		it('should create a native link and claim it', async function () {
			await createAndClaimLink({
				signer: optimismGoerliWallet,
				chainId: 420,
				tokenAmount: 0.00001,
				tokenType: 0,
			});
			// Add assertion here
		}, 60000);
		it('should create an erc20 link and claim it', async function () {
			// TODO. Do nothing for now
		}, 60000);
	});
	describe('goerli', function () {
		const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm';
		// // const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL); // v6
		const goerliProvider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL); // v5
		const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, goerliProvider);
		const chainId = 5;
		const tokenAmount = 0.0001;

		it('should create a native link and claim it', async function () {
			await createAndClaimLink({
				signer: goerliWallet,
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenType: 0,
			}, 5000);
		}, 60000);
		it('should create an erc20 link and claim it', async function () {
			const tokenAddress = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB'; // goerli LINK
			const tokenDecimals = 18;

			// create link
			await createAndClaimLink({
				signer: goerliWallet,
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenDecimals: tokenDecimals,
				tokenAddress: tokenAddress,
				tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
			});
		}, 180000);
		it('should fail when no tokenAddress', async function () {
			try {
				await createAndClaimLink({
					signer: goerliWallet,
					chainId: chainId,
					tokenAmount: tokenAmount,
					tokenDecimals: 18,
					tokenType: 1,
				});
				throw new Error('Test should have thrown an error but did not.');
			} catch (e) {
				expect(e.message).toContain('tokenAddress must be provided for non-native tokens'); // Replace with expected error message
			}
		}, 60000);
	});
});
