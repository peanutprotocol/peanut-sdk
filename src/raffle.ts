import { BigNumber, Wallet, constants, ethers, utils } from 'ethersv5'
import {
	config,
	createClaimPayload,
	createMultiLinkFromLinks,
	ethersV5ToPeanutTx,
	generateKeysFromString,
	getContract,
	getContractAddress,
	getDefaultProvider,
	getLinkDetails,
	getLinkFromParams,
	getLinksFromMultilink,
	getLinksFromTx,
	getParamsFromLink,
	interfaces,
	prepareApproveERC20Tx,
	trim_decimal_overflow,
} from '.'
import { TransactionRequest } from '@ethersproject/abstract-provider'

export function generateAmountsDistribution(totalAmount: BigNumber, numberOfLinks: number): BigNumber[] {
	const randoms: number[] = []
	let randomsSum = 0
	for (let i = 0; i < numberOfLinks; i++) {
		let value = Math.random()
		value += 0.05 // communism - make sure that everyone gets a reasonable amount
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
	password,
	withMFA,
	provider,
}: interfaces.IPrepareRaffleDepositTxsParams): Promise<interfaces.IPrepareDepositTxsResponse> {
	if (linkDetails.tokenDecimals === null || linkDetails.tokenDecimals === undefined) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Please pass tokenDecimals to prepareRaffleDepositTxs'
		)
	}

	if (linkDetails.tokenType === null || linkDetails.tokenType === undefined) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Please pass tokenType to prepareRaffleDepositTxs'
		)
	}

	if ([0, 1].includes(linkDetails.tokenType) === false) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Only ERC20 deposits are supported by prepareRaffleDepositTxs'
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

	if (linkDetails.tokenAmount === 0) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Amount must be greater than zero in prepareRaffleDepositTxs'
		)
	}

	if (numberOfLinks < 2) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'numberOfLinks must be at least 2 in prepareRaffleDepositTxs'
		)
	}

	// For simplicity doing raffles always on these contracts
	const peanutContractVersion = 'v4.3'
	const batcherContractVersion = 'Bv4.3'

	if (!provider) {
		provider = await getDefaultProvider(linkDetails.chainId)
	}
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
			-1, // decimals doesn't matter
			true, // already a prepared bignumber
			batcherContractVersion,
			provider
		)
	}

	const { address: pubKey20 } = generateKeysFromString(password)
	const amounts = generateAmountsDistribution(tokenAmountBigNum, numberOfLinks)
	console.log('Requested amount:', tokenAmountBigNum.toString())
	console.log(
		'Got amounts:',
		amounts.map((am) => am.toString())
	)

	const depositParams = [peanutVaultAddress, linkDetails.tokenAddress, linkDetails.tokenType, amounts, pubKey20]

	let txOptions: interfaces.ITxOptions = {}
	if (linkDetails.tokenType === 0) {
		txOptions = {
			...txOptions,
			value: tokenAmountBigNum,
		}
	}

	let depositTxRequest: TransactionRequest
	if (withMFA) {
		depositTxRequest = await batcherContract.populateTransaction.batchMakeDepositRaffleMFA(
			...depositParams,
			txOptions
		)
	} else {
		depositTxRequest = await batcherContract.populateTransaction.batchMakeDepositRaffle(
			...depositParams,
			txOptions
		)
	}
	const depositTx = ethersV5ToPeanutTx(depositTxRequest)

	let unsignedTxs: interfaces.IPeanutUnsignedTransaction[] = []
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
	withCaptcha,
	APIKey,
	baseUrl,
}: interfaces.IGetRaffleLinkFromTxParams): Promise<interfaces.IGetRaffleLinkFromTxResponse> {
	const { links } = await getLinksFromTx({
		linkDetails,
		txHash,
		passwords: Array(numberOfLinks).fill(password),
		provider,
	})
	console.log('Links!!', links)

	const link = createMultiLinkFromLinks(links)

	try {
		await addLinkCreation({
			name,
			link,
			withMFA,
			withCaptcha,
			APIKey,
			baseUrl,
		})
	} catch (error: any) {
		console.error(
			'Bad that we got an error from the events api, but not stopping the entire link creation because of this',
			error
		)
	}

	return { link }
}

/**
 * Throws an error if the provided raffle link is invalid.
 */
export function validateRaffleLink({ link }: interfaces.IValidateRaffleLink) {
	const links = getLinksFromMultilink(link)

	const linksParams: interfaces.ILinkParams[] = []
	links.forEach((link) => linksParams.push(getParamsFromLink(link)))

	const chainId = linksParams[0].chainId
	const contractVersion = linksParams[0].contractVersion
	const password = linksParams[0].password
	const trackId = linksParams[0].trackId

	if (chainId === '' || contractVersion === '' || password === '')
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR_VALIDATING_LINK_DETAILS,
			`chainId, contractVersion or password is empty for raffle link ${link}`
		)

	linksParams.forEach((params) => {
		if (
			// must be the same for all links
			params.chainId !== chainId ||
			params.contractVersion !== contractVersion ||
			params.password !== password ||
			params.trackId !== trackId
		)
			throw new interfaces.SDKStatus(
				interfaces.ERaffleErrorCodes.ERROR_VALIDATING_LINK_DETAILS,
				`chainId, contractVersion, password or trackId is not consistent for raffle link ${link}`
			)
	})

	// deposit indices must be sequential
	let prevDepositIndex = linksParams[0].depositIdx
	linksParams.slice(1).forEach((params) => {
		if (params.depositIdx !== prevDepositIndex + 1)
			throw new interfaces.SDKStatus(
				interfaces.ERaffleErrorCodes.ERROR_VALIDATING_LINK_DETAILS,
				`deposit indices are not sequential for raffle link ${link}`
			)
		prevDepositIndex = params.depositIdx
	})

	return true
}

/**
 * Returns a boolean of whether the given address is allowed to
 * claim a slot in the given raffle link.
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
	const allSlotLinks = getLinksFromMultilink(link)
	const params = getParamsFromLink(allSlotLinks[0])
	const { address: pubKey } = generateKeysFromString(params.password)

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		pubKey,
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
	baseUrlClaim,
}: interfaces.IClaimRaffleLinkParams): Promise<interfaces.IClaimRaffleLinkResponse> {
	const { depositIdx, authorisation } = await getRaffleAuthorisation({
		link,
		APIKey,
		recipientAddress,
		recipientName,
		captchaResponse,
		baseUrl: baseUrlAuth,
	})
	const allSlotLinks = getLinksFromMultilink(link)
	const params = getParamsFromLink(allSlotLinks[0])
	const slotLink = getLinkFromParams(
		params.chainId,
		params.contractVersion,
		depositIdx,
		params.password,
		undefined, // use the default base url
		params.trackId,
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
	baseUrl = 'https://api.peanut.to/get-authorisation'
}: interfaces.IGetRaffleAuthorisationParams): Promise<interfaces.IGetRaffleAuthorisationResponse> {
	const allSlotLinks = getLinksFromMultilink(link)
	const params = getParamsFromLink(allSlotLinks[0])
	const { address: pubKey } = generateKeysFromString(params.password)

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		pubKey,
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
		const error = await response.text()
		if (error.includes('All slots have already been claimed')) {
			throw new interfaces.SDKStatus(
				interfaces.ERaffleErrorCodes.ALL_SLOTS_ARE_CLAIMED,
				'All slots have already been claimed',
			)
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
	baseUrl = 'https://api.peanut.to/submit-raffle-link',
}: interfaces.IAddLinkCreation) {
	// NON CUSTODIAL WOOHOOOOOOO!!!
	const hashIndex = link.lastIndexOf('#')
	const linkToSubmit = link.substring(0, hashIndex)
	config.verbose && console.log({ link, linkToSubmit })

	const allSlotLinks = getLinksFromMultilink(link)
	const params = getParamsFromLink(allSlotLinks[0])
	const { privateKey } = generateKeysFromString(params.password)

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
	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			link,
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

export async function requiresRaffleCaptcha({
	link,
	APIKey,
	baseUrl = 'https://api.peanut.to/requires-captcha',
}: interfaces.IGetRaffleLeaderboard): Promise<boolean> {
	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			link,
			apiKey: APIKey,
		}),
	})
	if (res.status !== 200) {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR,
			`Error while getting "requires captcha": ${await res.text()}`
		)
	}

	const json = await res.json()
	return json.requiresCaptcha
}
