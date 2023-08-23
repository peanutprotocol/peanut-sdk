import { Contract, Signer, ethers } from 'ethersv5'
import { JsonRpcProvider } from '@ethersproject/providers'
import {
    DEFAULT_CONTRACT_VERSION,
    PEANUT_ABI_V3,
    PEANUT_ABI_V4,
    getChainDetailsRpc,
    getPeanutContractAdress
} from '../common/'

/**
 * Returns the default provider for a given chainId
 *
 * @param {number|string} chainId - The chainId to get the provider for
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {JsonRpcProvider} - The provider
 */
export function getDefaultProvider(chainId: number | string, verbose = false) {
    const rpcs = getChainDetailsRpc(String(chainId))

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
 * @param {Singer | Provider} signerOrProvider - The signer or provider to use for the contract
 * @param {string} [version=DEFAULT_CONTRACT_VERSION] - The version of the contract
 * @param {boolean} [verbose=true] - Whether or not to print verbose output
 * @returns {Contract} - The contract object
 */
export async function getContract(chainId: number | string, signerOrProvider: Signer | JsonRpcProvider, version = DEFAULT_CONTRACT_VERSION, verbose = true) {
    /* returns a contract object for the given chainId and signer */
    // signerOrProvider = await convertSignerOr ToV6(signerOrProvider);

    chainId = String(chainId)

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

    const contractAddress = getPeanutContractAdress(chainId, version)
    const contract = new ethers.Contract(contractAddress, PEANUT_ABI, signerOrProvider)
    // connected to contracv
    verbose && console.log('Connected to contract ', version, ' on chain ', chainId, ' at ', contractAddress)
    return contract
    // TODO: return class
}

export async function getAllowance(signer: Signer, chainId: string | number, tokenContract: Contract, spender: string) {
    let allowance
    try {
        let address = await signer.getAddress()
        allowance = await tokenContract.allowance(address, spender)
    } catch (error) {
        console.error('Error fetching allowance:', error)
    }
    return allowance ? ethers.utils.parseUnits(allowance.toString()) : undefined
}

export async function estimateGasLimit(contract: Contract, functionName: string, params: any[], txOptions?: object) {
    try {
        const estimatedGas = await contract.estimateGas[functionName](...params, txOptions)
        return BigInt(Math.floor(Number(estimatedGas) * 1.1)) // safety margin
    } catch (error) {
        console.error(`Error estimating gas for ${functionName}:`, error)
        return null
    }
}
