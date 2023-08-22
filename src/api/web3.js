import { ethers } from 'ethersv5'
import { CHAIN_DETAILS, PEANUT_ABI_V3, PEANUT_ABI_V4, PEANUT_CONTRACTS } from '../common/index.js'

/**
 * Returns the default provider for a given chainId
 *
 * @param {number|string} chainId - The chainId to get the provider for
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {Object} - The provider
 */
export function getDefaultProvider(chainId, verbose = false) {
    chainId = String(chainId)
    const rpcs = CHAIN_DETAILS[chainId].rpc

    verbose && console.log('rpcs', rpcs)
    // choose first rpc that has no '${' sign in it (e.g. )
    const rpc = rpcs.find((rpc) => !rpc.includes('${'))
    verbose && console.log('rpc', rpc)
    const provider = new ethers.providers.JsonRpcProvider(rpc)
    return provider
}

/**
 * Returns a contract object for a given chainId and signer
 *
 * @param {number|string} chainId - The chainId to get the contract for
 * @param {Object} signerOrProvider - The signer or provider to use for the contract
 * @param {string} [version=CONTRACT_VERSION] - The version of the contract
 * @param {boolean} [verbose=true] - Whether or not to print verbose output
 * @returns {Object} - The contract object
 */
export async function getContract(chainId, signerOrProvider, version = CONTRACT_VERSION, verbose = true) {
    /* returns a contract object for the given chainId and signer */
    // signerOrProvider = await convertSignerOr ToV6(signerOrProvider);

    if (typeof chainId == 'string' || chainId instanceof String) {
        // just move to TS ffs
        // do smae with bigint
        // if chainId is a string, convert to int
        chainId = parseInt(chainId)
    }
    chainId = parseInt(chainId)

    // TODO: fix this for new versions
    // if version is v3, load PEANUT_ABI_V3. if it is v4, load PEANUT_ABI_V4
    var PEANUT_ABI
    if (version == 'v3') {
        PEANUT_ABI = PEANUT_ABI_V3
    } else if (version == 'v4') {
        PEANUT_ABI = PEANUT_ABI_V4
    } else {
        throw new Error('Invalid version')
    }

    const contractAddress = PEANUT_CONTRACTS[chainId][version]
    const contract = new ethers.Contract(contractAddress, PEANUT_ABI, signerOrProvider)
    // connected to contracv
    verbose && console.log('Connected to contract ', version, ' on chain ', chainId, ' at ', contractAddress)
    return contract
    // TODO: return class
}

export async function getAllowance(signer, chainId, tokenContract, spender) {
    let allowance
    try {
        let address = await signer.getAddress()
        allowance = await tokenContract.allowance(address, spender)
    } catch (error) {
        console.error('Error fetching allowance:', error)
    }
    return allowance
}

export async function estimateGasLimit(contract, functionName, params, txOptions) {
    try {
        const estimatedGas = await contract.estimateGas[functionName](...params, txOptions)
        return BigInt(Math.floor(Number(estimatedGas) * 1.1)) // safety margin
    } catch (error) {
        console.error(`Error estimating gas for ${functionName}:`, error)
        return null
    }
}
