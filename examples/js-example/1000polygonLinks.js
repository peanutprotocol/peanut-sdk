// SDK example

import peanut from '@squirrel-labs/peanut-sdk'; // npm
import { ethers } from "ethers";
import { promisify } from "util";
import fs from "fs";


const USD_AMOUNT = 1 // amount of usd per link
const MATIC_PRICE = 0.835706 // 1 MATIC = 0.83576 USD
const POLYGON_RPC = "https://polygon-rpc.com"

// !!!IMPORTANT!!!
const FUNDER_WALLET_PRIVATE_KEY = "<INSERT KEY HERE>"
// WARNING: DO NOT COMMIT TO GIT OR SHARE THIS KEY WITH ANYONE. DELETE IT FROM THIS FILE AFTER USE.

// --------------------------------------------------
// Create a signer (you'll have to do this part yourself!)
const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
const wallet = new ethers.Wallet(
  FUNDER_WALLET_PRIVATE_KEY,
  provider
);


// --------------------------------------------------
// Create a CSV file to save the links
const appendFile = promisify(fs.appendFile);

// function to save the link data to a CSV file:
async function saveLinkToCSV(link, txReceipt) {
  const csvData = `${link}\n`;
  await appendFile("links.csv", csvData);
}


// function to create a link and save it to a CSV file
async function createAndSaveLink() {

  // create link with $1 worth of MATIC
  const { link, txReceipt } = await peanut.createLink({
    signer: wallet,
    chainId: 137,
    tokenAmount: USD_AMOUNT / MATIC_PRICE,
    tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
    verbose: true,
    trackId: "MLluc",
    eip1559: false
  });

  // Save the link to a CSV file
  await saveLinkToCSV(link, txReceipt);
}


// Create 10 links
(async () => {
  for (let i = 0; i < 100; i++) {
    console.log(`Creating link ${i + 1}`);
    await createAndSaveLink();
  }
})();

// // claim the created link
// const claimTx = await peanut.claimLink({ signer: wallet, link: link });
// console.log("Claimed link. Tx hash: ", claimTx.hash);
// --------------------------------------------------

