import { ethers } from 'ethersv5'
import {
    DEFAULT_CONTRACT_VERSION,
    assert,
    generateKeysFromString,
    getAbstractSigner,
    getDepositIdx,
    getLinkFromParams,
    getRandomString,
} from '../common/index.js'
import {
    approveSpendERC20,
    estimateGasLimit,
    getContract,
    setFeeOptions
} from './index.js'

/**
 * Generates a link with the specified parameters
 *
 * @param {Object} options - An object containing the options to use for the link creation
 * @returns {Object} - An object containing the link and the txReceipt
 * @example
 * const result = await createLink({
 *   signer,
 *   chainId: 1,
 *   tokenAmount: 100,
 *   tokenAddress: "0xYourTokenAddress",
 *   tokenType: 1,
 *   tokenId: 0,
 *   tokenDecimals: 18,
 *   password: "yourPassword",
 *   baseUrl: "https://peanut.to/claim",
 *   trackId: "sdk",
 *   maxFeePerGas: null,
 *   maxPriorityFeePerGas: null,
 *   gasLimit: null,
 *   eip1559: true,
 *   verbose: false,
 *   contractVersion: "v4",
 *   nonce: null
 * });
 * console.log(result); // { link: "https://peanut.to/claim?c=1&v=v4&i=123&p=yourPassword", txReceipt: TransactionReceipt }
 */
export async function createLink({
    signer,
    chainId,
    tokenAmount,
    tokenAddress = '0x0000000000000000000000000000000000000000',
    tokenType = 0,
    tokenId = 0,
    tokenDecimals = 18,
    password = '',
    baseUrl = 'https://peanut.to/claim',
    trackId = 'sdk',
    maxFeePerGas = null,
    maxPriorityFeePerGas = null,
    gasLimit = null,
    eip1559 = true,
    verbose = false,
    contractVersion = DEFAULT_CONTRACT_VERSION,
    nonce = null,
}) {
    assert(signer, 'signer arg is required')
    assert(chainId, 'chainId arg is required')
    assert(tokenAmount, 'amount arg is required')
    assert(
        tokenType == 0 || tokenAddress != '0x0000000000000000000000000000000000000000',
        'tokenAddress must be provided for non-native tokens'
    )
    assert(
        !(tokenType == 1 || tokenType == 3) || tokenDecimals != null,
        'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
    )

    signer = await getAbstractSigner(signer)

    if (tokenAddress == null) {
        tokenAddress = '0x0000000000000000000000000000000000000000'
        if (tokenType != 0) {
            throw new Error('tokenAddress is null but tokenType is not 0')
        }
    }
    // convert tokenAmount to appropriate unit
    // tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals); // v6
    tokenAmount = ethers.utils.parseUnits(tokenAmount.toString(), tokenDecimals) // v5

    // if native token (tokentype == 0), add value to txOptions
    let txOptions = {}
    // set nonce
    // nonce = nonce || (await signer.getNonce()); // v6
    nonce = nonce || (await signer.getTransactionCount()) // v5
    txOptions.nonce = nonce
    if (tokenType == 0) {
        txOptions = {
            ...txOptions,
            value: tokenAmount,
        }
    } else if (tokenType == 1) {
        // check allowance
        // TODO: check for erc721 and erc1155
        verbose && console.log('checking allowance...')
        // if token is erc20, check allowance
        const allowance = await approveSpendERC20(
            signer,
            chainId,
            tokenAddress,
            tokenAmount,
            tokenDecimals,
            true,
            contractVersion
        )
        verbose && console.log('allowance: ', allowance, ' tokenAmount: ', tokenAmount)
        if (allowance < tokenAmount) {
            throw new Error('Allowance not enough')
        }
    }

    if (password == null || password == '') {
        // if no password is provided, generate a random one
        password = getRandomString(16)
    }

    const keys = generateKeysFromString(password) // deterministically generate keys from password
    const contract = await getContract(chainId, signer, contractVersion) // get the contract instance

    verbose && console.log('Generating link...')

    // set transaction options
    txOptions = await setFeeOptions({
        txOptions,
        provider: signer.provider,
        eip1559,
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasLimit,
        verbose, // Include verbose in the object passed to setFeeOptions
    })

    verbose && console.log('post txOptions: ', txOptions)
    const depositParams = [tokenAddress, tokenType, tokenAmount, tokenId, keys.address]
    const estimatedGasLimit = await estimateGasLimit(contract, 'makeDeposit', depositParams, txOptions)
    if (estimatedGasLimit) {
        txOptions.gasLimit = estimatedGasLimit.toString()
    }
    verbose && console.log('final txOptions: ', txOptions)
    // const depositParams = [tokenAddress, tokenType, tokenAmount, tokenId, keys.address, txOptions];
    verbose && console.log('depositParams: ', depositParams)
    // var tx = await contract.makeDeposit(...depositParams);

    // store in localstorage in case tx falls through (only if in web environment)
    // TODO: refactor in future
    if (typeof window !== 'undefined') {
        const tempDeposits = JSON.parse(localStorage.getItem('tempDeposits')) || []
        const tempDeposit = {
            chain: chainId,
            tokenAmount: tokenAmount.toString(),
            contractType: tokenType,
            contractVersion: contractVersion,
            tokenAddress: tokenAddress,
            password: password,
            idx: null,
            link: null,
            txHash: null,
        }
        tempDeposits.push(tempDeposit)
        localStorage.setItem('tempDeposits', JSON.stringify(tempDeposits))
    }

    var tx = await contract.makeDeposit(...depositParams, txOptions)

    console.log('submitted tx: ', tx.hash)

    // now we need the deposit index from the tx receipt
    var txReceipt = await tx.wait()
    var depositIdx = getDepositIdx(txReceipt, chainId)
    verbose && console.log('Deposit finalized. Deposit index: ', depositIdx)

    // now we can create the link
    const link = getLinkFromParams(chainId, contractVersion, depositIdx, password, baseUrl, trackId)
    verbose && console.log('created link: ', link)
    // return the link and the tx receipt
    return { link, txReceipt }
}
