import {
    assert,
    getAbstractSigner,
    getParamsFromLink
} from '../common/index.js'
import {
    getContract
} from './index.js'

/**
 * Checks if a link has been claimed
 *
 * @param {Object} options - An object containing the signer and link to check
 * @returns {Object} - An object containing whether the link has been claimed and the deposit
 */
export async function getLinkStatus({ signer, link }) {
    /* checks if a link has been claimed */
    assert(signer, 'signer arg is required')
    assert(link, 'link arg is required')

    signer = await getAbstractSigner(signer)

    const params = getParamsFromLink(link)
    const chainId = params.chainId
    const contractVersion = params.contractVersion
    const depositIdx = params.depositIdx
    const contract = await getContract(chainId, signer, contractVersion)
    const deposit = await contract.deposits(depositIdx)

    // if the deposit is claimed, the pubKey20 will be 0x000....
    if (deposit.pubKey20 == '0x0000000000000000000000000000000000000000') {
        return { claimed: true, deposit }
    }
    return { claimed: false, deposit }
}
