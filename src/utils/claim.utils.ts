import * as ethers from 'ethersv5'

import * as consts from '../consts'
import * as utils from '../utils'
import * as config from '../config'
import * as data from '../data'
import * as functions from '../functions'
import * as interfaces from '../interfaces'

/**
 * Generates payload to claim the link from peanut vault on the chain where the link was created
 * @param link pure url that was sent to the recipient
 * @param recipientAddress where to send the link's contents
 * @param onlyRecipientMode for v4.2+ peanut only. If true, only the recipient address will be able to perform the withdrawal
 * @returns prepared payload
 */
export async function createClaimPayload(link: string, recipientAddress: string, onlyRecipientMode?: boolean) {
	/* internal utility function to create the payload for claiming a link */
	const params = utils.getParamsFromLink(link)
	const password = params.password
	const keys = utils.generateKeysFromString(password) // deterministically generate keys from password

	// cryptography
	const claimParams = await utils.signWithdrawalMessage(
		params.contractVersion,
		params.chainId,
		functions.getContractAddress(params.chainId, params.contractVersion),
		params.depositIdx,
		recipientAddress,
		keys.privateKey,
		onlyRecipientMode
	)

	return {
		claimParams,
		chainId: params.chainId,
		contractVersion: params.contractVersion,
	}
}

/**
 * Genereates payload to claim the link to a chain different to the chain on which it was created
 * @param param0 all the arguments
 * @returns payload that can be then passed to populateXChainClaimTx to generate a transaction
 */
export async function createClaimXChainPayload({
	isMainnet = true,
	squidRouterUrl, // accepts an entire url to allow integrators to use their own api
	link,
	recipient,
	destinationChainId,
	destinationToken,
	slippage,
}: interfaces.ICreateClaimXChainPayload): Promise<interfaces.IXchainClaimPayload> {
	const linkParams = utils.getParamsFromLink(link)
	const chainId = linkParams.chainId
	const contractVersion = linkParams.contractVersion
	const password = linkParams.password

	if (contractVersion !== 'v4.2') {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR_UNSUPPORTED_CONTRACT_VERSION,
			`Unsupported contract version ${contractVersion}`
		)
	}
	const keys = utils.generateKeysFromString(password)

	const linkDetails = await getLinkDetails({ link: link })
	if (destinationToken === null) destinationToken = linkDetails.tokenAddress
	console.log('destination token', destinationToken)

	// get wei of amount being withdrawn and send as string (e.g. "10000000000000000")
	const tokenAmount = parseFloat(linkDetails.tokenAmount) * Math.pow(10, linkDetails.tokenDecimals)
	config.config.verbose && console.log('Getting squid info..')

	const route = await utils.getSquidRoute({
		squidRouterUrl,
		fromChain: chainId,
		fromToken: linkDetails.tokenAddress,
		fromAmount: String(tokenAmount),
		toChain: destinationChainId,
		toToken: destinationToken,
		fromAddress: recipient,
		toAddress: recipient,
		slippage,
	})

	config.config.verbose && console.log('Squid route calculated :)', { route })

	// cryptography
	const routerContractVersion = 'R' + linkDetails.contractVersion
	const squidAddress = isMainnet ? consts.SQUID_ADDRESS['mainnet'] : consts.SQUID_ADDRESS['testnet']
	const vaultAddress = functions.getContractAddress(linkDetails.chainId, linkDetails.contractVersion)
	const routerAddress = functions.getContractAddress(linkDetails.chainId, routerContractVersion)
	const normalWithdrawalPayload = await createClaimPayload(link, routerAddress, true)

	const routingArgs = [
		'0x1900',
		routerAddress,
		linkDetails.chainId,
		vaultAddress,
		linkDetails.depositIndex,
		squidAddress,
		route.value,
		0, // currently we are not charging any fees
		route.calldata,
	]
	config.config.verbose && console.log('Routing args', routingArgs)

	const packedRoutingData = ethers.utils.solidityPack(
		[
			'bytes2', // 0x1900 as per EIP-191
			'address', // peanut router address
			'uint256', // chain id
			'address', // peanut vault address
			'uint256', // deposit index
			'address', // squid address
			'uint256', // squid fee
			'uint256', // peanut fee
			'bytes', // squid calldata
		],
		routingArgs
	)
	config.config.verbose && console.log('Packed routing data %s', packedRoutingData)

	const xchainDigest = ethers.utils.solidityKeccak256(['bytes'], [packedRoutingData])
	config.config.verbose && console.log('X chain digest', xchainDigest)

	// const signingKey = new SigningKey(keys.privateKey)
	const wallet = new ethers.Wallet(keys.privateKey)
	const routingSignatureRaw = wallet._signingKey().signDigest(ethers.utils.arrayify(xchainDigest))
	const routingSignature = routingSignatureRaw.r + routingSignatureRaw.s.slice(2) + routingSignatureRaw.v.toString(16)
	config.config.verbose && console.log(`Peanut routing signature:`, { routingSignature: routingSignatureRaw })

	// Withdrawal signature is the last element
	const withdrawalSignature = normalWithdrawalPayload.claimParams[normalWithdrawalPayload.claimParams.length - 1]
	const result: interfaces.IXchainClaimPayload = {
		chainId,
		contractVersion: routerContractVersion,
		peanutAddress: vaultAddress,
		depositIndex: linkDetails.depositIndex,
		withdrawalSignature,
		squidFee: route.value,
		peanutFee: ethers.BigNumber.from(0),
		squidData: route.calldata,
		routingSignature,
	}
	config.config.verbose && console.log('XChain Payload finalized. Values: ', result)
	return result
}

/**
 * Gets the details of a Link: what token it is, how much it holds, etc.
 */
export async function getLinkDetails({ link, provider }: interfaces.IGetLinkDetailsParams) {
	config.config.verbose && console.log('getLinkDetails called with link: ', link)
	utils.assert(link, 'link arg is required')

	const params = utils.getParamsFromLink(link)
	const chainId = params.chainId
	const contractVersion = params.contractVersion
	const depositIdx = params.depositIdx
	const password = params.password
	provider = provider || (await functions.getDefaultProvider(chainId))
	// check that chainID and provider network are the same, else console log warning
	const network = await provider.getNetwork()
	if (network.chainId.toString() != chainId) {
		console.warn('WARNING: chainId and provider network are different')
	}
	const contract = await functions.getContract(chainId, provider, contractVersion)

	config.config.verbose && console.log('fetching deposit: ', depositIdx)
	let deposit,
		attempts = 0
	while (!deposit && attempts++ < 5) {
		try {
			deposit = await contract.deposits(depositIdx)
		} catch (error) {
			console.log(`Attempt ${attempts} failed. Retrying...`)
			await new Promise((resolve) => setTimeout(resolve, 500))
		}
	}
	if (!deposit) throw new Error('Failed to fetch deposit after 5 attempts')
	config.config.verbose && console.log('deposit: ', deposit)

	let tokenAddress = deposit.tokenAddress
	const tokenType = deposit.contractType
	const senderAddress = deposit.senderAddress

	let claimed = false
	if (['v2', 'v4'].includes(contractVersion)) {
		if (deposit.pubKey20 == '0x0000000000000000000000000000000000000000') {
			claimed = true
		}
		config.config.verbose && console.log('Pre-4.2 claim checking behaviour, claimed:', claimed)
	} else {
		// v4.2+
		claimed = deposit.claimed
		config.config.verbose && console.log('v4.2+ claim checking behaviour, claimed:', claimed)
	}

	let depositDate: Date | null = null
	if (['v4', 'v4.2'].includes(contractVersion)) {
		if (deposit.timestamp) {
			depositDate = new Date(deposit.timestamp * 1000)
			if (deposit.timestamp == 0) {
				depositDate = null
			}
		} else {
			config.config.verbose && console.log('No timestamp found in deposit for version', contractVersion)
		}
	}

	let tokenAmount = '0'
	let tokenDecimals = null
	let symbol = null
	let name = null
	let tokenURI = null
	let metadata = null

	if (tokenType == interfaces.EPeanutLinkType.native) {
		config.config.verbose && console.log('tokenType is 0, setting tokenAddress to zero address')
		tokenAddress = ethers.constants.AddressZero
	}
	if (tokenType == interfaces.EPeanutLinkType.native || tokenType == interfaces.EPeanutLinkType.erc20) {
		config.config.verbose &&
			console.log('finding token details for token with address: ', tokenAddress, ' on chain: ', chainId)
		const chainDetails = data.TOKEN_DETAILS.find((chain) => chain.chainId === chainId)
		if (!chainDetails) {
			throw new Error("Couldn't find details for this token")
		}

		const tokenDetails = chainDetails.tokens.find(
			(token) => token.address.toLowerCase() === tokenAddress.toLowerCase()
		)

		// If token details not found in TOKEN_DETAILS, fetch them from the contract
		if (!tokenDetails) {
			try {
				const contractERC20 = new ethers.Contract(tokenAddress, data.ERC20_ABI, provider)
				const [fetchedSymbol, fetchedName, fetchedDecimals] = await Promise.all([
					contractERC20.symbol(),
					contractERC20.name(),
					contractERC20.decimals(),
				])
				symbol = fetchedSymbol
				name = fetchedName
				tokenDecimals = fetchedDecimals
				tokenAmount = ethers.utils.formatUnits(deposit.amount, tokenDecimals)
			} catch (error) {
				console.error('Error fetching ERC20 info:', error)
			}
		} else {
			symbol = tokenDetails.symbol
			name = tokenDetails.name
			tokenDecimals = tokenDetails.decimals
			tokenAmount = ethers.utils.formatUnits(deposit.amount, tokenDecimals)
		}
	} else if (tokenType == interfaces.EPeanutLinkType.erc721) {
		try {
			const contract721 = new ethers.Contract(tokenAddress, data.ERC721_ABI, provider)
			const [fetchedName, fetchedSymbol, fetchedTokenURI] = await Promise.all([
				contract721.name(),
				contract721.symbol(),
				contract721.tokenURI(deposit.tokenId),
			])
			name = fetchedName
			symbol = fetchedSymbol
			tokenURI = fetchedTokenURI

			const response = await fetch(tokenURI)
			if (response.ok) {
				metadata = await response.json()
			}
			tokenDecimals = null
		} catch (error) {
			console.error('Error fetching ERC721 info:', error)
		}
		tokenAmount = '1'
	} else if (tokenType == interfaces.EPeanutLinkType.erc1155) {
		try {
			const contract1155 = new ethers.Contract(tokenAddress, data.ERC1155_ABI, provider)
			const fetchedTokenURI = await contract1155.tokenURI(deposit.tokenId)
			tokenURI = fetchedTokenURI

			const response = await fetch(tokenURI)
			if (response.ok) {
				metadata = await response.json()
			}
			name = 'ERC1155 Token (' + deposit.tokenId + ')'
			symbol = '1155'
			tokenDecimals = null
		} catch (error) {
			console.error('Error fetching ERC1155 info:', error)
		}
		tokenAmount = '1'
	}

	// format deposit to string values
	const depositCopy = {}
	for (const key in deposit) {
		if (isNaN(Number(key))) {
			// Only copy named properties
			depositCopy[key] = deposit[key].toString()
		}
	}

	return {
		link: link,
		chainId: chainId,
		depositIndex: depositIdx,
		contractVersion: contractVersion,
		password: password,
		senderAddress: senderAddress,
		tokenType: deposit.contractType,
		tokenAddress: deposit.tokenAddress,
		tokenDecimals: tokenDecimals,
		tokenSymbol: symbol,
		tokenName: name,
		tokenAmount: tokenAmount,
		tokenId: ethers.BigNumber.from(deposit.tokenId).toNumber(),
		claimed: claimed,
		depositDate: depositDate,
		tokenURI: tokenURI,
		metadata: metadata,
		rawOnchainDepositInfo: depositCopy,
	}
}

/**
 * Populates a transaction (value, to, calldata) to claim a link cross-chain
 * @param param0 payload and provider
 * @returns transaction request
 */
export async function populateXChainClaimTx({
	payload,
	provider,
}: interfaces.IPopulateXChainClaimTxParams): Promise<ethers.providers.TransactionRequest> {
	if (!provider) provider = await functions.getDefaultProvider(payload.chainId)
	const contract = await functions.getContract(payload.chainId, provider, payload.contractVersion) // get the contract instance
	const preparedArgs: any[] = [
		payload.peanutAddress,
		payload.depositIndex,
		payload.withdrawalSignature,
		payload.squidFee,
		payload.peanutFee,
		payload.squidData,
		payload.routingSignature,
	]
	let unsignedTx: ethers.providers.TransactionRequest
	try {
		unsignedTx = await contract.populateTransaction.withdrawAndBridge(...preparedArgs)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EXChainStatusCodes.ERROR,
			error,
			'Error making a withdrawAndBridge transaction'
		)
	}
	unsignedTx.value = payload.squidFee
	return unsignedTx
}

export function calculateCombinedPayloadHash(transactionRequest, recipient) {
	const squidDataHash = ethers.utils.solidityKeccak256(['address'], [transactionRequest.data])

	// Combine into an single block and hash again
	const combinedPayload = ethers.utils.solidityPack(
		['address', 'address', 'bytes32', 'uint256'],
		[recipient, transactionRequest.targetAddress, squidDataHash, transactionRequest.value]
	)

	const hash1 = ethers.utils.solidityKeccak256(['address'], [combinedPayload])
	console.log('hash1: ', hash1)

	return utils.solidityHashBytesEIP191(ethers.utils.arrayify(hash1))
}

export async function getAllUnclaimedDepositsWithIdxForAddress({
	address,
	chainId,
	peanutContractVersion,
	provider = null,
	claimedOnly = true,
}: interfaces.IGetAllUnclaimedDepositsWithIdxForAddressParams): Promise<any[]> {
	if (provider == null) {
		provider = await functions.getDefaultProvider(chainId)
	}

	if (!['v4', 'v4.2'].includes(peanutContractVersion)) {
		console.error('ERROR: can only return unclaimed deposits for v4+ contracts')
		return
	}

	config.config.verbose &&
		console.log(
			'getAllUnclaimedDepositsWithIdxForAddress called with address: ',
			address,
			' on chainId: ',
			chainId,
			' at peanutContractVersion: ',
			peanutContractVersion
		)

	const contract = await functions.getContract(chainId, provider, peanutContractVersion) // get the contract instance

	let addressDeposits = (await contract.getAllDepositsForAddress(address)).map((deposit: any) => {
		return {
			pubKey20: deposit.pubKey20,
			amount: deposit.amount,
			tokenAddress: deposit.tokenAddress,
			contractType: deposit.contractType,
			claimed: deposit.claimed,
			timestamp: deposit.timestamp,
			senderAddress: deposit.senderAddress,
		}
	}) // get all address deposits

	// filter out deposits not made by the address
	addressDeposits = addressDeposits.filter((deposit: any) => {
		return deposit.senderAddress.toString() == address.toString()
	})

	config.config.verbose && console.log('all deposits made by address: ', addressDeposits)

	if (claimedOnly) {
		addressDeposits = addressDeposits.filter((transaction) => {
			const amount = BigInt(transaction.amount._hex)
			return !transaction.claimed && amount > BigInt(0)
		})
		config.config.verbose && console.log('all unclaimed deposits made by address: ', addressDeposits)
	} // filter out claimed deposits

	const mappedDeposits = (await contract.getAllDeposits()).map((deposit: any) => {
		return {
			pubKey20: deposit.pubKey20,
			amount: deposit.amount,
			tokenAddress: deposit.tokenAddress,
			contractType: deposit.contractType,
			claimed: deposit.claimed,
			timestamp: deposit.timestamp,
			senderAddress: deposit.senderAddress,
		}
	}) // get all deposits to map idxs

	mappedDeposits.map((deposit: any, idx) => {
		addressDeposits.map((addressDeposit: any) => {
			if (utils.compareDeposits(deposit, addressDeposit)) {
				addressDeposit.idx = idx
			}
		})
	}) // map the idxs from all deposits to the address deposits

	config.config.verbose && console.log('all deposits by address with idx', addressDeposits)

	return addressDeposits
}

// Returns args to be passed to makeDepositWithAuthorization function
// and a EIP-712 message to be signed
export async function makeGaslessDepositPayload({
	address,
	contractVersion,
	linkDetails,
	password,
}: interfaces.IPrepareGaslessDepositParams): Promise<interfaces.IMakeGaslessDepositPayloadResponse> {
	if (!consts.PeanutsWithEIP3009.includes(contractVersion)) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: this Peanut version does not support gasless deposits'
		)
	}

	if (linkDetails.tokenType !== interfaces.EPeanutLinkType.erc20) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: only erc20 tokens are currently supported for gasless deposits'
		)
	}

	if (!linkDetails.tokenAddress || !linkDetails.tokenDecimals) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: token address and decimals must be provided'
		)
	}

	const chain3009Info = utils.toLowerCaseKeys(consts.EIP3009Tokens[linkDetails.chainId])
	if (!chain3009Info) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: there are no known EIP-3009 compliant tokens on this chain'
		)
	}

	const tokenDomain = chain3009Info[linkDetails.tokenAddress.toLowerCase()]

	if (!tokenDomain) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: token with the given address does not support EIP-3009'
		)
	}

	const peanutContract = await functions.getContract(linkDetails.chainId, null, contractVersion)
	const uintAmount = ethers.utils.parseUnits(linkDetails.tokenAmount.toString(), linkDetails.tokenDecimals)
	const randomNonceInt = Math.floor(Math.random() * 1e12)
	const randomNonceHex = '0x' + randomNonceInt.toString(16).padStart(64, '0')

	const { address: pubKey20 } = utils.generateKeysFromString(password)
	const nonceWithPubKeyHex = ethers.utils.solidityKeccak256(['address', 'bytes32'], [pubKey20, randomNonceHex])

	const nowSeconds = Math.floor(Date.now() / 1000)
	const validAfter = ethers.BigNumber.from(nowSeconds)
	const validBefore = validAfter.add(3600) // valid for 1 hour

	const payload: interfaces.IGaslessDepositPayload = {
		chainId: linkDetails.chainId,
		contractVersion: contractVersion,
		tokenAddress: linkDetails.tokenAddress,
		from: address,
		uintAmount,
		pubKey20,
		nonce: randomNonceHex, // nonce without pubkey. Pubkey will be added inside the peanut contract
		validAfter,
		validBefore,
	}

	const message: interfaces.IPreparedEIP712Message = {
		types: consts.ReceiveWithAuthorizationTypes,
		primaryType: 'ReceiveWithAuthorization',
		domain: tokenDomain,
		values: {
			from: address,
			to: peanutContract.address,
			value: uintAmount,
			validAfter,
			validBefore,
			nonce: nonceWithPubKeyHex, // nonce WITH the pubkey. This is what the user will sign
		},
	}

	return { payload, message }
}

export async function prepareGaslessDepositTx({
	provider,
	payload,
	signature,
}: interfaces.IPrepareGaslessDepositTxParams): Promise<ethers.providers.TransactionRequest> {
	if (!provider) provider = await functions.getDefaultProvider(payload.chainId)

	const contract = await functions.getContract(payload.chainId, provider, payload.contractVersion) // get the contract instance
	const puresig = signature.slice(2) // remove 0x prefix
	const preparedPayload: any[] = [
		payload.tokenAddress,
		payload.from,
		payload.uintAmount,
		payload.pubKey20,
		payload.nonce,
		payload.validAfter,
		payload.validBefore,
		ethers.BigNumber.from(`0x${puresig.slice(64 * 2)}`), // v
		`0x${puresig.slice(0, 32 * 2)}`, // r
		`0x${puresig.slice(32 * 2, 64 * 2)}`, // s
	]
	let unsignedTx: ethers.providers.TransactionRequest
	try {
		unsignedTx = await contract.populateTransaction.makeDepositWithAuthorization(...preparedPayload)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
			error,
			'Error making the deposit to the contract'
		)
	}
	return unsignedTx
}

// Returns args to be passed to withdrawDepositSenderGasless function
// and a EIP-712 message to be signed
export async function makeGaslessReclaimPayload({
	address,
	contractVersion,
	depositIndex,
	chainId,
}: interfaces.IMakeGaslessReclaimPayloadParams): Promise<interfaces.IMakeGaslessReclaimPayloadResponse> {
	if (!consts.PeanutsWithGaslessRevoke.includes(contractVersion)) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_VALIDATING_LINK_DETAILS,
			'Error validating link details: this Peanut version does not support gasless revocations'
		)
	}
	const peanutVault = await functions.getContract(chainId, null, contractVersion)

	const payload: interfaces.IGaslessReclaimPayload = {
		chainId: chainId,
		contractVersion: contractVersion,
		depositIndex,
		signer: address,
	}

	const peanutDomain: interfaces.EIP712Domain = {
		chainId,
		name: 'Peanut',
		version: contractVersion.slice(1), // contract version without 'v'
		verifyingContract: peanutVault.address,
	}

	const message: interfaces.IPreparedEIP712Message = {
		types: consts.GaslessReclaimTypes,
		primaryType: 'GaslessReclaim',
		domain: peanutDomain,
		values: {
			depositIndex,
		},
	}

	return { payload, message }
}

/**
 * Makes a gasless eip-3009 deposit through Peanut API
 */
export async function makeDepositGasless({
	APIKey,
	baseUrl = 'https://api.peanut.to/deposit-3009',
	payload,
	signature,
}: interfaces.IMakeDepositGaslessParams) {
	config.config.verbose && console.log('depositing gaslessly through Peanut API...')
	config.config.verbose && console.log('payload: ', payload)

	const headers = {
		'Content-Type': 'application/json',
	}
	const body = {
		apiKey: APIKey,
		chainId: payload.chainId,
		contractVersion: payload.contractVersion,
		tokenAddress: payload.tokenAddress,
		from: payload.from,
		uintAmount: payload.uintAmount.toString(),
		pubKey20: payload.pubKey20,
		nonce: payload.nonce,
		validAfter: payload.validAfter.toString(),
		validBefore: payload.validBefore.toString(),
		signature,
	}

	// if axios error, return the error message

	const response = await fetch(baseUrl, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	})

	config.config.verbose && console.log('response status: ', response.status)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(error)
	} else {
		return await response.json()
	}
}

export async function prepareGaslessReclaimTx({
	provider,
	payload,
	signature,
}: interfaces.IPrepareGaslessReclaimTxParams): Promise<ethers.providers.TransactionRequest> {
	if (!provider) provider = await functions.getDefaultProvider(payload.chainId)

	const contract = await functions.getContract(payload.chainId, provider, payload.contractVersion) // get the contract instance
	const preparedPayload: any[] = [[payload.depositIndex], payload.signer, signature]
	console.log('Prepared payload', { preparedPayload })
	let unsignedTx: ethers.providers.TransactionRequest
	try {
		unsignedTx = await contract.populateTransaction.withdrawDepositSenderGasless(...preparedPayload)
	} catch (error) {
		throw new interfaces.SDKStatus(
			interfaces.EPrepareCreateTxsStatusCodes.ERROR_MAKING_DEPOSIT,
			error,
			'Error making a gasless reclaim'
		)
	}
	return unsignedTx
}
