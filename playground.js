import peanut from "./index.js"; // local
import assert from "assert";
import { ethers } from "ethers";
import dotenv from "dotenv";

// load .env file
dotenv.config();

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;
const RPC_URL = process.env.POKT_POLYGON_RPC;
const PROVIDER = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(
  TEST_WALLET_PRIVATE_KEY,
  PROVIDER
);

// // create link
// console.log("Creating link...");
// const { link, txReceipt } = await peanut.createLink({
//   signer: wallet,
//   chainId: 5,
//   tokenAmount: 0.0001337,
//   tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
// });
// console.log("Created link: " + link + " with tx hash: " + txReceipt.hash);

const link = "https://peanut.to/claim?c=matic&v=v3&i=532&p=jpMbe103dyACI1FV";
const linkStatus = await peanut.getLinkStatus({signer: wallet, link: link});
console.log("Link status: ", linkStatus);

// --------------------------------------------------

// const usdcAddress = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F"; // goerli usdc
// const usdcDecimals = 6;
// const tokenAmount = 0.01;
// const chainId = 5;

// console.log(
//   "Creating erc20 link with token amount: " +
//     tokenAmount +
//     " and token address: " +
//     usdcAddress
// );

// // approve spending
// const { allowance, allowanceTx } = await peanut.approveSpendERC20(
//   wallet,
//   chainId,
//   usdcAddress,
//   tokenAmount,
//   usdcDecimals
// );
// console.log("Current allowance: ", allowance.toString());
// if (allowanceTx) {
//   console.log("Approval Tx hash: ", allowanceTx.hash);
// }

// // create link
// const { link, linkTx } = await peanut.createLink({
//   signer: wallet,
//   chainId: 5,
//   tokenAmount: 0.01,
//   tokenAddress: usdcAddress,
//   tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
//   tokenDecimals: 6,
// });
// console.log("Created link: " + link);
// if (linkTx) {
//   console.log("Link creation tx hash: " + linkTx.hash);
// }
// const claimTx = await peanut.claimLink({ signer: wallet, link: link });
// console.log("Claimed link. Tx hash: ", claimTx.hash);

// -----------------------------------------------------