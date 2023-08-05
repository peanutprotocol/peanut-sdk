import peanut from '@squirrel-labs/peanut-sdk'; // npm
import { ethers } from 'ethersv6';
import dotenv from 'dotenv';

// load ../../../.env file
dotenv.config({ path: '../../../.env' });

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;
const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm';
const OPTIMISM_GOERLI_RPC_URL = 'https://rpc.goerli.optimism.gateway.fm';
const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL);
const optimismGoerliProvider = new ethers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL);

const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, optimismGoerliProvider);

// create link
const { link, txReceipt } = await peanut.createLink({
	signer: goerliWallet,
	chainId: 420,
	tokenAmount: 0.000012,
	tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
	verbose: true,
});
// setTimeout(() => {}, 9000);
// const claimTx = await peanut.claimLink({
// 	signer: goerliWallet,
// 	link: link,
// });

console.log('Link: ', link);
console.log('txReceipt: ', txReceipt);
console.log('Claim Tx: ', claimTx);
console.log('Claim Tx hash: ', claimTx.hash);
console.log('Claim Tx receipt: ', await claimTx.wait());
