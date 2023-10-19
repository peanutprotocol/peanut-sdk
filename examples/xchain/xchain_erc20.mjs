import { peanut } from '@squirrel-labs/peanut-sdk';
import { ethers } from "ethers";
import { Squid } from "@0xsquid/sdk";
import assert from "assert";

async function claimLinkXChain(
  structSigner,
  link,
  destinationChainId,
  maxSlippage = 1.0,    // (e.g. 0.x - x.y, example from SDK is 1.0 which is ~ 1%)
  recipient = null,
) {
  const config = { verbose:true }

  const signer = structSigner.signer
  const params = peanut.getParamsFromLink(link)
  const chainId = params.chainId
  const contractVersion = params.contractVersion
  const depositIdx = params.depositIdx
  const password = params.password
  if (recipient == null) {
    recipient = await signer.getAddress()
    config.verbose && console.log('recipient not provided, using signer address: ', recipient)
  }
  const keys = peanut.generateKeysFromString(password)
  const contract = await peanut.getContract(String(chainId), signer, contractVersion)

  // Need to check information about the link
  const linkDetails = await peanut.getLinkDetails({link:link});

  // TODO: support type 1 (ERC20) in the future
  //assert(linkDetails.tokenType < 1, "Only type 0 supported for now");

  // TODO: check if the requested tokens are within the routing information available
  // access using squid.chains
  //console.log(squid.tokens);
  console.log("Peanut link details:");
  console.log(linkDetails);

  var sourceToken = linkDetails.tokenAddress
  var destinationToken = null
  var decimals = 18

  // TODO need lookup table here of source to destination token addresses for Squid
  if (sourceToken == "0x0000000000000000000000000000000000000000") {
	//assert(linkDetails.tokenType == 0, "Native token address passed for non-native token link type");
    // Update for Squid compatibility
	console.log("Source token is 0x0000, converting to 0xEeee..");
    sourceToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  } else { 
    // Get decimals from linkdetails
    //decimals = Number(linkDetails.tokenDecimals);
    //assert(linkDetails.tokenDecimals)
    //assert(linkDetails.tokenDecimals != null, "Token decimals needs to be set for ERC20 tokens!");
    //assert(linkDetails.tokenDecimals > 0 && linkDetails.tokenDecimals < 20, "Token decimals failed sanity check");
    
    if(sourceToken == "0x68f180fcCe6836688e9084f035309E29Bf0A2095") {
        // WBTC
        decimals = 8
        destinationToken = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";    // WBTC on ARB
        console.log("Setting output to WBTC on ARB [" + destinationToken + "]")
    }
    else if(sourceToken == "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58") {
        // USDT
        decimals = 6
        destinationToken = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";    // USDT on ARB
        console.log("Setting output to USDT on ARB [" + destinationToken + "]")
    }
    else {
        assert(false, "Unknown input token!")
    }
  }

  if (destinationToken == "0x0000000000000000000000000000000000000000"
  	|| destinationToken == null ) {
	console.log("Destination token is 0x0000, converting to 0xEeee..");
    // Update for Squid compatibility
	destinationToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  }

  // Get wei of amount being withdrawn and send as string (e.g. "10000000000000000")
  // HACK - use BN instead
  const tokenAmount = Math.floor(linkDetails.tokenAmount * Math.pow(10, decimals)).toString();
  console.log("tokenAmount (link details) : " + linkDetails.tokenAmount);
  console.log("tokenAmount (str) : " + tokenAmount);

  // Call squid SDK to get routing information
  const squid = new Squid({
	  baseUrl: "https://v2.api.squidrouter.com"	// for prod
  });

  await squid.init();

  const sqr = {
    fromChain: chainId,
    fromToken: sourceToken,
    fromAmount: tokenAmount,
    toChain: destinationChainId,
    toToken: destinationToken,
    fromAddress: recipient,
    toAddress: recipient,
    slippage: maxSlippage,             // 1.00 = 1% max slippage across the entire route
	enableForecall: true,             // instant execution service, defaults to true
    quoteOnly: false,                   // optional, defaults to false (taken from the example)
	collectFees: { 
        integratorAddress: "0xcb5b05869c450c26a8409417365ba04cc8c88786",		// TODO make Peanut address
        fee: 50		// bips
		}
    };

  console.log("Squid route input:");
  console.log(sqr);

  const { route } = await squid.getRoute(sqr);

  // TODO check if route is possible or failed due to slippage etc
  if (route.transactionRequest == null) {
    // TODO better error description and code needed
    console.error("Failed to get x-chain route");
    return {
      status: new interfaces.SDKStatus(interfaces.EClaimLinkStatusCodes.ERROR),
      txHash: null,
    }
  }

  console.log("Squid route calculated :)");

  // cryptography
  // TODO make this hash include squid contract address and data
  const addressHash = peanut.solidityHashAddress(recipient)
  const addressHashBinary = ethers.utils.arrayify(addressHash) // v5
  //config.verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
  const addressHashEIP191 = peanut.solidityHashBytesEIP191(addressHashBinary)
  const signature = peanut.signAddress(recipient, keys.privateKey) // sign with link keys

  /*if (config.verbose) {
    // print the params
    console.log('params: ', params)
    console.log('addressHash: ', addressHash)
    console.log('addressHashEIP191: ', addressHashEIP191)
    console.log('signature: ', signature)
  }*/

  // Prepare transaction options
  let txOptions = {}
  txOptions = await peanut.setFeeOptions({
    txOptions,
    provider: signer.provider,
    // eip1559,
    // maxFeePerGas,
    // maxPriorityFeePerGas,
    // gasLimit,
    // verbose,
  })

  const claimParams = [
    // Peanut link details
    depositIdx, recipient, addressHashEIP191, signature, 
    // Squid params to mediate execution
    route.transactionRequest.data, route.transactionRequest.value, route.transactionRequest.targetAddress
  ]

  //config.verbose && console.log('claimParams: ', claimParams)
  config.verbose && console.log('submitting tx on contract address: ', contract.address, 'on chain: ', chainId, '...')

  // withdraw the deposit
  const tx = await contract.withdrawDepositXChain(...claimParams, txOptions)
  console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
  const txReceipt = await tx.wait()

  const axelarScanLink =
    "https://axelarscan.io/gmp/" + txReceipt.transactionHash
  console.log("Success : " + axelarScanLink)

  return {
    status: new interfaces.SDKStatus(interfaces.EClaimLinkStatusCodes.SUCCESS),
    txHash: txReceipt.transactionHash,
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// init and create link if needed

// Optimism
const CHAINID = 10
const RPC_URL = 'https://mainnet.optimism.io'

// address 0xcb5b05869C450C26a8409417365bA04Cc8C88786
const wallet = new ethers.Wallet(
    "KEY HERE",
    new ethers.providers.JsonRpcProvider(RPC_URL));

    // If no link, one will be created
var link = ""

if(link.length == 0) {
  // create link
  const createLinkResponse = await peanut.createLink({
    structSigner:{
      signer: wallet
    },
    linkDetails:{
      chainId: CHAINID,
      tokenAddress: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      tokenAmount: 1.01,
      tokenDecimals: 6,
      // Values for tokenType are defined in SDK documentation:
      // https://docs.peanut.to/integrations/building-with-the-sdk/sdk-reference/common-types#epeanutlinktype
      tokenType: 1,    // 0 is for native tokens
    }
  });

  link = createLinkResponse.createdLink.link[0];
  console.log("New link: " + link);

}

///////////////////////////////////////////////////////////////////////////////////////////////////
// x-chain claim ..

const provider = wallet.provider;

assert(link != null,"Link is not valid");

// get status of link
const getLinkDetailsResponse = await peanut.getLinkDetails({
  link, provider
})
console.log('The link is claimed: ' + getLinkDetailsResponse.claimed)

// claim link
const claimTx = await claimLinkXChain(    //peanut.claimLinkXChain
    {
      signer: wallet
    },
    link,
	  42161, //421613 is arbitrum
  );

console.log('success: ' + claimTx.success + 'claimTx: ' + claimTx.txHash)

