// SDK example:
// Create 100 links on the Scroll Alpha Testnet with a tracker Id for redirect

// import peanut from '@squirrel-labs/peanut-sdk'; // npm
import peanut from "../../index.js"; // local
import { ethers } from "ethers";
import fs from "fs";
import { promisify } from "util";
import dotenv from "dotenv";
dotenv.config();

peanut.greeting();


// --------------------------------------------------
// Create a signer (you'll have to do this part yourself!)
const provider = new ethers.JsonRpcProvider("https://alpha-rpc.scroll.io/l2"); 
const CHAINID = 534353 // 534353 for scroll alpha testnet
const TOKENAMOUNT = 0.5
const wallet = new ethers.Wallet(
  process.env.TEST_WALLET_PRIVATE_KEY,
  provider
);
// --------------------------------------------------



// Create a CSV file to save the links
const appendFile = promisify(fs.appendFile);

// function to save the link data to a CSV file:
async function saveLinkToCSV(link, txReceipt) {
  const csvData = `${link}, ${TOKENAMOUNT}\n`;
  await appendFile("links.csv", csvData);
}

// function to create a link and save it to a CSV file
async function createAndSaveLink() {
    // create link
    const { link, txReceipt } = await peanut.createLink({
        signer: wallet,
        chainId: CHAINID,
        tokenAmount: TOKENAMOUNT,
        tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
        verbose: true,
        eip1559: false,
        trackId: "scroll-lisbon23"
    });
    console.log(link);
    
    // Save the link to a CSV file
    await saveLinkToCSV(link, txReceipt);
}


// Create 100 links
// (async () => {
//     for (let i = 0; i < 100; i++) {
//       console.log(`Creating link ${i + 1}`);
//       await createAndSaveLink();
//     }
//   })();


// check the link status of all 100 links
// const linkStatus = await peanut.getLinkStatus({signer: wallet, link: link});
// console.log("Link status: ", linkStatus);

// print the link status of all 100 links
fs.readFile("links.csv", "utf8", async (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  const links = data.split("\n");
  for (let i = 0; i < links.length; i++) {
    const link = links[i].split(",")[0];
    const linkStatus = await peanut.getLinkStatus({
      signer: wallet,
      link: link,
    });
    console.log("Link status: ", linkStatus);
  }
});
