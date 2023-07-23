import peanut from "../../index.js"; // local
// import peanut from '@squirrel-labs/peanut-sdk';
import { ethers } from 'ethers'; // ethers v6
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });


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


// create link - batch function!
const { links, txReceipt } = await peanut.createLinks({
    signer: wallet,
    chainId: CHAINID,
    numberOfLinks: 20,
    tokenAmount: 0.0001,
    tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
    verbose: true,
    trackId: "test" // optional, user defined string

});

console.log(links);
// console.log(txReceipt);

// get status of first 3 links
console.log((await peanut.getLinkStatus({signer: wallet, link: links[0]})).claimed);
console.log((await peanut.getLinkStatus({signer: wallet, link: links[1]})).claimed);
console.log((await peanut.getLinkStatus({signer: wallet, link: links[2]})).claimed);

// claim first 3 links
console.log("claiming first 3 links...");

await new Promise(r => setTimeout(r, 1000));
const claimTx = await peanut.claimLink({ signer: wallet, link: links[0] });
console.log("claimTx: ", claimTx.hash);
console.log((await peanut.getLinkStatus({signer: wallet, link: links[0]})).claimed);

await new Promise(r => setTimeout(r, 1000));
const claimTx2 = await peanut.claimLink({ signer: wallet, link: links[1] });
console.log("claimTx2: ", claimTx2.hash);
console.log((await peanut.getLinkStatus({signer: wallet, link: links[1]})).claimed);

await new Promise(r => setTimeout(r, 1000));
const claimTx3 = await peanut.claimLink({ signer: wallet, link: links[2] });
console.log("claimTx3: ", claimTx3.hash);
console.log((await peanut.getLinkStatus({signer: wallet, link: links[2]})).claimed);


// // claim link
// console.log("claiming link...");
// await new Promise(r => setTimeout(r, 6000));
// const claimTx = await peanut.claimLink({ signer: wallet, link: links[0] });
// console.log("claimTx: ", claimTx.hash);

// // get status of single link
// console.log((await peanut.getLinkStatus({signer: wallet, link: links[0]})).claimed);

// // claiming second link gaslessly
// console.log("claiming second link gaslessly...");
// // let link2 = "https://peanut.to/claim?c=137&v=v4&i=50&p=yverkC3hhG3mPgcR&t=campaignId"
// // const claimTx2 = await peanut.claimLinkGasless({ recipientAddress: "0x6B3751c5b04Aa818EA90115AA06a4D9A36A16f02", link: link2, apiKey: process.env.PEANUT_DEV_API_KEY });
// const claimTx2 = await peanut.claimLinkGasless(links[1], "0x6B3751c5b04Aa818EA90115AA06a4D9A36A16f02", process.env.PEANUT_DEV_API_KEY);
// // const claimTx2 = await peanut.claimLinkGasless({ recipientAddress: "0x6B3751c5b04Aa818EA90115AA06a4D9A36A16f02", link: links[1], apiKey: process.env.PEANUT_DEV_API_KEY });
// console.log("claimTx2: ", claimTx2);