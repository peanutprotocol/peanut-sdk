// import peanut from "../../index.js"; // local
import peanut from '@squirrel-labs/peanut-sdk';
import { ethers } from 'ethers'; // ethers v6
import dotenv from 'dotenv';
dotenv.config({path: '../../.env'}); // set up an env file


////////////////////////////////////////////////////////////
// replace with ethers signer from browser wallet
const CHAINID = 5; // goerli
const RPC_URL = "https://rpc.ankr.com/eth_goerli";
// const CHAINID = 137; // matic mainnet
// const RPC_URL = "https://polygon.llamarpc.com";

// create goerli wallet with optimism rpc
const wallet = new ethers.Wallet(
    process.env.TEST_WALLET_PRIVATE_KEY,
    new ethers.JsonRpcProvider(RPC_URL)
);
////////////////////////////////////////////////////////////

// create link
const { link, txReceipt } = await peanut.createLink({
  signer: wallet,
  chainId: CHAINID,
  tokenAmount: 0.001,
  tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
  verbose: true,
});

// get status of link
console.log((await peanut.getLinkStatus({signer: wallet, link: link})).claimed);


// claim link
await new Promise(r => setTimeout(r, 6000));
const claimTx = await peanut.claimLink({ signer: wallet, link: link });
console.log("claimTx: ", claimTx.hash);

// GASLESS
// const res = await peanut.claimLinkGasless(link, wallet.address, process.env.PEANUT_DEV_API_KEY);
// console.log(res);

// get status of link
console.log((await peanut.getLinkStatus({signer: wallet, link: link})).claimed);