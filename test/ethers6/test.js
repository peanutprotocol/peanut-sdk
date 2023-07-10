import peanut from "../../index.js"; // local
// import peanut from '@squirrel-labs/peanut-sdk';
import { ethers } from 'ethers'; // ethers v6
import dotenv from 'dotenv';
dotenv.config({path: '../../.env'});

// create goerli wallet with optimism rpc
const wallet = new ethers.Wallet(
    process.env.TEST_WALLET_PRIVATE_KEY,
    new ethers.JsonRpcProvider("https://rpc.goerli.optimism.gateway.fm")
);

// get peanut version
import fs from 'fs/promises';
async function main() {
    const data = await fs.readFile('./package.json');
    const pjson = JSON.parse(data);
    console.log(pjson.dependencies['@squirrel-labs/peanut-sdk']);
}
main();
// print version of ethers
console.log(ethers.version);

// create link
const { link, txReceipt } = await peanut.createLink({
  signer: wallet,
  chainId: 420,
  tokenAmount: 0.0001337,
  tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
  verbose: true,
});

// get status of link
console.log((await peanut.getLinkStatus({signer: wallet, link: link})).claimed);


// claim link
await new Promise(r => setTimeout(r, 6000));
// const claimTx = await peanut.claimLink({ signer: wallet, link: link });
// console.log("claimTx: ", claimTx.hash);

const res = await peanut.claimLinkGasless(link, wallet.address, process.env.PEANUT_DEV_API_KEY);
console.log(res);

// get status of link
console.log((await peanut.getLinkStatus({signer: wallet, link: link})).claimed);