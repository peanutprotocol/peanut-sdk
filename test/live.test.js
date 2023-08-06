import peanut from '@squirrel-labs/peanut-sdk'; // npm
import { ethers } from 'ethersv6';
import dotenv from 'dotenv';

// load .env file
dotenv.config();

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;

async function createAndClaimLink(options) {
	const { link, txReceipt } = await peanut.createLink(options);
	if (txReceipt && txReceipt.hash) {
		await waitForTransaction(options.signer.provider, txReceipt.hash);
	}
	return peanut.claimLink({
		signer: options.signer,
		link: link,
	});
}

async function waitForTransaction(provider, txHash, timeout = 60000) {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const receipt = await provider.getTransactionReceipt(txHash);
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

		const optimismGoerliProvider = new ethers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL);
		const optimismGoerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, optimismGoerliProvider);

		it('should create a native link and claim it', async function () {
			// create link
			const { link, txReceipt } = await peanut.createLink({
				signer: optimismGoerliWallet,
				chainId: 420,
				tokenAmount: 0.00001,
				tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
			});
			setTimeout(() => {}, 6000);
			const claimTx = await peanut.claimLink({
				signer: optimismGoerliWallet,
				link: link,
			});
		}, 60000);
		it('should create an erc20 link and claim it', async function () {
			// create link
			const { link, txReceipt } = await peanut.createLink({
				signer: optimismGoerliWallet,
				chainId: 420,
				tokenAmount: 0.00001,
				tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
			});
			setTimeout(() => {}, 6000);
			const claimTx = await peanut.claimLink({
				signer: optimismGoerliWallet,
				link: link,
			});
		}, 60000);
	});
	describe('goerli', function () {
		const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm';
		const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL);
		const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, goerliProvider);
		const chainId = 5;
		const tokenAmount = 0.0001;

		it('should create a native link and claim it', async function () {
			// create link
			const { link, txReceipt } = await peanut.createLink({
				signer: goerliWallet,
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
			});
			setTimeout(() => {}, 6000);
			const claimTx = await peanut.claimLink({
				signer: goerliWallet,
				link: link,
			});
		}, 60000);
		it('should create an erc20 link and claim it', async function () {
			const tokenAddress = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB'; // goerli LINK
			const tokenDecimals = 18;

			// create link
			const { link, txReceipt } = await peanut.createLink({
				signer: goerliWallet,
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenDecimals: tokenDecimals,
				tokenAddress: tokenAddress,
				tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
			});
			setTimeout(() => {}, 6000);
			const claimTx = await peanut.claimLink({
				signer: goerliWallet,
				link: link,
			});
		}, 60000);
		it('should fail when setting the decimals wrong', async function () {
			try {
				await createAndClaimLink({
					signer: goerliWallet,
					chainId: chainId,
					tokenAmount: tokenAmount,
					tokenDecimals: 38, // Set the wrong decimals
					tokenAddress: tokenAddress,
					tokenType: 0,
				});
				throw new Error('Test should have thrown an error but did not.');
			} catch (e) {
				expect(e.message).toContain('Expected error message here'); // Replace with expected error message
			}
		}, 60000);
	});
	//   describe("create and claim native link on goerli", function () {
	//     it("should create a link and claim it", async function () {
	//       const goerliWallet = new ethers.Wallet(
	//         TEST_WALLET_PRIVATE_KEY,
	//         goerliProvider
	//       );

	//       // create link
	//       const { link, txReceipt } = await peanut.createLink({
	//         signer: goerliWallet,
	//         chainId: 5,
	//         tokenAmount: 0.00001,
	//         tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	//       });
	//       setTimeout(() => {}, 9000);
	//       const claimTx = await peanut.claimLink({
	//         signer: goerliWallet,
	//         link: link,
	//       });
	//     });
	//   });
	// describe("erc20 link", function () {
	// TODO: get erc20 balance on testnet
	//   it("should create and claim an erc20 link", async function () {
	//     const usdcAddress = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F"; // goerli usdc
	//     const usdcDecimals = 6;
	//     const tokenAmount = 0.01;
	//     const chainId = 5;

	//     // approve spending
	//     const { allowance, allowanceTx } = await peanut.approveSpendERC20(
	//       wallet,
	//       chainId,
	//       usdcAddress,
	//       tokenAmount,
	//       usdcDecimals
	//     );
	//     console.log("Approved spending. New allowance: ", allowance.toString());
	//     if (allowanceTx) {
	//       console.log("Approval Tx hash: ", allowanceTx.hash);
	//     };

	//     // create link
	//     const { link, linkTx } = await peanut.createLink({
	//       signer: wallet,
	//       chainId: 5,
	//       tokenAmount: 0.01,
	//       tokenAddress: usdcAddress,
	//       tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	//       tokenDecimals: 6,
	//     });
	//     console.log("Created link: " + link + " with tx hash: " + linkTx.hash);
	//     const claimTx = await peanut.claimLink({signer: wallet, link: link});
	//     console.log("Claimed link. Tx hash: ", claimTx.hash);
	//   });
	// });
});
