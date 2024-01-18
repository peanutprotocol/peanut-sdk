import * as ethers from 'ethersv5'

import * as consts from '../consts'
import * as utils from '../utils'
import * as config from '../config'
import * as data from '../data'
import * as functions from '../functions'
import * as interfaces from '../interfaces'

export async function getAllowanceERC20(
	tokenContract: any,
	spender: any,
	address: string,
	signerOrProvider?: ethers.providers.JsonRpcSigner | ethers.providers.Provider
) {
	let allowance
	try {
		if (!signerOrProvider) {
			signerOrProvider = await functions.getDefaultProvider(tokenContract.chainId)
		}

		if (!address) {
			const signer = signerOrProvider as ethers.providers.JsonRpcSigner
			address = await signer.getAddress()
		}
		allowance = await tokenContract.allowance(address, spender)
	} catch (error) {
		console.error('Error fetching ERC20 allowance status:', error)
	}
	return allowance
}

export async function getApprovedERC721(
	tokenContract: any,
	tokenId: number,
	signerOrProvider?: ethers.providers.JsonRpcSigner | ethers.providers.Provider
) {
	let approved
	try {
		if (!signerOrProvider) {
			signerOrProvider = await functions.getDefaultProvider(tokenContract.chainId)
		}

		approved = await tokenContract.getApproved(tokenId)
	} catch (error) {
		console.error('Error fetching ERC721 approval status:', error)
	}
	return approved
}

export async function getApprovedERC1155(
	tokenContract: any,
	addressOwner: string,
	addressOperator: string,
	signerOrProvider?: ethers.providers.JsonRpcSigner | ethers.providers.Provider
) {
	let approved
	try {
		if (!signerOrProvider) {
			signerOrProvider = await functions.getDefaultProvider(tokenContract.chainId)
		}

		approved = await tokenContract.isApprovedForAll(addressOwner, addressOperator)
	} catch (error) {
		console.error('Error fetching ERC1155 approval status:', error)
	}
	return approved
}

export async function prepareApproveERC20Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	_amount: number | ethers.BigNumber,
	tokenDecimals = 18,
	isRawAmount = false,
	contractVersion = null,
	provider?: any, // why does TS complain about string here?
	spenderAddress?: string | undefined
): Promise<ethers.providers.TransactionRequest | null> {
	//TODO: implement address
	const defaultProvider = provider || (await functions.getDefaultProvider(chainId))
	const tokenContract = new ethers.Contract(tokenAddress, data.ERC20_ABI, defaultProvider)

	let amount: ethers.BigNumber | number = _amount
	if (_amount == -1) {
		// if amount is -1, approve infinite amount
		amount = ethers.constants.MaxUint256
	}

	if (!isRawAmount) {
		amount = ethers.utils.parseUnits(amount.toString(), tokenDecimals)
	}

	const _PEANUT_CONTRACTS = data.PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	// get allowance
	const allowance = await getAllowanceERC20(tokenContract, spender, address, defaultProvider)
	if (allowance.gte(amount)) {
		config.config.verbose &&
			console.log('Allowance already enough, no need to approve more (allowance: ' + allowance.toString() + ')')
		return null
	}
	config.config.verbose && console.log('Approving ' + amount.toString() + ' tokens for spender ' + spender)

	const tx = tokenContract.populateTransaction.approve(spender, amount)
	return tx
}

export async function prepareApproveERC721Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	tokenId: number,
	provider?: any,
	spenderAddress?: string | undefined,
	contractVersion = null
): Promise<ethers.providers.TransactionRequest | null> {
	if (contractVersion == null) {
		contractVersion = functions.getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}
	const defaultProvider = provider || (await functions.getDefaultProvider(chainId))
	const tokenContract = new ethers.Contract(tokenAddress, data.ERC721_ABI, defaultProvider)

	const _PEANUT_CONTRACTS = data.PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	config.config.verbose && console.log('Checking approval for ' + tokenAddress + ' token ID: ' + tokenId)
	// Check if approval is already sufficient
	const currentApproval = await getApprovedERC721(tokenContract, tokenId, defaultProvider)
	if (currentApproval.toLowerCase() === spender.toLowerCase()) {
		config.config.verbose && console.log('Approval already granted to the spender for token ID: ' + tokenId)
		return null
	} else {
		config.config.verbose &&
			console.log('Approval granted to different address: ' + currentApproval + ' for token ID: ' + tokenId)
	}

	// Prepare the transaction to approve the spender for the specified token ID
	const tx = tokenContract.populateTransaction.approve(spender, tokenId, { from: address })
	return tx
}

export async function prepareApproveERC1155Tx(
	address: string,
	chainId: string,
	tokenAddress: string,
	provider?: any,
	spenderAddress?: string | undefined,
	contractVersion = null
): Promise<ethers.providers.TransactionRequest | null> {
	if (contractVersion == null) {
		contractVersion = functions.getLatestContractVersion({ chainId: chainId, type: 'normal' })
	}
	const defaultProvider = provider || (await functions.getDefaultProvider(chainId))
	const tokenContract = new ethers.Contract(tokenAddress, data.ERC1155_ABI, defaultProvider)

	const _PEANUT_CONTRACTS = data.PEANUT_CONTRACTS as { [chainId: string]: { [contractVersion: string]: string } }
	const spender = spenderAddress || (_PEANUT_CONTRACTS[chainId] && _PEANUT_CONTRACTS[chainId][contractVersion])

	config.config.verbose &&
		console.log('Checking approval for ' + tokenAddress + ' owner: ' + address + ' operator: ' + spender)
	// Check if approval is already granted for the operator
	const isApproved = await getApprovedERC1155(tokenContract, address, spender, defaultProvider)

	if (isApproved) {
		config.config.verbose && console.log('Approval already granted to the operator')
		return null
	}

	// Prepare the transaction to approve the spender for the specified token ID
	const tx = tokenContract.populateTransaction.setApprovalForAll(spender, true, { from: address })
	config.config.verbose && console.log('Approval needed for operator')
	return tx
}

export async function validateLinkDetails(
	linkDetails: interfaces.IPeanutLinkDetails,
	passwords: string[],
	numberOfLinks: number,
	provider: ethers.providers.Provider
): Promise<interfaces.IPeanutLinkDetails> {
	linkDetails.tokenAddress = linkDetails.tokenAddress ?? '0x0000000000000000000000000000000000000000'

	if (linkDetails.tokenDecimals == undefined || linkDetails.tokenType == undefined) {
		try {
			const contractDetails = await functions.getTokenContractDetails({
				address: linkDetails.tokenAddress,
				provider: provider,
			})

			linkDetails.tokenType = contractDetails.type
			contractDetails.decimals && (linkDetails.tokenDecimals = contractDetails.decimals)
		} catch (error) {
			throw new Error('Contract type not supported')
		}
	}

	if (!linkDetails || !linkDetails.chainId || !linkDetails.tokenAmount) {
		throw new Error(
			'validateLinkDetails function requires linkDetails object with chainId and tokenAmount properties'
		)
	}

	// Assert that linkDetails conforms to IPeanutLinkDetails
	linkDetails = linkDetails as interfaces.IPeanutLinkDetails

	if (linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155) {
		linkDetails.tokenDecimals = linkDetails.tokenDecimals ?? 0
	} else {
		linkDetails.tokenDecimals = linkDetails.tokenDecimals ?? 18
	}

	// Use nullish coalescing operator to provide default values
	linkDetails.tokenType = linkDetails.tokenType ?? 0
	linkDetails.tokenId = linkDetails.tokenId ?? 0
	linkDetails.baseUrl = linkDetails.baseUrl ?? 'https://peanut.to/claim'
	linkDetails.trackId = linkDetails.trackId ?? 'sdk'

	if (numberOfLinks > 1) {
		utils.assert(
			passwords.length === numberOfLinks,
			'when creating multiple links, passwords must be an array of length numberOfLinks'
		)
	}

	utils.assert(
		linkDetails.tokenType == interfaces.EPeanutLinkType.native ||
			linkDetails.tokenAddress != '0x0000000000000000000000000000000000000000',
		'tokenAddress must be provided for non-ETH tokens'
	)
	if (
		linkDetails.tokenType == interfaces.EPeanutLinkType.erc721 ||
		linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155
	) {
		utils.assert(numberOfLinks == 1, 'can only send one ERC721 or ERC1155 at a time')
		utils.assert('tokenId' in linkDetails, 'tokenId needed')
	}
	utils.assert(
		!(
			linkDetails.tokenType == interfaces.EPeanutLinkType.erc20 ||
			linkDetails.tokenType == interfaces.EPeanutLinkType.erc1155
		) || linkDetails.tokenDecimals != null,
		'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
	)

	if (
		linkDetails.tokenType !== interfaces.EPeanutLinkType.native &&
		linkDetails.tokenAddress === '0x000000cl0000000000000000000000000000000000'
	) {
		throw new Error('need to provide tokenAddress if tokenType is not 0')
	}

	const tokenAmountString = utils.trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals!)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals) // v5
	utils.assert(tokenAmountBigNum.gt(0), 'tokenAmount must be greater than 0')

	return linkDetails
}
