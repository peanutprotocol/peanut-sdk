import { ethers, Signer } from 'ethersv5'
import {
    assert,
    generateKeysFromString,
    getAbstractSigner,
    getParamsFromLink,
    signAddress,
    solidityHashAddress,
    solidityHashBytesEIP191,
} from '../common/index'
import {
    getContract
} from './'

interface ClaimLinkSender {
    signer: Signer
    link: string
    verbose?: boolean
}

/**
 * Claims the contents of a link as a sender. Can only be used if a link has not been claimed in a set time period.
 * (24 hours). Only works with links created with v4 of the contract. More gas efficient than claimLink.
 *
 * @param {ClaimLinkSender} options - An object containing the options to use for claiming the link
 * @param {Signer} options.signer - The signer to use for claiming
 * @param {string} options.link - The link to claim
 * @param {boolean} [options.verbose=false] - Whether or not to print verbose output
 * @returns {Object} - The transaction receipt
 */
export async function claimLinkSender({ signer, link, verbose = false }: ClaimLinkSender) {
    // raise error, not implemented yet
    throw new Error('Not implemented yet')
    assert(!!signer, 'signer arg is required')
    assert(!!link, 'link arg is required')

    signer = await getAbstractSigner(signer)

    const params = getParamsFromLink(link)
    const chainId = params.chainId
    const contractVersion = params.contractVersion
    const depositIdx = params.depositIdx
    const password = params.password
    const recipient = await signer.getAddress()
    verbose && console.log('recipient not provided, using signer address: ', recipient)

    assert(!!password, 'password is required')
    assert(!!contractVersion, 'contractVersion is required')
    const keys = generateKeysFromString(password!) // deterministically generate keys from password
    const contract = await getContract(chainId, signer, contractVersion!)

    // cryptography
    var addressHash = solidityHashAddress(recipient)
    // var addressHashBinary = ethers.getBytes(addressHash); // v6
    var addressHashBinary = ethers.utils.arrayify(addressHash) // v5
    verbose && console.log('addressHash: ', addressHash, ' addressHashBinary: ', addressHashBinary)
    var addressHashEIP191 = solidityHashBytesEIP191(addressHashBinary)
    var signature = await signAddress(recipient, keys.privateKey) // sign with link keys

    if (verbose) {
        // print the params
        console.log('params: ', params)
        console.log('addressHash: ', addressHash)
        console.log('addressHashEIP191: ', addressHashEIP191)
        console.log('signature: ', signature)
    }

    // TODO: use createClaimPayload instead

    // withdraw the deposit
    // address hash is hash(prefix + hash(address))
    const tx = await contract.withdrawDeposit(depositIdx, recipient, addressHashEIP191, signature)
    console.log('submitted tx: ', tx.hash, ' now waiting for receipt...')
    const txReceipt = await tx.wait()

    return txReceipt
}
