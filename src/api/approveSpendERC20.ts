import { BigNumber, Signer, ethers } from 'ethersv5'
import { JsonRpcProvider } from '@ethersproject/providers'
import {
    DEFAULT_CONTRACT_VERSION,
    ERC20_ABI,
    getAbstractSigner,
    getPeanutContractAdress
} from '../common/index'
import {
    getAllowance,
    setFeeOptions
} from './'

/**
 * Approves the contract to spend the specified amount of tokens
 *
 * @param {Signer} signer - The signer to use for approving the spend
 * @param {number|string} chainId - The chainId of the contract
 * @param {string} tokenAddress - The address of the token to approve the spend for
 * @param {number|string} amount - The amount to approve for spending. If -1, approve infinite amount.
 * defaults to 18.
 * @param {number} tokenDecimals - The number of decimals the token has
 * @param {boolean} isRawAmount - Whether or not the amount is raw or not. If true, the amount will not be converted to the appropriate unit
 * @param {string} contractVersion - The version of the contract
 * @param {boolean} verbose - Whether or not to print verbose output
 * @returns {Object} - An object containing the allowance and txReceipt
 */
export async function approveSpendERC20(
    signer: Signer,
    chainId: number | string,
    tokenAddress: string,
    amount: number | string | BigNumber,
    tokenDecimals = 18,
    isRawAmount = false,
    contractVersion = DEFAULT_CONTRACT_VERSION,
    verbose = true
) {
    /*  Approves the contract to spend the specified amount of tokens   */
    signer = await getAbstractSigner(signer)

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
    if (amount == -1) {
        // if amount is -1, approve infinite amount
        amount = ethers.constants.MaxUint256
    }
    const spender = getPeanutContractAdress(String(chainId), contractVersion)
    let allowance = await getAllowance(signer, chainId, tokenContract, spender)
    // convert amount to BigInt and compare to allowance

    if (isRawAmount) {
        amount = amount
    } else {
        amount = ethers.utils.parseUnits(amount.toString(), tokenDecimals)
    }
    if (allowance && allowance >= amount) {
        console.log('Allowance already enough, no need to approve more')
        return { allowance, txReceipt: null }
    } else {
        console.log('Allowance only', allowance?.toString(), ', need ' + amount.toString() + ', approving...')
        const txOptions = await setFeeOptions({ verbose, provider: signer.provider as JsonRpcProvider, eip1559: true })
        const tx = await tokenContract.approve(spender, amount, txOptions)
        const txReceipt = await tx.wait()
        allowance = await getAllowance(signer, chainId, tokenContract, spender)
        return { allowance, txReceipt }
    }
}
