import { createClaimPayload } from './index.js'

/**
 * Claims a link through the Peanut API
 *
 * @param {string} link - The link to claim
 * @param {string} recipientAddress - The recipient address to claim the link to
 * @param {string} apiKey -The API key to use for the Peanut API
 * @param {string} url - The URL to use for the Peanut API (default is 'https://api.peanut.to/claim')
 * @returns {Object} - The data returned from the API call
 */
export async function claimLinkGasless(
	link,
	recipientAddress,
	apiKey,
	verbose = false,
	url = 'https://api.peanut.to/claim'
) {
	console.log('claiming link through Peanut API...')
	verbose && console.log('link: ', link, ' recipientAddress: ', recipientAddress, ' apiKey: ', apiKey, ' url: ', url)
	const payload = await createClaimPayload(link, recipientAddress)
	verbose && console.log('payload: ', payload)
	//  url = "https://api.peanut.to/claim";
	if (url == 'local') {
		console.log('using local api')
		url = 'http://127.0.0.1:5001/claim'
	}

	const headers = {
		'Content-Type': 'application/json',
	}

	const body = {
		address: payload.recipientAddress,
		address_hash: payload.addressHash,
		signature: payload.signature,
		idx: payload.idx,
		chain: payload.chainId,
		version: payload.contractVersion,
		api_key: apiKey,
	}

	// if axios error, return the error message

	const response = await fetch(url, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	} else {
		const data = await response.json()
		return data
	}
}
