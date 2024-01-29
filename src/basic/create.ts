import * as ethers from 'ethersv5'
import * as consts from '../consts'
import * as utils from '../advanced'
import * as config from '../config'
import * as data from '../data'
import * as functions from '.'
import * as interfaces from '../interfaces'

/**
 * Generates a link with the specified parameters
 */
export async function createLink({
	structSigner,
	linkDetails,
	peanutContractVersion = null,
	password = null,
}: interfaces.ICreateLinkParams): Promise<interfaces.ICreatedPeanutLink> {
	if (peanutContractVersion == null) {
		functions.getLatestContractVersion({ chainId: linkDetails.chainId, type: 'normal' })
	}
	password = password || (await utils.getRandomString(16))
	linkDetails = await utils.validateLinkDetails(linkDetails, [password], 1, structSigner.signer.provider)
	const provider = structSigner.signer.provider

	// Prepare the transactions
	let prepareDepositTxsResponse
	try {
		prepareDepositTxsResponse = await utils.prepareDepositTxs({
			address: await structSigner.signer.getAddress(),
			linkDetails,
			peanutContractVersion,
			numberOfLinks: 1,
			passwords: [password],
			provider: provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_PREPARING_TX, error)
	}

	// Sign and submit the transactions sequentially
	const signedTxs = []
	for (const unsignedTx of prepareDepositTxsResponse.unsignedTxs) {
		try {
			const signedTx = await utils.signAndSubmitTx({ structSigner, unsignedTx })
			signedTxs.push(signedTx)
			config.config.verbose && console.log('awaiting tx to be mined...')
			await signedTx.tx.wait()
			config.config.verbose && console.log('mined tx: ', signedTx.tx)
		} catch (error) {
			throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_SIGNING_AND_SUBMITTING_TX, error)
		}
	}

	// Get the links from the transactions
	let linksFromTxResp
	try {
		linksFromTxResp = await utils.getLinksFromTx({
			linkDetails,
			txHash: signedTxs[signedTxs.length - 1].txHash,
			passwords: [password],
			provider: provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_GETTING_LINKS_FROM_TX, error)
	}

	return {
		link: linksFromTxResp.links,
		txHash: signedTxs[signedTxs.length - 1].txHash,
	}
}

export async function createLinks({
	structSigner,
	linkDetails,
	numberOfLinks = 2,
	peanutContractVersion = null,
	passwords = null,
}: interfaces.ICreateLinksParams): Promise<interfaces.ICreatedPeanutLink[]> {
	if (peanutContractVersion == null) {
		functions.getLatestContractVersion({ chainId: linkDetails.chainId, type: 'normal' })
	}
	passwords = passwords || (await Promise.all(Array.from({ length: numberOfLinks }, () => utils.getRandomString(16))))
	linkDetails = await utils.validateLinkDetails(linkDetails, passwords, numberOfLinks, structSigner.signer.provider)
	const provider = structSigner.signer.provider

	// Prepare the transactions
	let prepareDepositTxsResponse
	try {
		prepareDepositTxsResponse = await utils.prepareDepositTxs({
			address: await structSigner.signer.getAddress(),
			linkDetails,
			peanutContractVersion,
			numberOfLinks: numberOfLinks,
			passwords: passwords,
			provider: provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_PREPARING_TX, error)
	}

	// Sign and submit the transactions
	const signedTxs = []
	for (const unsignedTx of prepareDepositTxsResponse.unsignedTxs) {
		try {
			const signedTx = await utils.signAndSubmitTx({ structSigner, unsignedTx })
			signedTxs.push(signedTx)
			await signedTx.tx.wait()
		} catch (error) {
			throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_SIGNING_AND_SUBMITTING_TX, error)
		}
	}

	config.config.verbose && console.log('signedTxs: ', signedTxs)
	let linksFromTxResp: interfaces.IGetLinkFromTxResponse
	try {
		linksFromTxResp = await utils.getLinksFromTx({
			linkDetails,
			txHash: signedTxs[signedTxs.length - 1].txHash,
			passwords: passwords,
			provider,
		})
	} catch (error) {
		throw new interfaces.SDKStatus(interfaces.ECreateLinkStatusCodes.ERROR_GETTING_LINKS_FROM_TX, error)
	}
	const createdLinks = linksFromTxResp.links.map((link) => {
		return { link: link, txHash: signedTxs[signedTxs.length - 1].txHash }
	})

	return createdLinks
}
