// claim the following link:
// https://peanut.to/claim?c=10&v=v3&i=38&p=ewpDyjdQghTvs7Zn&t=sdk


// import peanut from '@squirrel-labs/peanut-sdk'; // npm
import peanut from "../../index.js"; // local
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();


const link = "https://peanut.to/claim?c=10&v=v3&i=38&p=ewpDyjdQghTvs7Zn&t=sdk";

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;
const OPTIMISM_RPC_URL = "https://opt-mainnet.g.alchemy.com/v2/demo";
const wallet = new ethers.Wallet(
  TEST_WALLET_PRIVATE_KEY,
  new ethers.JsonRpcProvider(OPTIMISM_RPC_URL)
);

// get wallet

// get status of link
const status = await peanut.getLinkStatus({signer: wallet, link: link});
console.log(status);


// claim link
const claimTx = await peanut.claimLink({ signer: wallet, link: link });
console.log(claimTx);