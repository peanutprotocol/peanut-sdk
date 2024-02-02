import { BigNumber, constants, ethers } from 'ethersv5'
import { ERC20_ABI, TOKEN_DETAILS } from './data'
import {
	claimLinkGasless,
	createMultiLinkFromLinks,
	ethersV5ToPeanutTx,
	generateKeysFromString,
	getContract,
	getContractAddress,
	getDefaultProvider,
	getLinksFromMultilink,
	getLinksFromTx,
	getParamsFromLink,
	interfaces,
	prepareApproveERC20Tx,
	trim_decimal_overflow,
} from '.'

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

	// For simplicity doing raffles always on these contracts
	const peanutContractVersion = 'v4.2'
	const batcherContractVersion = 'Bv4.2'

	if (!provider) {
		provider = await getDefaultProvider(linkDetails.chainId)
	}

	const tokenAmountString = trim_decimal_overflow(linkDetails.tokenAmount, linkDetails.tokenDecimals)
	const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, linkDetails.tokenDecimals)
	const peanutVaultAddress = getContractAddress(linkDetails.chainId, peanutContractVersion)

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

	const batcherContract = await getContract(linkDetails.chainId, provider, batcherContractVersion)
	const depositTxRequest = await batcherContract.populateTransaction.batchMakeDepositRaffle(
		...depositParams,
		txOptions
	)
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
}: interfaces.IGetRaffleLinkFromTxParams): Promise<interfaces.IGetRaffleLinkFromTxResponse> {
	const { links } = await getLinksFromTx({
		linkDetails,
		txHash,
		passwords: Array(numberOfLinks).fill(password),
	})
	console.log('Links!!', links)

	const link = createMultiLinkFromLinks(links)
	return { link }
}

export async function getRaffleInfo({ link }: interfaces.IGetRaffleInfoParams): Promise<interfaces.IRaffleInfo> {
	const links = getLinksFromMultilink(link)

	const linksParams: interfaces.ILinkParams[] = []
	links.forEach((link) => linksParams.push(getParamsFromLink(link)))

	const chainId = linksParams[0].chainId
	const peanutVersion = linksParams[0].contractVersion
	const depositIndices: number[] = []
	linksParams.forEach((params) => depositIndices.push(params.depositIdx))

	// TODO: add more validation (check that chain is the same for all links, version is the same, etc.)
	if (peanutVersion !== 'v4.2') {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Raffles only work with peanut contract v4.2'
		)
	}

	const contract = await getContract(chainId, null, peanutVersion)
	const deposits: interfaces.IPeanutV4_2Deposit[] = await Promise.all(
		depositIndices.map((idx) => contract.deposits(idx))
	)
	const contractType = deposits[0].contractType
	console.log('Deposit!!', deposits[0])

	let tokenAddress = deposits[0].tokenAddress
	if (contractType == interfaces.EPeanutLinkType.native) {
		tokenAddress = ethers.constants.AddressZero
	}
	let tokenSymbol: string = null
	let tokenName: string = null
	let tokenDecimals: number = null

	const allTokenDetails = TOKEN_DETAILS.find((chain) => chain.chainId === chainId)
	const tokenDetails = allTokenDetails.tokens.find(
		(token) => token.address.toLowerCase() === tokenAddress.toLowerCase()
	)

	const provider = await getDefaultProvider(chainId)
	if (!tokenDetails) {
		// Has to be a ERC20 token since native tokens are all listed in tokenDetails.json
		try {
			const contractERC20 = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
			const [fetchedSymbol, fetchedName, fetchedDecimals] = await Promise.all([
				contractERC20.symbol(),
				contractERC20.name(),
				contractERC20.decimals(),
			])
			tokenSymbol = fetchedSymbol
			tokenName = fetchedName
			tokenDecimals = fetchedDecimals
		} catch (error) {
			console.error('Error fetching ERC20 info:', error)
			throw new Error(`Ertor fetching ERC20 info for token ${tokenAddress} on chain ${chainId}`)
		}
	} else {
		tokenSymbol = tokenDetails.symbol
		tokenName = tokenDetails.name
		tokenDecimals = tokenDetails.decimals
	}

	const slotsDetails: interfaces.IRaffleSlot[] = deposits.map((deposit, index) => ({
		amount: ethers.utils.formatUnits(deposit.amount, tokenDecimals),
		claimed: deposit.claimed,
		_slotlink: links[index],
		_depositIndex: depositIndices[index],
	}))

	return {
		chainId,
		tokenAddress,
		tokenSymbol,
		tokenName,
		tokenDecimals,
		slotsDetails,
	}
}

export async function isRaffleActive({ link }: interfaces.IGetRaffleInfoParams): Promise<boolean> {
	const { slotsDetails } = await getRaffleInfo({ link })
	const allClaimed = slotsDetails.every((slot) => slot.claimed)
	return !allClaimed
}

/**
 * Find an unclaimed slot in a raffle link and claim it!
 * @param param0
 */
export async function claimRaffleLink({
	link,
	APIKey,
	recipientAddress,
	recipientName,
	baseUrl
}: interfaces.IClaimRaffleLinkParams): Promise<interfaces.IClaimRaffleLinkResponse> {
	// attempt to claim an unclaimed slot until we do or
	// all slots end up to be claimed by other people
	while (true) {
		const raffleInfo = await getRaffleInfo({ link })
		const { chainId, tokenAddress, tokenDecimals, tokenName, tokenSymbol } = raffleInfo
		const unclaimedSlots = raffleInfo.slotsDetails.filter((slot) => !slot.claimed)
		if (unclaimedSlots.length === 0) {
			throw new interfaces.SDKStatus(
				interfaces.ERaffleErrorCodes.ALL_SLOTS_ARE_CLAIMED,
				'All slots have already been claimed for this raffle'
			)
		}

		const slotIndexToClaim = Math.floor(Math.random() * 1e9) % unclaimedSlots.length
		console.log(
			`Attempting to claim slot ${slotIndexToClaim} out of total ${unclaimedSlots.length} unclaimed slots, slotlink: ${unclaimedSlots[slotIndexToClaim]._slotlink}`
		)

		let response
		try {
			response = await claimLinkGasless({
				link: unclaimedSlots[slotIndexToClaim]._slotlink,
				APIKey,
				recipientAddress,
			})
		} catch (error: any) {
			console.log('An error occurred while claiming a raffle slot, will retry claiming a different slot', error)
			continue
		}

		if (response.error || !response.txHash) {
			console.log(
				'Got an error from the relayer while claiming a raffle slot, will retry claiming a different slot',
				response.error
			)
			continue
		}

		await addLinkClaim({
			claimerAddress: recipientAddress,
			name: recipientName,
			amount: unclaimedSlots[slotIndexToClaim].amount,
			depositIndex: unclaimedSlots[slotIndexToClaim]._depositIndex,
			link,
			APIKey,
			baseUrl,
		})

		return {
			txHash: response.txHash,
			chainId,
			amountReceived: unclaimedSlots[slotIndexToClaim].amount,
			tokenAddress,
			tokenDecimals,
			tokenName,
			tokenSymbol,
		}
	}
}

export async function addUsername({
	address,
	name,
	link,
	APIKey,
	baseUrl = 'https://api.peanut.to/add-username'
}: interfaces.IAddUsername) {
	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			address,
			name,
			link,
			apiKey: APIKey,
		}),
	})
	if (res.status !== 200) {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR,
			`Error while adding a username: ${await res.text()}`
		)
	}
}

export async function getUsername({
	address,
	link,
	APIKey,
	baseUrl = 'https://api.peanut.to/get-username'
}: interfaces.IGetUsername): Promise<string> {
	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			address,
			link,
			apiKey: APIKey,
		}),
	})
	if (res.status !== 200) {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR,
			`Error while getting a username: ${await res.text()}`
		)
	}

	const json = await res.json()
	return json.name
}

export async function addLinkClaim({
	claimerAddress,
	name,
	depositIndex,
	amount,
	link,
	APIKey,
	baseUrl = 'https://api.peanut.to/add-link-claim'
}: interfaces.IAddLinkClaim) {
	const res = await fetch(baseUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			claimerAddress,
			name,
			depositIndex,
			amount,
			link,
			apiKey: APIKey,
		}),
	})
	if (res.status !== 200) {
		throw new interfaces.SDKStatus(
			interfaces.ERaffleErrorCodes.ERROR,
			`Error while adding a claim: ${await res.text()}`
		)
	}
}

export async function getRaffleLeaderboard({
	link,
	APIKey,
	baseUrl = 'https://api.peanut.to/get-raffle-leaderboard'
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
			`Error while adding a claim: ${await res.text()}`
		)
	}

	const json = await res.json()
	return json.leaderboard
}
