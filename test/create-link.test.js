import { createLink } from '../create-link.mjs';

describe('Create Peanut link', () => {
  // A mock signer object
  const mockSigner = {
    getTransactionCount: jest.fn().mockResolvedValue(10), // Mock nonce
    provider: {
      getGasPrice: jest.fn().mockResolvedValue('20000000000'),
    },
    getAddress: jest.fn().mockResolvedValue('0xb72430b16657a7463a9dBb5d4645b3dC539B6e6b'),
  };
  
  // A mock options object
  const options = {
    signer: mockSigner,
    chainId: 1,
    tokenAmount: 100,
    tokenAddress: "0xb72430b16657a7463a9dBb5d4645b3dC539B6e6b",
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

