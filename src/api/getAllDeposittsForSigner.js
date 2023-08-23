import {
    DEFAULT_CONTRACT_VERSION
} from '../common/data.js'
import {
    getContract
} from './index.js'

/**
 * Gets all deposits for a given signer and chainId.
 *
 */
export async function getAllDepositsForSigner({
    signer,
    chainId,
    contractVersion = DEFAULT_CONTRACT_VERSION,
    verbose = false,
}) {
    const contract = await getContract(chainId, signer, contractVersion)
    let deposits
    if (contractVersion == 'v3') {
        // throw warning if using v3
        console.warn('WARNING: This function is not efficient for v3 contracts. Not recommended to use.')
        const depositCount = await contract.getDepositCount()
        deposits = []
        for (let i = 0; i < depositCount; i++) {
            verbose && console.log('fetching deposit: ', i)
            let deposit = await contract.deposits(i)
            deposits.push(deposit)
        }
    } else {
        // v4: we now have getAllDeposits available
        const address = await signer.getAddress()
        // const allDeposits = await contract.getAllDeposits();
        deposits = await contract.getAllDepositsForAddress(address)
    }
    return deposits
}
