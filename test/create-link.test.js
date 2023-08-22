import dotenv from 'dotenv'
dotenv.config()
import { ethers } from 'ethersv5'
import { createLink } from '../create-link.js';

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY


describe('Create Peanut link', () => {
  // Mock a signer
  const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm'
  // // const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL); // v6
  const goerliProvider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL) // v5
  const goerliWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY, goerliProvider)
  
  // A mock options object
  const options = {
    signer: goerliWallet,
    chainId: 1,
    tokenAmount: 100,
    tokenAddress: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    tokenType: 1,
    tokenId: 0,
    tokenDecimals: 18,
    password: "yourPassword",
    baseUrl: "https://peanut.to/claim",
    trackId: "sdk",
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    gasLimit: null,
    eip1559: true,
    verbose: false,
    contractVersion: "v4",
    nonce: null,
  };
  

  it('should create a valid link with correct parameters', async () => {
    // You may need to mock other dependencies like getContract, etc.

    const result = await createLink(options);

    console.log({ result })
    
    // Check if link is formed correctly
    expect(result.link).toContain('https://peanut.to/claim'); 
    // Check if txReceipt is returned
    expect(result.txReceipt).toBeDefined(); 
  });

  it('should throw an error with missing signer', async () => {
    const badOptions = { ...options, signer: undefined };
    
    await expect(createLink(badOptions)).rejects.toThrow('signer arg is required');
  });

});

