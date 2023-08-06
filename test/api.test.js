// import peanut from '@squirrel-labs/peanut-sdk'; // v6
import peanut from '@squirrel-labs/peanut-sdk-ethersv5'; // v5
// import { ethers } from 'ethersv6'; // v6
import { ethers } from 'ethersv5'; // v5
import dotenv from 'dotenv';

// load .env file
dotenv.config();

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;
const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm';
const OPTIMISM_GOERLI_RPC_URL = 'https://rpc.goerli.optimism.gateway.fm';
// const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL); // v6
const goerliProvider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL); // v5
const optimismGoerliProvider = new ethers.providers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v5
// const optimismGoerliProvider = new ethers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v6


const optimism_goerli_wallet = new ethers.Wallet(
	TEST_WALLET_PRIVATE_KEY,
	optimismGoerliProvider
);

describe('Peanut API Integration Tests', function () {
	// create a link and then claim it with the API
	const apiToken = process.env.PEANUT_DEV_API_KEY;

	it('get Link Status', async function () {
		const link = 'https://peanut.to/claim?c=420&v=v3&i=382&p=PdOR8bfWUuP4MGzw&t=sdk';
		const status = await peanut.getLinkStatus({ signer: optimism_goerli_wallet, link: link });
		expect(status.claimed).toBe(false);
	});

	describe('create and claim BASE link on opt-goerli', function () {
		return;

		// wait 1 second to avoid replacement transaction error

		const chainId = 420; // optimism goerli
		const tokenAmount = 0.0001337;
		const tokenType = 0; // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155

		it('should create a link and claim it', async function () {
			setTimeout(() => {}, 9000);
			const { link, txReceipt } = await peanut.createLink({
				signer: optimism_goerli_wallet,
				chainId: chainId,
				tokenAmount: tokenAmount,
				tokenType: tokenType,
			});

			// check status of link
			setTimeout(() => {}, 2000);
			const status = await peanut.getLinkStatus({ signer: optimism_goerli_wallet, link: link });
			assert.strictEqual(status.claimed, false);

			// claim link using api
			const receiverAddress = optimism_goerli_wallet.address;
			setTimeout(() => {}, 9000);
			const res = await peanut.claimLinkGasless(link, receiverAddress, apiToken);
		}, 60000); // 60 seconds timeout
	});
});
