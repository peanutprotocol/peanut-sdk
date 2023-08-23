
import { Signer } from 'ethersv5'
import {
    assert,
    getAbstractSigner,
    getParamsFromLink
} from '../common/index'
import {
    getContract
} from './'

interface GetLinkStatusParams {
    signer: Signer
    link: string
}

/**
 * Checks if a link has been claimed
 *
 * @param {GetLinkStatusParams} options - An object containing the signer and link to check
 * @returns {Object} - An object containing whether the link has been claimed and the deposit
 */
export async function getLinkStatus({ signer, link }: GetLinkStatusParams) {
    /* checks if a link has been claimed */
    assert(!!signer, 'signer arg is required')
    assert(!!link, 'link arg is required')

    signer = await getAbstractSigner(signer!)

    const params = getParamsFromLink(link)
    const chainId = params.chainId
    const contractVersion = params.contractVersion
    const depositIdx = params.depositIdx
    assert(!!contractVersion, 'contractVersion is required')
    const contract = await getContract(chainId, signer, contractVersion!)
    const deposit = await contract.deposits(depositIdx)

    // if the deposit is claimed, the pubKey20 will be 0x000....
    if (deposit.pubKey20 == '0x0000000000000000000000000000000000000000') {
        return { claimed: true, deposit }
    }
    return { claimed: false, deposit }
}
