// Alongside $AMKT
// Create n links on Arbitrum of $AMKT token

import peanut from '@squirrel-labs/peanut-sdk'; // npm
import { ethers } from "ethers";
import fs from "fs";
import { promisify } from "util";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

peanut.greeting();


const provider = new ethers.JsonRpcProvider("https://1rpc.io/arb");
const CHAINID = 42161
const TOKENADDRESS = "0x498c620c7c91c6eba2e3cd5485383f41613b7eb6"
const TOKENDECIMALS = 18
const CSV_FILENAME = "alongside_links.csv"

// make coingecko request to get the token price
const coingeckoId = "alongside-crypto-market-index";
const coingeckoEndpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
const response = await fetch(coingeckoEndpoint);
const data = await response.json();
const TOKENPRICE = data[coingeckoId].usd;
const TOKENAMOUNT = 10 / TOKENPRICE;
console.log(`Token price: $${TOKENPRICE}, token amount per link: ${TOKENAMOUNT}`);

const wallet = new ethers.Wallet(
    process.env.TEST_WALLET_PRIVATE_KEY,
    provider
);

// Create a CSV file to save the links
const appendFile = promisify(fs.appendFile);
// function to save the link data to a CSV file:
async function saveLinkToCSV(link, txReceipt) {
    const csvData = `${link}, ${TOKENAMOUNT}\n`;
    await appendFile(CSV_FILENAME, csvData);
}

// function to create a link and save it to a CSV file
async function createAndSaveLink() {
    // create link w/ peanut sdk
    const { link, txReceipt } = await peanut.createLink({
        signer: wallet,
        chainId: CHAINID,
        tokenAmount: TOKENAMOUNT,
        tokenAddress: TOKENADDRESS,
        tokenDecimals: TOKENDECIMALS,
        tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
        verbose: true,
        eip1559: false,
        trackId: "alongside"
    });
    console.log(link);

    // Save the link to a CSV file
    await saveLinkToCSV(link, txReceipt);
}


// Create 100 links
(async () => {
    for (let i = 0; i < 100; i++) {
        console.log(`Creating link ${i + 1}`);
        await createAndSaveLink();
    }
})();


// Convenience: check the link status of all 100 links
// const linkStatus = await peanut.getLinkStatus({signer: wallet, link: link});
// console.log("Link status: ", linkStatus);

// print the link status of all 100 links
fs.readFile(CSV_FILENAME, "utf8", async (err, data) => {
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
