// import peanut from '@squirrel-labs/peanut-sdk'; // v6
// import peanut from '@squirrel-labs/peanut-sdk-ethersv5'; // v5
// import { ethers } from 'ethersv6'; // v6
import peanut from '../index';  // import directly from source code

import { ethers } from 'ethersv5'; // v5
import dotenv from 'dotenv';
dotenv.config();


const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;
const GOERLI_RPC_URL = 'https://rpc.goerli.eth.gateway.fm';
const OPTIMISM_GOERLI_RPC_URL = 'https://rpc.goerli.optimism.gateway.fm';
const INFURA_API_KEY = process.env.INFURA_API_KEY;
// const goerliProvider = new ethers.JsonRpcProvider(GOERLI_RPC_URL); // v6
const goerliProvider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL); // v5
const optimismGoerliProvider = new ethers.providers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v5
// const optimismGoerliProvider = new ethers.JsonRpcProvider(OPTIMISM_GOERLI_RPC_URL); // v6

describe('getLinkDetails', function () {
    
    it('should have 1 goerli eth inside', async function () {
        /** should fail, no goerli support yet */

        expect.assertions(1); // Expecting one assertion to be called
        const goerliWallet = new ethers.Wallet(
            TEST_WALLET_PRIVATE_KEY,
            goerliProvider
        );
        const link = "https://peanut.to/claim?c=5&v=v3&i=314&p=FjEditsxpzOx6IrI"
        await expect(peanut.getLinkDetails(goerliWallet, link)).rejects.toThrow();
    });

    it('Eco optimism link should have 0.1 eco inside', async function () {
        /** Should fail, no eco on optimism yet */
        expect.assertions(1); // Expecting one assertion to be called
        const link = "https://peanut.to/claim?c=10&v=v3&i=307&p=1VNvLYMOG14xr0fO";
        const optimismProviderUrl = "https://optimism-mainnet.infura.io/v3/" + INFURA_API_KEY;
        const optimismProvider = new ethers.providers.JsonRpcProvider(optimismProviderUrl);
        const optimismWallet = new ethers.Wallet(
            TEST_WALLET_PRIVATE_KEY,
            optimismProvider
        );
        await expect(peanut.getLinkDetails(optimismWallet, link)).rejects.toThrow();
    });

    it('USDC on polygon link should have 1 usdc inside', async function () {
        /** simple usdc test */
        const link = "https://peanut.to/claim?c=137&v=v3&i=1479&p=NMuAQpGTV7KvtGQD";
        const polygonProviderUrl = "https://polygon-mainnet.infura.io/v3/" + INFURA_API_KEY;
        const polygonProvider = new ethers.providers.JsonRpcProvider(polygonProviderUrl);
        const polygonWallet = new ethers.Wallet(
            TEST_WALLET_PRIVATE_KEY,
            polygonProvider
        );
        // should have 1 usdc inside
        const linkDetails = await peanut.getLinkDetails(polygonWallet, link);
        console.log(linkDetails);
    });
});