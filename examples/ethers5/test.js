import peanut from '@squirrel-labs/peanut-sdk';
import { ethers } from 'ethers'; // ethers v5.7.2
import dotenv from 'dotenv';
dotenv.config({path: '../../.env'});

////////////////////////////////////////////////////////////
// replace with ethers signer from browser wallet
const CHAINID = 5; // goerli
const RPC_URL = "https://rpc.ankr.com/eth_goerli";
// const CHAINID = 137; // matic mainnet
// const RPC_URL = "https://polygon.llamarpc.com";

// create goerli wallet with optimism rpc
const wallet = new ethers.Wallet(
    process.env.TEST_WALLET_PRIVATE_KEY,
    new ethers.providers.JsonRpcProvider(RPC_URL)
);
////////////////////////////////////////////////////////////

// print version of ethers
console.log(ethers.version);

// create link
const { link, txReceipt } = await peanut.createLink({
  signer: wallet,
  chainId: CHAINID,
  tokenAmount: 0.0001,
  tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
  verbose: true,
});

// get status of link
console.log((await peanut.getLinkStatus({signer: wallet, link: link})).claimed);


// claim link
const claimTx = await peanut.claimLink({ signer: wallet, link: link });
console.log("claimTx: ", claimTx.hash);

console.log((await peanut.getLinkStatus({signer: wallet, link: link})).claimed);
