import { BigNumber, Wallet, constants, ethers, utils } from 'ethersv5'
import {
	ERC1155_ABI,
	config,
	createClaimPayload,
	createMultiLinkFromLinks,
	ethersV5ToPeanutTx,
	generateKeysFromString,
	getContract,
	getContractAddress,
	getDefaultProvider,
	getLatestContractVersion,
	getLinkDetails,
	getLinkFromParams,
	getLinksFromTx,
	interfaces,
	prepareApproveERC20Tx,
	trim_decimal_overflow,
} from '.'
import { getRawParamsFromLink, validateUserName } from './util'
import {
	VAULT_CONTRACTS_WITH_FLEXIBLE_DEPOSITS,
	ROUTER_CONTRACTS_WITH_MFA,
	VAULT_CONTRACTS_WITH_MFA,
	BATCHER_CONTRACTS_WITH_MFA,
} from './data'

export function generateAmountsDistribution(
	totalAmount: BigNumber,
	numberOfLinks: number,
	exponent: number = 4
): BigNumber[] {
	const randoms: number[] = []
	let randomsSum = 0
	for (let i = 0; i < numberOfLinks; i++) {
		let value = Math.random() ** exponent // Squaring to make distribution more spikeyt
		value += 1 / numberOfLinks // communism - make sure that everyone gets a minimal amount
		randoms.push(value)
		randomsSum += value
	}

	const values: BigNumber[] = []
	let valuesSum: BigNumber = BigNumber.from(0)
	for (let i = 0; i < numberOfLinks; i++) {
		const proportion = randoms[i] / randomsSum
		const value = totalAmount.mul(Math.floor(proportion * 1e9)).div(1e9)
		values.push(value)
		valuesSum = valuesSum.add(value)
	}

	// Make sum of values exactly match totalAmount
	const missing = totalAmount.sub(valuesSum)
	values[0] = values[0].add(missing)

	return values
}

export async function prepareRaffleDepositTxs({
	userAddress,
	linkDetails,
	numberOfLinks,
	tokenIds,
	amounts,
	password,
	withMFA,
	provider,
}: interfaces.IPrepareRaffleDepositTxsParams): Promise<interfaces.IPrepareDepositTxsResponse> {
	if (linkDetails.tokenType === null || linkDetails.tokenType === undefined) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Please pass tokenType to prepareRaffleDepositTxs'
		)
	}

	if (
		(linkDetails.tokenDecimals === null || linkDetails.tokenDecimals === undefined) &&
		linkDetails.tokenType !== 2 &&
		!amounts
	) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'tokenDecimals is required for prepareRaffleDepositTxs since tokenType is not 2 (ERC-721) and amounts is not supplied'
		)
	}

	if (!linkDetails.tokenAddress) {
		if (linkDetails.tokenType === 0) {
			linkDetails.tokenAddress = constants.AddressZero
		} else {
			throw new interfaces.SDKStatus(
				interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
				'Please pass tokenAddress to prepareRaffleDepositTxs'
			)
		}
	}

	if (amounts && linkDetails.tokenAmount) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'If `amounts` is provided, linkDetails.tokenAmount can not be supplied'
		)
	}

	if (!amounts && linkDetails.tokenAmount === 0 && ![2, 3].includes(linkDetails.tokenType)) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Either amounts or linkDetails.tokenAmount must be provided if its not NFTs'
		)
	}

	if (numberOfLinks < 1) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'numberOfLinks must be at least 1 in prepareRaffleDepositTxs'
		)
	}

	if ([2, 3].includes(linkDetails.tokenType) && !tokenIds) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'tokenIds must be passed for NFT raffles'
		)
	}

	if (tokenIds && tokenIds.length !== numberOfLinks) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'The length of `tokenIds` array must match numberOfLinks or be undefined'
		)
	}

	if (amounts && amounts.length !== numberOfLinks) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'The length of `amounts` array must match numberOfLinks or be undefined'
		)
	}

	if (amounts && linkDetails.tokenType === 2 && !amounts.every((x) => x === BigNumber.from(1))) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'For ERC-721 NFTs all amounts must be 1'
		)
	}

	const peanutContractVersion = getLatestContractVersion({
		chainId: linkDetails.chainId,
		type: 'normal',
	})
	const batcherContractVersion = getLatestContractVersion({
		chainId: linkDetails.chainId,
		type: 'batch',
	})

	if (!VAULT_CONTRACTS_WITH_MFA.includes(peanutContractVersion)) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			`Creating a raffle is not supported for vault contract version ${peanutContractVersion} on chain ${linkDetails.chainId} yet`
		)
	}
	if (!BATCHER_CONTRACTS_WITH_MFA.includes(batcherContractVersion)) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			`Creating a raffle is not supported for batcher contract version ${batcherContractVersion} on chain ${linkDetails.chainId} yet`
		)
	}

	if (!provider) {
		provider = await getDefaultProvider(linkDetails.chainId)
	}

	// Convert linkDetails.tokenAmount to BigNumber.
	// Used only for ETH and ERC20 raffles.
	const tokenAmountString = trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals)

	const peanutVaultAddress = getContractAddress(linkDetails.chainId, peanutContractVersion)
	const batcherContract = await getContract(linkDetails.chainId, provider, batcherContractVersion)

	let approveTx: interfaces.IPeanutUnsignedTransaction = null
	if (linkDetails.tokenType === 1) {
		approveTx = await prepareApproveERC20Tx(
			userAddress,
			linkDetails.chainId,
			linkDetails.tokenAddress,
			tokenAmountBigNum,
			-1, // decimals doesn't matter since we provide the token amount as a big number already
			true, // already a prepared bignumber
			batcherContractVersion,
			provider
		)
	} else if ([2, 3].includes(linkDetails.tokenType)) {
		// ERC721 and ERC1155 ABIs are same for setApprovalForAll
		const tokenContract = new ethers.Contract(linkDetails.tokenAddress, ERC1155_ABI, provider)
		const approved = await tokenContract.isApprovedForAll(userAddress, batcherContract.address)
		if (!approved) {
			const approvalTxRequest = await tokenContract.populateTransaction.setApprovalForAll(
				batcherContract.address,
				true,
				{ from: userAddress }
			)
			approveTx = ethersV5ToPeanutTx(approvalTxRequest)
		}
	}

	// Get the pubkey for which to make the deposit
	const { address: pubKey20 } = generateKeysFromString(password)

	// Generate random amounts if explicit amounts are not supplied
	if (!amounts) {
		if ([2, 3].includes(linkDetails.tokenType)) {
			// for NFTs, it's always 1 token (1 NFT)
			amounts = Array(numberOfLinks).fill(1)
		} else {
			amounts = generateAmountsDistribution(tokenAmountBigNum, numberOfLinks)
			config.verbose && console.log('Requested amount:', tokenAmountBigNum.toString())
			config.verbose &&
				console.log(
					'Got amounts:',
					amounts.map((am) => am.toString())
				)
		}
	}

	let txOptions: interfaces.ITxOptions = {}
	if (linkDetails.tokenType === 0) {
		txOptions = {
			...txOptions,
			value: tokenAmountBigNum,
		}
	}

	// Call the general function that supports raffles with all tokens
	const batchingArgs = [
		peanutVaultAddress,
		Array(numberOfLinks).fill(linkDetails.tokenAddress),
		Array(numberOfLinks).fill(linkDetails.tokenType),
		amounts,
		tokenIds ? tokenIds : Array(numberOfLinks).fill(0),
		Array(numberOfLinks).fill(pubKey20),
		Array(numberOfLinks).fill(withMFA),
	]
	config.verbose && console.log('Deposit arguments:', batchingArgs)
	const depositTxRequest = await batcherContract.populateTransaction.batchMakeDepositArbitrary(
		...batchingArgs,
		txOptions
	)
	const depositTx = ethersV5ToPeanutTx(depositTxRequest)

	const unsignedTxs: interfaces.IPeanutUnsignedTransaction[] = []
	if (approveTx) unsignedTxs.push(approveTx)
	unsignedTxs.push(depositTx)

	unsignedTxs.forEach((tx) => (tx.from = userAddress))

	return { unsignedTxs }
}

export async function getRaffleLinkFromTx({
	txHash,
	linkDetails,
	password,
	numberOfLinks,
	provider,
	name,
	withMFA,
	withENS = false,
	withCaptcha = false,
	withSignedMessage = false,
	withWeb3Email = false,
	APIKey,
	baseUrl,
}: interfaces.IGetRaffleLinkFromTxParams): Promise<interfaces.IGetRaffleLinkFromTxResponse> {
	const { links } = await getLinksFromTx({
		linkDetails,
		txHash,
		passwords: Array(numberOfLinks).fill(password),
		provider,
	})
	config.verbose && console.log('Links!!', links)
	const link = createMultiLinkFromLinks(links)
	config.verbose && console.log('Got a raffle link!', link)

	await addLinkCreation({
		name,
		link,
		APIKey,
		baseUrl,
		withMFA,
		withCaptcha,
		withENS: withENS,
		withSignedMessage: withSignedMessage,
		withWeb3Email: withWeb3Email,
	})

	return { link }
}

/**
 * Returns a boolean of whether the given address is allowed to
 * claim a slot in the given raffle link.
 * @deprecated pls use getUserRaffleStatus instead
 */
export async function hasAddressParticipatedInRaffle({
	address,
	link,
	APIKey,
	baseUrl,
}: interfaces.IIsAddressEligible): Promise<boolean> {
	const leaderboard = await getRaffleLeaderboard({
		link,
		APIKey,
		baseUrl,
	})

	for (let i = 0; i < leaderboard.length; i++) {
		if (utils.getAddress(address) === utils.getAddress(leaderboard[i].address)) {
			return true // this address has already claimed a slot
		}
	}

	return false
}

export async function getRaffleInfo({
	link,
	APIKey,
	baseUrl = 'https://api.peanut.to/get-raffle-info',
}: interfaces.IGetRaffleInfoParams): Promise<interfaces.IRaffleInfo> {
	// Submit link for informational purposes
	const hashIndex = link.lastIndexOf('#')
	const linkToSubmit = link.substring(0, hashIndex)

	const params = getRawParamsFromLink(link)
	const { address: pubKey } = generateKeysFromString(params.password)

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		pubKey,
		link: linkToSubmit,
		apiKey: APIKey,
	}

	const response = await fetch(baseUrl, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})
	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	}

	const data = await response.json()
	return data.raffleInfo
}

/**
 * Claim a specific slot in a raffle link.
 * Gets the random index to claim from the server.
 */
export async function claimRaffleLink({
	link,
	APIKey,
	recipientAddress,
	recipientName,
	captchaResponse,
	provider,
	baseUrlAuth,
	baseUrlClaim = 'https://api.peanut.to/claim-v2',
}: interfaces.IClaimRaffleLinkParams): Promise<interfaces.IClaimRaffleLinkResponse> {
	const { depositIdx, authorisation } = await getRaffleAuthorisation({
		link,
		APIKey,
		recipientAddress,
		recipientName,
		captchaResponse,
		baseUrl: baseUrlAuth,
	})
	const params = getRawParamsFromLink(link)
	const slotLink = getLinkFromParams(
		params.chainId,
		params.contractVersion,
		depositIdx,
		params.password,
		undefined, // use the default base url
		params.trackId
	)
	const payload = await createClaimPayload(slotLink, recipientAddress)

	let withMFA = false
	if (authorisation) {
		withMFA = true
		payload.claimParams.push(authorisation)
	}

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		claimParams: payload.claimParams,
		chainId: payload.chainId,
		version: payload.contractVersion,
		withMFA,
		apiKey: APIKey,
	}

	const response = await fetch(baseUrlClaim, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})
	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	}

	const data = await response.json()
	const txHash = data.txHash || null
	const slotDetails = await getLinkDetails({ link: slotLink, provider })

	return {
		txHash,
		amountReceived: slotDetails.tokenAmount,
		chainId: slotDetails.chainId,
		tokenAddress: slotDetails.tokenAddress,
		tokenDecimals: slotDetails.tokenDecimals,
		tokenName: slotDetails.tokenName,
		tokenSymbol: slotDetails.tokenSymbol,
	}
}

export async function getRaffleAuthorisation({
	link,
	APIKey,
	captchaResponse,
	recipientAddress,
	recipientName,
	baseUrl = 'https://api.peanut.to/get-authorisation',
}: interfaces.IGetRaffleAuthorisationParams): Promise<interfaces.IGetRaffleAuthorisationResponse> {
	// Submit link for informational purposes
	const hashIndex = link.lastIndexOf('#')
	const linkToSubmit = link.substring(0, hashIndex)

	const params = getRawParamsFromLink(link)
	const { address: pubKey } = generateKeysFromString(params.password)

	recipientName = validateUserName(recipientName) // make sure we trim '' and \n
	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		pubKey,
		link: linkToSubmit,
		captchaResponse,
		recipientAddress,
		recipientName,
		apiKey: APIKey,
	}

	const response = await fetch(baseUrl, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})
	if (!response.ok) {
		const error = (await response.text()).toLowerCase()
		if (error.includes('all slots have already been claimed')) {
			throw new interfaces.SDKStatus(
				interfaces.ERaffleErrorCodes.ALL_SLOTS_ARE_CLAIMED,
				'All slots have already been claimed',
				error
			)
		}
		if (error.includes('captacha is required')) {
			throw new interfaces.SDKStatus(interfaces.ERaffleErrorCodes.CAPTCHA_REQUIRED, 'Captcha is required', error)
		}
		throw new Error(error)
	}

	const data = await response.json()

	return {
		depositIdx: data.depositIdx,
		authorisation: data.authorisation,
	}
}

export async function addLinkCreation({
	name,
	link,
	APIKey,
	withMFA,
	withCaptcha,
	withENS = false,
	withSignedMessage = false,
	withWeb3Email = false,
	baseUrl = 'https://api.peanut.to/submit-raffle-link',
}: interfaces.IAddLinkCreation) {
	// NON CUSTODIAL WOOHOOOOOOO!!!
	const hashIndex = link.lastIndexOf('#')
	const linkToSubmit = link.substring(0, hashIndex)
	config.verbose && console.log({ link, linkToSubmit })

	const params = getRawParamsFromLink(link)
	const { privateKey } = generateKeysFromString(params.password)

	name = validateUserName(name) // make sure we trim '' and \n
	const notNullName = name || ''
	const digest = utils.solidityKeccak256(['string'], [linkToSubmit + notNullName])

	const wallet = new Wallet(privateKey)
	const signature = await wallet.signMessage(digest)

	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			link: linkToSubmit,
			senderName: name,
			signature,
			withMFA,
			withCaptcha,
			withENS,
			withSignedMessage,
			withWeb3Email,
			apiKey: APIKey,
		}),
	})
	if (!res.ok) {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR,
			`Error while submitting a link: ${await res.text()}`
		)
	}
}

export async function getRaffleLeaderboard({
	link,
	APIKey,
	baseUrl = 'https://api.peanut.to/get-raffle-leaderboard',
}: interfaces.IGetRaffleLeaderboard): Promise<interfaces.IRaffleLeaderboardEntry[]> {
	const params = getRawParamsFromLink(link)
	const { address: pubKey } = generateKeysFromString(params.password)

	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			pubKey,
			apiKey: APIKey,
		}),
	})
	if (res.status !== 200) {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR,
			`Error while getting raffle leaderboard: ${await res.text()}`
		)
	}

	const json = await res.json()
	return json.leaderboard
}

export async function getGenerosityLeaderboard({
	baseUrl = 'https://api.peanut.to/get-generosity-leaderboard',
}: interfaces.IGetLeaderboard): Promise<interfaces.IGenerosityLeaderboardEntry[]> {
	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({}),
	})
	if (res.status !== 200) {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR,
			`Error while getting generosity leaderboard: ${await res.text()}`
		)
	}

	const json = await res.json()
	return json.leaderboard
}

export async function getPopularityLeaderboard({
	baseUrl = 'https://api.peanut.to/get-popularity-leaderboard',
}: interfaces.IGetLeaderboard): Promise<interfaces.IPopularityLeaderboardEntry[]> {
	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({}),
	})
	if (res.status !== 200) {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR,
			`Error while getting popularity leaderboard: ${await res.text()}`
		)
	}

	const json = await res.json()
	return json.leaderboard
}

/**
 * @returns:
 * 	- requiresCaptcha boolean
 *  - userResults which is null if the user has not participated yet
 */
export async function getUserRaffleStatus({
	link,
	userAddress,
	APIKey,
	baseUrl = 'https://api.peanut.to/user-raffle-status',
}: interfaces.IGetRaffleLeaderboard): Promise<interfaces.IUserRaffleStatus> {
	const params = getRawParamsFromLink(link)
	const { address: pubKey } = generateKeysFromString(params.password)

	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			pubKey,
			userAddress,
			apiKey: APIKey,
		}),
	})
	if (res.status !== 200) {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR,
			`Error while getting "requires captcha": ${await res.text()}`
		)
	}

	return await res.json()
}

export function generateRaffleClaimMessage(pubKey: string, recipientAddress: string): string {
	return `I confirm that:\n1. I am the owner of wallet ${recipientAddress}\n2. I intend to participate in a raffle with id ${pubKey}`
}
