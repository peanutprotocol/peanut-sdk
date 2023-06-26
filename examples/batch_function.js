import peanut from '@squirrel-labs/peanut-sdk';

// ... setup signer

// single base token link
const { link, txReceipt } = await peanut.createLink({
    signer: wallet,
    chainId: CHAINID,
    tokenAmount: TOKENAMOUNT,
    tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
    trackId: "campaignId?" // optional, user defined string
});
// returns { link: "https://peanut.to/...", txReceipt: { ... } }


// single erc20 link
const { link, txReceipt } = await peanut.createLink({
    signer: wallet,
    chainId: CHAINID,
    tokenAmount: TOKENAMOUNT,
    tokenAddress: TOKENADDRESS,
    tokenDecimals: TOKENDECIMALS,
    tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
    trackId: "campaignId?" // optional, user defined string
});
// returns { link: "https://peanut.to/...", txReceipt: { ... } }

// ignore erc721 and erc1155 for now

// batch transactions:
const { links, txReceipts } = await peanut.createLinks({
    signer: wallet,
    chainId: CHAINID,
    tokenAmounts: [100, 100, 100],
    tokenAddress: TOKENADDRESS,
    tokenDecimals: TOKENDECIMALS,
    tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
    trackId: "campaignId?" // optional, user defined string
});
// returns { links: ["https://peanut.to/...", ...], txReceipts: [{ ... }, ...] }

// batch transactions with different amounts:
const { links, txReceipts } = await peanut.createLinks({
    signer: wallet,
    chainId: CHAINID,
    tokenAmounts: [100, 200, 300],
    tokenAddress: TOKENADDRESS,
    tokenDecimals: TOKENDECIMALS,
    tokenType: 1, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
    trackId: "campaignId?" // optional, user defined string
});
// returns { links: ["https://peanut.to/...", ...], txReceipts: [{ ... }, ...] }