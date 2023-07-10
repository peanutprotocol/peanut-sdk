////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. Since we want others to build on top of Peanut, modularizing
//  the code will make it easier to maintain and update. We should also dogfood it internally
//  to make sure it works as intended.
//
/////////////////////////////////////////////////////////

import assert from "assert";
import axios from "axios";
import { ethers } from "ethersv6";


// load data.js file from same directory (using import)
import {
  PEANUT_ABI_V3,
  PEANUT_CONTRACTS,
  ERC20_ABI,
  ERC721_ABI,
  ERC1155_ABI,
  CHAIN_MAP,
  PROVIDERS,
} from "./data.js";
import { type } from "os";
const CONTRACT_VERSION = "v3";

export function greeting() {
  console.log(
    "Hello & thanks for using the Peanut SDK! If you run into any issues, dm @hugomont on telegram or hop on the Peanut Protocol discord",
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
  hash = ethers.hexZeroPad(hash, 32);
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

export async function getContract(chainId, signer) {
  /* returns a contract object for the given chainId and signer */
  signer = walletToEthersv6(signer);

  if (typeof chainId == "string") {
    // if chainId is a string, convert to int
    chainId = parseInt(chainId);
  }
  const contractAddress = PEANUT_CONTRACTS[chainId][CONTRACT_VERSION];
  const contract = new ethers.Contract(contractAddress, PEANUT_ABI_V3, signer);
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
) {
  /*  Approves the contract to spend the specified amount of tokens   */
  signer = walletToEthersv6(signer);
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  if (amount == -1) {
    // if amount is -1, approve infinite amount
    amount = ethers.MaxUint256;
  }
  const spender = PEANUT_CONTRACTS[chainId][CONTRACT_VERSION];
  let allowance = await tokenContract.allowance(signer.address, spender);
  // convert amount to BigInt and compare to allowance
  amount = ethers.parseUnits(amount.toString(), tokenDecimals);
  if (allowance >= amount) {
    console.log("Allowance already enough, no need to approve more");
    return { allowance, txReceipt: null };
  } else {
    const tx = await tokenContract.approve(spender, amount);
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
}) {
  /* creates a link with redeemable tokens */

  assert(signer, "signer arg is required");
  assert(chainId, "chainId arg is required");
  assert(tokenAmount, "amount arg is required");

  signer = walletToEthersv6(signer);

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
  const contract = await getContract(chainId, signer);

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
    CONTRACT_VERSION,
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

export async function getLinkStatus({ signer, link }) {
  /* checks if a link has been claimed */
  assert(signer, "signer arg is required");
  assert(link, "link arg is required");

  signer = walletToEthersv6(signer);

  const params = getParamsFromLink(link);
  const chainId = params.chainId;
  const contractVersion = params.contractVersion;
  const depositIdx = params.depositIdx;
  const contract = await getContract(chainId, signer);
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

  signer = walletToEthersv6(signer);

  const params = getParamsFromLink(link);
  const chainId = params.chainId;
  const contractVersion = params.contractVersion;
  const depositIdx = params.depositIdx;
  const password = params.password;
  if (recipient == null) {
    recipient = signer.address;
  }
  const keys = generateKeysFromString(password); // deterministically generate keys from password
  const contract = await getContract(chainId, signer);

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

  const response = await axios.post(url, body, { headers });
  return response.data;
}

function walletToEthersv6(wallet) {
  /* always returns an ethers v6 wallet.

  If the wallet is already an ethers v6 wallet, it is returned unchanged.
  If the wallet is an ethers v5 wallet, it is converted to an ethers v6 wallet.
  */
  // create new ethersv6 provider if needed

  // console.log(wallet)
  // console.log(wallet.provider)
  var provider;
  try { // ethersv5
    const provider_url = wallet.provider.connection.url;
    provider = new ethers.JsonRpcProvider(provider_url);
  } catch (e) { // ethersv6
    provider = wallet.provider;
  }
  const key = wallet.privateKey; // this clearly doesn't work for browser/hardware wallets?
  const ethersv6Wallet = new ethers.Wallet(key, provider);
  return ethersv6Wallet;
}

// export object with all functions
export default {
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
  claimLink,
  approveSpendERC20,
  claimLinkGasless,
  // approveSpendERC721,
  // approveSpendERC1155,
};
