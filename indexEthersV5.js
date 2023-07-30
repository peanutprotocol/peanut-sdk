////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. Since we want others to build on top of Peanut, modularizing
//  the code will make it easier to maintain and update. We should also dogfood it internally
//  to make sure it works as intended.
//
/////////////////////////////////////////////////////////

import axios from "axios";
import { ethers } from "ethersv6";

// import assert from "assert";
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

// load data.js file from same directory (using import)
import {
  PEANUT_ABI_V3,
  PEANUT_ABI_V4,
  PEANUT_CONTRACTS,
  ERC20_ABI,
  ERC721_ABI,
  ERC1155_ABI,
  CHAIN_MAP,
  PROVIDERS,
  // version
} from "./data.js";

const CONTRACT_VERSION = "v3";

export function greeting() {
  console.log(
    "🥜 Hello & thanks for using the Peanut SDK! If you run into any issues, dm @hugomont on telegram or hop on the Peanut Protocol discord",
  );
}

export function generateKeysFromString(string) {
  /* generates a deterministic key pair from an arbitrary length string */
  var privateKey = ethers.keccak256(ethers.toUtf8Bytes(string));
  var wallet = new ethers.Wallet(privateKey);
  var publicKey = wallet.publicKey;

  return {
    address: wallet.address,
    privateKey: privateKey,
    publicKey: publicKey,
  };
}

export function hash_string(str) {
  /*
  1. convert to bytes, 2. right pad to 32 bytes, 3. hash
  */
  let hash = ethers.toUtf8Bytes(str);
  hash = ethers.hexlify(hash);
  // hash = ethers.hexZeroPad(hash, 32);
  hash = ethers.zeroPadValue(hash, 32); // hexZeroPad is deprecated
  hash = ethers.keccak256(hash);
  return hash;
}

export async function signMessageWithPrivatekey(message, privateKey) {
  /* signs a message with a private key and returns the signature
      THIS SHOULD BE AN UNHASHED, UNPREFIXED MESSAGE
  */
  var signer = new ethers.Wallet(privateKey);
  return signer.signMessage(message); // this calls ethers.hashMessage and prefixes the hash
}

export function verifySignature(message, signature, address) {
  /* verifies a signature with a public key and returns true if valid */
  const messageSigner = ethers.verifyMessage(message, signature);
  return messageSigner == address;
}

export function solidityHashBytesEIP191(bytes) {
  /* adds the EIP191 prefix to a message and hashes it same as solidity*/
  // assert(bytes instanceof Uint8Array);
  return ethers.hashMessage(bytes);
}

export function solidityHashAddress(address) {
  /* hashes an address to a 32 byte hex string */
  // return ethers.solidityKeccak256(["address"], [address]); // no longer exists in ethers v6
  return ethers.solidityPackedKeccak256(["address"], [address]);
}

export async function signAddress(string, privateKey) {
  // 1. hash plain address
  const stringHash = ethers.solidityPackedKeccak256(["address"], [string]);
  const stringHashbinary = ethers.getBytes(stringHash);

  // 2. add eth msg prefix, then hash, then sign
  var signer = new ethers.Wallet(privateKey);
  var signature = await signer.signMessage(stringHashbinary); // this calls ethers.hashMessage and prefixes the hash
  return signature;
}

function getRandomString(length) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result_str = "";
  for (let i = 0; i < length; i++) {
    result_str += chars[Math.floor(Math.random() * chars.length)];
  }
  return result_str;
}

export async function getContract(chainId, signer, version = CONTRACT_VERSION) {
  /* returns a contract object for the given chainId and signer */
  signer = await convertSignerToV6(signer);

  if (typeof chainId == "string" || chainId instanceof String) {
    // just move to TS ffs
    // do smae with bigint
    // if chainId is a string, convert to int
    chainId = parseInt(chainId);
  }
  chainId = parseInt(chainId);


  // TODO: fix this for new versions
  // if version is v3, load PEANUT_ABI_V3. if it is v4, load PEANUT_ABI_V4
  var PEANUT_ABI;
  if (version == "v3") {
    PEANUT_ABI = PEANUT_ABI_V3;
  } else if (version == "v4") {
    PEANUT_ABI = PEANUT_ABI_V4;
  } else {
    throw new Error("Invalid version");
  }

  const contractAddress = PEANUT_CONTRACTS[chainId][version];
  const contract = new ethers.Contract(contractAddress, PEANUT_ABI, signer);
  // connected to contracv
  console.log("Connected to contract ", version, " on chain ", chainId, " at ", contractAddress);
  return contract;
  // TODO: return class
}

export function getParamsFromLink(link) {
  /* returns the parameters from a link */
  const url = new URL(link);
  const params = new URLSearchParams(url.search);
  var chainId = params.get("c"); // can be chain name or chain id
  // if can be casted to int, then it's a chain id
  if (parseInt(chainId)) {
    chainId = parseInt(chainId);
  } else {
    // otherwise it's a chain name
    chainId = CHAIN_MAP[String(chainId)];
  }

  const contractVersion = params.get("v");
  var depositIdx = params.get("i");
  depositIdx = parseInt(depositIdx);
  const password = params.get("p");
  let trackId = ""; // optional
  if (params.get("t")) {
    trackId = params.get("t");
  }
  return { chainId, contractVersion, depositIdx, password, trackId };
}

export function getParamsFromPageURL() {
  /* returns the parameters from the current page url */
  const params = new URLSearchParams(window.location.search);
  var chainId = params.get("c"); // can be chain name or chain id
  chainId = CHAIN_MAP[String(chainId)];
  const contractVersion = params.get("v");
  var depositIdx = params.get("i");
  depositIdx = parseInt(depositIdx);
  const password = params.get("p");

  return { chainId, contractVersion, depositIdx, password };
}

export function getLinkFromParams(
  chainId,
  contractVersion,
  depositIdx,
  password,
  baseUrl = "https://peanut.to/claim",
  trackId = "",
) {
  /* returns a link from the given parameters */

  const link =
    baseUrl +
    "?c=" +
    chainId +
    "&v=" +
    contractVersion +
    "&i=" +
    depositIdx +
    "&p=" +
    password;

  if (trackId != "") {
    return link + "&t=" + trackId;
  }
  return link;
}

export async function approveSpendERC20(
  signer,
  chainId,
  tokenAddress,
  amount,
  tokenDecimals,
  contractVersion = CONTRACT_VERSION,
) {
  /*  Approves the contract to spend the specified amount of tokens   */
  signer = await convertSignerToV6(signer);
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  if (amount == -1) {
    // if amount is -1, approve infinite amount
    amount = ethers.MaxUint256;
  }
  const spender = PEANUT_CONTRACTS[chainId][contractVersion];
  let allowance = await tokenContract.allowance(signer.address, spender);
  // convert amount to BigInt and compare to allowance
  amount = ethers.parseUnits(amount.toString(), tokenDecimals);
  if (allowance >= amount) {
    console.log("Allowance already enough, no need to approve more");
    return { allowance, txReceipt: null };
  } else {
    const txOptions = await setTxOptions({}, true, chainId, signer);
    const tx = await tokenContract.approve(spender, amount, txOptions);
    const txReceipt = await tx.wait();
    let allowance = await tokenContract.allowance(signer.address, spender);
    return { allowance, txReceipt };
  }
}

export function getDepositIdx(txReceipt, chainId) {
  /* returns the deposit index from a tx receipt */
  const logs = txReceipt.logs;
  // const chainId = txReceipt.chainId;
  var depositIdx;
  if (chainId == 137) {
    depositIdx = logs[logs.length - 2].args[0];
  } else {
    // get last log a
    depositIdx = logs[logs.length - 1].args[0];
  }
  return depositIdx;
}

export function getDepositIdxs(txReceipt, chainId, contractAddress) {
  /* returns an array of deposit indices from a batch transaction receipt */
  const logs = txReceipt.logs;
  var depositIdxs = [];
  // loop through all the logs and extract the deposit index from each
  for (var i = 0; i < logs.length; i++) {
    // check if the log was emitted by our contract
    if (logs[i].address.toLowerCase() === contractAddress.toLowerCase()) {
      if (chainId == 137) {
        depositIdxs.push(logs[i].args[0]);
      } else {
        depositIdxs.push(logs[i].args[0]);
      }
    }
  }
  return depositIdxs;
}


export async function createLink({
  signer, // ethers signer object
  chainId, // chain id of the network (only EVM for now)
  tokenAmount, // amount of the token to send
  tokenAddress = "0x0000000000000000000000000000000000000000",
  tokenType = 0, // 0: ETH, 1: ERC20, 2: ERC721, 3: ERC1155
  tokenId = 0, // only used for ERC721 and ERC1155
  tokenDecimals = 18, // only used for ERC20 and ERC1155
  password = "", // password to claim the link
  baseUrl = "https://peanut.to/claim",
  trackId = "sdk", // optional tracker id to track the link source
  maxFeePerGas = ethers.parseUnits("1000", "gwei"), // maximum fee per gas
  maxPriorityFeePerGas = ethers.parseUnits("5", "gwei"), // maximum priority fee per gas
  gasLimit = 1000000, // gas limit
  eip1559 = true, // whether to use eip1559 or not
  verbose = false,
  contractVersion = CONTRACT_VERSION,
}) {
  /* creates a link with redeemable tokens */

  assert(signer, "signer arg is required");
  assert(chainId, "chainId arg is required");
  assert(tokenAmount, "amount arg is required");

  signer = await convertSignerToV6(signer);


  // check allowance
  // TODO: check for erc721 and erc1155
  console.log('checking allowance...')
  if (tokenType == 1) {
    // if token is erc20, check allowance
    const allowance = await approveSpendERC20(
      signer,
      chainId,
      tokenAddress,
      tokenAmount,
      tokenDecimals,
      contractVersion,
    );
    console.log('allowance: ', allowance, ' tokenAmount: ', tokenAmount)
    if (allowance < tokenAmount) {
      throw new Error("Allowance not enough");
    }
  }

  if (verbose) {
    console.log("Generating link...");
  }

  let txOptions = {};
  // For base tokens, we need to send the amount as value
  if (tokenType == 0) {
    // convert tokenAmount to string and parse it to ether
    tokenAmount = ethers.parseUnits(tokenAmount.toString(), "ether");
    txOptions = { value: tokenAmount };
  }
  // for erc20 and erc1155, we need to convert tokenAmount to appropriate decimals
  else if (tokenType == 1 || tokenType == 3) {
    tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals);
  }

  if (password == null || password == "") {
    // if no password is provided, generate a random one
    password = getRandomString(16);
  }
  const keys = generateKeysFromString(password); // deterministically generate keys from password
  const contract = await getContract(chainId, signer, contractVersion); // get the contract instance

  const feeData = await signer.provider.getFeeData();
  const gasPrice = BigInt(feeData.gasPrice.toString());

  let multiplier = 1.5;
  multiplier = Math.round(multiplier * 10);
  const proposedGasPrice = (gasPrice * BigInt(multiplier)) / BigInt(10);


  if (eip1559) {
    // if (chainId == 137) {
    //   // warn that polygon doesn't support eip1559 yet
    //   console.log("WARNING: Polygon doesn't support EIP1559 yet. Using legacy tx");
    // }
    txOptions = {
      ...txOptions,
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      gasLimit: gasLimit,
    };
  } else {
    txOptions = {
      ...txOptions,
      gasPrice: proposedGasPrice,
      gasLimit: gasLimit,
    };
  }

  var tx = await contract.makeDeposit(
    tokenAddress,
    tokenType,
    BigInt(tokenAmount),
    tokenId,
    keys.address,
    txOptions,
  );

  if (verbose) {
    console.log("submitted tx: ", tx.hash);
  }

  // now we need the deposit index from the tx receipt
  var txReceipt = await tx.wait();
  var depositIdx = getDepositIdx(txReceipt, chainId);

  // now we can create the link
  const link = getLinkFromParams(
    chainId,
    contractVersion,
    depositIdx,
    password,
    baseUrl,
    trackId,
  );
  if (verbose) {
    console.log("created link: ", link);
  }
  // return the link and the tx receipt
  return { link, txReceipt };
}

async function makeDeposits(signer, chainId, contractVersion, numberOfLinks, tokenType, tokenAmount, tokenAddress, tokenDecimals, keys) {
  const contract = await getContract(chainId, signer, contractVersion);
  let tx;

  // convert tokenAmount depending on tokenDecimals
  tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals);
  const amounts = Array(numberOfLinks).fill(tokenAmount);

  const pubKeys20 = keys.map(key => key.address);

  // Set maxFeePerGas and maxPriorityFeePerGas (in Gwei)
  const maxFeePerGas = ethers.parseUnits('900', 'gwei'); // 100 Gwei
  const maxPriorityFeePerGas = ethers.parseUnits('50', 'gwei'); // 2 Gwei

  // Transaction options (eip1559)
  // let txOptions = {
  //   maxFeePerGas,
  //   maxPriorityFeePerGas
  // };

  let txOptions = await setTxOptions({}, true, chainId, signer);

  if (tokenType == 0) { // ETH
    txOptions = {
      ...txOptions,
      value: amounts.reduce((a, b) => BigInt(a) + BigInt(b), BigInt(0))  // set total Ether value 
    };

    tx = await contract.batchMakeDepositEther(amounts, pubKeys20, txOptions);

  } else if (tokenType == 1) { // ERC20
    // TODO: The user must have approved the contract to spend tokens on their behalf before this
    tx = await contract.batchMakeDepositERC20(tokenAddress, amounts, pubKeys20, txOptions);
  }
  console.log("submitted tx: ", tx.hash, " for ", numberOfLinks, " deposits. Now waiting for receipt...");
  // print the submitted tx fee and gas price
  // console.log(tx)
  const txReceipt = await tx.wait();
  return getDepositIdxs(txReceipt, chainId, contract.target);
}


function generateKeysAndPasswords(passwords, numberOfLinks) {
  let keys = [];
  if (passwords.length > 0) {
    keys = passwords.map(password => generateKeysFromString(password));
  } else {
    for (let i = 0; i < numberOfLinks; i++) {
      const password = getRandomString(16);
      keys.push(generateKeysFromString(password));
      passwords.push(password);
    }
  }
  return { keys, passwords };
}

async function setTxOptions(txOptions, eip1559, chainId, signer, maxFeePerGas = '1000', maxPriorityFeePerGas = '50', gasLimit = 10000000) {
  // helper function for setting tx options
  // if polygon, use legacy tx options. Else use eip1559 (unless specified otherwise)

  // convert maxFeePerGas and maxPriorityFeePerGas to Wei from Gwei
  maxFeePerGas = ethers.parseUnits(maxFeePerGas, 'gwei');
  maxPriorityFeePerGas = ethers.parseUnits(maxPriorityFeePerGas, 'gwei');

  const provider = signer.provider;

  let gasPrice;

  try {
    const feeData = await provider.getFeeData();
    gasPrice = BigInt(feeData.gasPrice.toString());
  } catch (error) {
    console.error('Failed to fetch gas price from provider:', error);
    return; // exit the function if the gas price cannot be fetched
  }

  // calculate the proposed gas price
  const multiplier = 1.5;
  const proposedGasPrice = (gasPrice * BigInt(Math.round(multiplier * 10))) / BigInt(10);

  if (eip1559 && chainId !== 137) { // EIP-1559 options if supported and requested
    txOptions = {
      ...txOptions,
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit
    };
  } else { // legacy options
    txOptions = {
      ...txOptions,
      gasPrice: proposedGasPrice.toString(),
      gasLimit
    };
  }

  return txOptions;
}




function generateLinks(chainId, contractVersion, depositIdxs, passwords, baseUrl, trackId) {
  return depositIdxs.map((depositIdx, i) =>
    getLinkFromParams(chainId, contractVersion, depositIdx, passwords[i], baseUrl, trackId)
  );
}

export async function createLinks({
  signer, // ethers signer object
  chainId, // chain id of the network (only EVM for now)
  tokenAmount, // tokenAmount to put in each link
  numberOfLinks = null, // number of links to create
  tokenAmounts = [], // array of token amounts, if different amounts are needed for links
  tokenAddress = "0x0000000000000000000000000000000000000000",
  tokenType = 0, // 0: ETH, 1: ERC20, 2: ERC721, 3: ERC1155
  tokenId = 0, // only used for ERC721 and ERC1155
  tokenDecimals = null, // only used for ERC20 and ERC1155
  passwords = [], // passwords that each link should have
  baseUrl = "https://peanut.to/claim",
  trackId = "sdk", // optional tracker id to track the link source
  maxFeePerGas = ethers.parseUnits("1000", "gwei"), // maximum fee per gas
  maxPriorityFeePerGas = ethers.parseUnits("5", "gwei"), // maximum priority fee per gas
  gasLimit = 1000000, // gas limit
  eip1559 = true, // whether to use eip1559 or not
  verbose = false,
  contractVersion = "v4",
}) {
  // if tokenAmounts is provided, throw a not implemented error
  if (tokenAmounts.length > 0) {
    throw new Error("variable tokenAmounts support is not implemented yet");
  }

  assert(signer, "signer arg is required");
  assert(chainId, "chainId arg is required");
  assert(tokenAmount, "amount arg is required");
  assert(
    tokenAmounts.length > 0 || numberOfLinks > 0,
    "either numberOfLinks or tokenAmounts must be provided",
  );
  numberOfLinks = numberOfLinks || tokenAmounts.length;
  assert(
    tokenAmounts.length == 0 || tokenAmounts.length == numberOfLinks,
    "length of tokenAmounts must be equal to numberOfLinks",
  );
  assert(
    tokenType == 0 || tokenType == 1,
    "ERC721 and ERC1155 are not supported yet",
  );
  assert(
    tokenType == 0 || tokenAddress != "0x0000000000000000000000000000000000000000",
    "tokenAddress must be provided for non-ETH tokens",
  );
  // tokendecimals must be provided for erc20 and erc1155 tokens
  assert(
    !(tokenType == 1 || tokenType == 3) || tokenDecimals != null,
    "tokenDecimals must be provided for ERC20 and ERC1155 tokens",
  );
  if (tokenDecimals == null) {
    tokenDecimals = 18;
  }

  if (verbose) {
    console.log("Asserts passed");
  }

  console.log('checking allowance...')
  if (tokenType == 1) {
    // if token is erc20, check allowance
    const allowance = await approveSpendERC20(
      signer,
      chainId,
      tokenAddress,
      tokenAmount * numberOfLinks,
      tokenDecimals,
      contractVersion,
    );
    if (allowance < tokenAmount) {
      throw new Error("Allowance not enough");
    }
  }
  if (verbose) {
    console.log("Generating links...");
  }
  // return { links: [], txReceipt: {} };

  signer = await convertSignerToV6(signer);

  var { keys, passwords } = generateKeysAndPasswords(passwords, numberOfLinks);
  const depositIdxs = await makeDeposits(signer, chainId, contractVersion, numberOfLinks, tokenType, tokenAmount, tokenAddress, tokenDecimals, keys);
  const links = generateLinks(chainId, contractVersion, depositIdxs, passwords, baseUrl, trackId);

  return { links, txReceipt: depositIdxs }; // Assuming depositIdxs is a list of receipts.

  // let txOptions = {};
  // // For base tokens, we need to send the amount as value
  // if (tokenType == 0) {
  //   const TOTAL_PAYABLE_ETHER_AMOUNT = ethers.parseUnits( // could add fee here
  //     (tokenAmount * numberOfLinks).toString(),
  //     "ether",
  //   );
  //   // tokenAmount = ethers.parseUnits(tokenAmount.toString(), "ether");
  //   txOptions = { value: TOTAL_PAYABLE_ETHER_AMOUNT };
  // }
  // // for erc20 and erc1155, we need to convert tokenAmount to appropriate decimals
  // else if (tokenType == 1) {
  //   tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals);
  // }

  // // if no passwords are provided, generate random ones
  // if (passwords.length == 0) { 
  //   // password = getRandomString(16);
  //   passwords = Array(numberOfLinks).fill(getRandomString(16));
  // }


  // const keys = generateKeysFromString(password); // deterministically generate keys from password
  // const contract = await getContract(chainId, signer);

  // const feeData = await signer.provider.getFeeData();
  // const gasPrice = BigInt(feeData.gasPrice.toString());

  // let multiplier = 1.5;
  // multiplier = Math.round(multiplier * 10);
  // const proposedGasPrice = (gasPrice * BigInt(multiplier)) / BigInt(10);

  // if (eip1559) {
  //   // if (chainId == 137) {
  //   //   // warn that polygon doesn't support eip1559 yet
  //   //   console.log("WARNING: Polygon doesn't support EIP1559 yet. Using legacy tx");
  //   // }
  //   txOptions = {
  //     ...txOptions,
  //     maxFeePerGas: maxFeePerGas,
  //     maxPriorityFeePerGas: maxPriorityFeePerGas,
  //     gasLimit: gasLimit,
  //   };
  // } else {
  //   txOptions = {
  //     ...txOptions,
  //     gasPrice: proposedGasPrice,
  //     gasLimit: gasLimit,
  //   };
  // }

  // var tx = await contract.makeDeposit(
  //   tokenAddress,
  //   tokenType,
  //   BigInt(tokenAmount),
  //   tokenId,
  //   keys.address,
  //   txOptions,
  // );

  // if (verbose) {
  //   console.log("submitted tx: ", tx.hash);
  // }

  // // now we need the deposit index from the tx receipt
  // var txReceipt = await tx.wait();
  // var depositIdx = getDepositIdx(txReceipt, chainId);

  // // now we can create the link
  // const link = getLinkFromParams(
  //   chainId,
  //   CONTRACT_VERSION,
  //   depositIdx,
  //   password,
  //   baseUrl,
  //   trackId,
  // );
  // if (verbose) {
  //   console.log("created link: ", link);
  // }
  // // return the link and the tx receipt
  // return { link, txReceipt };
}

export async function getLinkStatus({ signer, link }) {
  /* checks if a link has been claimed */
  assert(signer, "signer arg is required");
  assert(link, "link arg is required");

  signer = await convertSignerToV6(signer);

  const params = getParamsFromLink(link);
  const chainId = params.chainId;
  const contractVersion = params.contractVersion;
  const depositIdx = params.depositIdx;
  const contract = await getContract(chainId, signer, contractVersion);
  const deposit = await contract.deposits(depositIdx);

  // if the deposit is claimed, the pubKey20 will be 0x000....
  if (deposit.pubKey20 == "0x0000000000000000000000000000000000000000") {
    return { claimed: true, deposit };
  }
  return { claimed: false, deposit };
}

export async function claimLink({ signer, link, recipient = null }) {
  /* claims the contents of a link */
  assert(signer, "signer arg is required");
  assert(link, "link arg is required");

  signer = await convertSignerToV6(signer);

  const params = getParamsFromLink(link);
  const chainId = params.chainId;
  const contractVersion = params.contractVersion;
  const depositIdx = params.depositIdx;
  const password = params.password;
  if (recipient == null) {
    recipient = signer.address;
  }
  const keys = generateKeysFromString(password); // deterministically generate keys from password
  const contract = await getContract(chainId, signer, contractVersion);

  // cryptography
  var addressHash = solidityHashAddress(recipient);
  var addressHashBinary = ethers.getBytes(addressHash);
  var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary);
  var signature = await signAddress(recipient, keys.privateKey); // sign with link keys

  // TODO: use createClaimPayload instead

  // withdraw the deposit
  // address hash is hash(prefix + hash(address))
  const tx = await contract.withdrawDeposit(
    depositIdx,
    recipient,
    addressHashEIP191,
    signature,
  );
  console.log("submitted tx: ", tx.hash, " now waiting for receipt...");
  const txReceipt = await tx.wait();

  return txReceipt;
}

async function createClaimPayload(link, recipientAddress) {
  /* internal utility function to create the payload for claiming a link */
  const params = getParamsFromLink(link);
  const chainId = params.chainId;
  const password = params.password;
  const keys = generateKeysFromString(password); // deterministically generate keys from password

  // cryptography
  var addressHash = solidityHashAddress(recipientAddress);
  var addressHashBinary = ethers.getBytes(addressHash);
  var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary);
  var signature = await signAddress(recipientAddress, keys.privateKey); // sign with link keys

  return {
    addressHash: addressHashEIP191,
    signature: signature,
    idx: params.depositIdx,
    chainId: params.chainId,
    contractVersion: params.contractVersion,
  };
}

export async function claimLinkGasless(link, recipientAddress, apiKey) {
  const payload = await createClaimPayload(link, recipientAddress);
  const url = "https://api.peanut.to/claim";
  // const url = "http://127.0.0.1:5001/claim";

  const headers = {
    "Content-Type": "application/json",
  };

  const body = {
    address: recipientAddress,
    address_hash: payload.addressHash,
    signature: payload.signature,
    idx: payload.idx,
    chain: payload.chainId,
    version: payload.contractVersion,
    api_key: apiKey,
  };

  // if axios error, return the error message
  try {
    const response = await axios.post(url, body, { headers });
    return response.data;
  } catch (e) {
    return e.response;
  }
}

// convertSignerToV6
// await convertSignerToV6
async function convertSignerToV6(signer) {
  // Check if it's already a v6 signer, just return it
  if (signer.provider.broadcastTransaction) {
    console.log("signer is already v6");
    return signer;
  }
  console.log("%c You are passing an ethers v5 signer, attempting conversion to v6. THIS IS AN EXPERIMENTAL FEATURE", "color: yellow");
  console.log("%c To avoid any issues, please migrate to ethers v6", "color: yellow");

  // New approach: creating a new ethers v6 wallet
  // if EOA wallet, just get the private key and provider and instantiate a new ethers v6 wallet
  if (signer.privateKey) {
    const provider = signer.provider;
    const privateKey = signer.privateKey;
    const wallet = new ethers.Wallet(privateKey, provider);
    return wallet;
  }
  // if it is wallet whose key we cannot access (e.g. BrowserWallet), we connect ourselves to the provider
  else { // this will not work with walletconnect or non-meta mask wallets
    const provider = new ethers.BrowserProvider(window.ethereum, "any");
    const signer = await provider.getSigner();
    return signer;
  }

  // // Old approach: wrapping the signer and provider. Too many issues with this approach
  // const providerV6 = {
  //   ...signer.provider, 
  //   call: (tx) => signer.provider.call(tx),
  //   destroy: () => signer.provider.destroy(),
  //   estimateGas: (tx) => signer.provider.estimateGas(tx),
  //   getBalance: (address, blockTag) => signer.provider.getBalance(address, blockTag),
  //   getBlock: (blockHashOrBlockTag, prefetchTxs) => signer.provider.getBlock(blockHashOrBlockTag, prefetchTxs),
  //   getBlockNumber: () => signer.provider.getBlockNumber(),
  //   getCode: (address, blockTag) => signer.provider.getCode(address, blockTag),
  //   getFeeData: () => signer.provider.getFeeData(),
  //   getLogs: (filter) => signer.provider.getLogs(filter),
  //   getNetwork: () => signer.provider.getNetwork(),
  //   getStorage: (address, position, blockTag) => signer.provider.getStorage(address, position, blockTag),
  //   getTransaction: (hash) => signer.provider.getTransaction(hash),
  //   getTransactionCount: (address, blockTag) => signer.provider.getTransactionCount(address, blockTag),
  //   getTransactionReceipt: (hash) => signer.provider.getTransactionReceipt(hash),
  //   getTransactionResult: (hash) => signer.provider.getTransactionResult(hash),
  //   lookupAddress: (address) => signer.provider.lookupAddress(address),
  //   resolveName: (ensName) => signer.provider.resolveName(ensName),
  //   waitForBlock: (blockTag) => signer.provider.waitForBlock(blockTag),
  //   waitForTransaction: (hash, confirms, timeout) => signer.provider.waitForTransaction(hash, confirms, timeout),
  //   on: (eventName, listener) => signer.provider.on(eventName, listener),

  //   // v6 methods
  //   broadcastTransaction: (signedTx) => signer.provider.sendTransaction(signedTx),
  // };

  // const signerV6 = {
  //   ...signer,
  //   provider: providerV6,
  //   call: (tx) => signer.call(tx),
  //   connect: (provider) => signer.connect(provider),
  //   estimateGas: (tx) => signer.estimateGas(tx),
  //   getAddress: () => signer.getAddress(),
  //   getNonce: (blockTag) => signer.getTransactionCount(blockTag),
  //   populateCall: (tx) => signer.populateTransaction(tx),
  //   populateTransaction: (tx) => signer.populateTransaction(tx),
  //   resolveName: (name) => signer.resolveName(name),
  //   sendTransaction: (tx) => signer.sendTransaction(tx),
  //   signMessage: (message) => signer.signMessage(message),
  //   signTransaction: (tx) => signer.signTransaction(tx),
  //   signTypedData: (domain, types, value) => signer._signTypedData(domain, types, value), // underscore in the original method, assuming it's a typo in the doc
  // };

  // window.signerV6 = signerV6;
  // return signerV6;
}

const peanut = {
  greeting,
  generateKeysFromString,
  signMessageWithPrivatekey,
  verifySignature,
  solidityHashBytesEIP191,
  solidityHashAddress,
  signAddress,
  getRandomString,
  getContract,
  getDepositIdx,
  getLinkStatus,
  getParamsFromLink,
  getParamsFromPageURL,
  getLinkFromParams,
  createLink,
  createLinks,
  claimLink,
  approveSpendERC20,
  claimLinkGasless,
  // version: version, // removed as was giving errors
  // approveSpendERC721,
  // approveSpendERC1155,
};

export default peanut;
export { peanut };