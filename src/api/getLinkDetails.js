import { ethers } from 'ethersv5'
import {
    TOKEN_DETAILS,
    assert,
    getParamsFromLink
} from '../common/index.js'
import { getContract } from './web3.js'

/**
 * Gets the details of a Link: what token it is, how much it holds, etc.
 *
 * @param {Object} signerOrProvider - The signer or provider to use
 * @param {string} link - The link to get the details of
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {Object} - An object containing the link details
 */
export async function getLinkDetails(signerOrProvider, link, verbose = false) {
    /**
     * Gets the details of a Link: what token it is, how much it holds, etc.
     */
    verbose && console.log('getLinkDetails called with link: ', link)
    assert(signerOrProvider, 'signerOrProvider arg is required')
    assert(link, 'link arg is required')

    const params = getParamsFromLink(link)
    const chainId = params.chainId
    const contractVersion = params.contractVersion
    const depositIdx = params.depositIdx
    const password = params.password
    const contract = await getContract(chainId, signerOrProvider, contractVersion)

    const deposit = await contract.deposits(depositIdx)
    var tokenAddress = deposit.tokenAddress
    verbose && console.log('fetched deposit: ', deposit)

    const tokenType = deposit.contractType
    verbose && console.log('tokenType: ', tokenType, typeof tokenType)

    if (tokenType == 0) {
        // native token, set zero address
        // TODO: is this a potential footgun or no? Why is matic 0xeeeeee....? Is this a problem?
        verbose && console.log('tokenType is 0, setting tokenAddress to zero address')
        tokenAddress = ethers.constants.AddressZero
    }
    verbose && console.log('deposit: ', deposit)

    // Retrieve the token's details from the tokenDetails.json file
    verbose && console.log('finding token details for token with address: ', tokenAddress, ' on chain: ', chainId)
    // Find the correct chain details using chainId
    console.log('chainId: ', chainId)
    const chainDetails = TOKEN_DETAILS.find((chain) => chain.chainId === String(chainId))
    if (!chainDetails) {
        throw new Error('Chain details not found')
    }

    // Find the token within the tokens array of the chain
    const tokenDetails = chainDetails.tokens.find((token) => token.address.toLowerCase() === tokenAddress.toLowerCase())
    if (!tokenDetails) {
        throw new Error('Token details not found')
    }

    // Format the token amount
    const tokenAmount = ethers.utils.formatUnits(deposit.amount, tokenDetails.decimals)

    // TODO: Fetch token price using API

    return {
        link: link,
        chainId: chainId,
        depositIndex: depositIdx,
        contractVersion: contractVersion,
        password: password,
        tokenType: deposit.contractType,
        tokenAddress: deposit.tokenAddress,
        tokenSymbol: tokenDetails.symbol,
        tokenName: tokenDetails.name,
        tokenAmount: tokenAmount,
        // tokenPrice: tokenPrice
    }
}
