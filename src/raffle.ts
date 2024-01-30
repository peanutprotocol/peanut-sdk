import { BigNumber, constants, ethers, utils } from "ethersv5"
import { ERC20_ABI, LATEST_STABLE_BATCHER_VERSION, TOKEN_DETAILS } from "./data"
import { createMultiLinkFromLinks, ethersV5ToPeanutTx, generateKeysFromString, getContract, getContractAddress, getDefaultProvider, getLatestContractVersion, getLinksFromMultilink, getLinksFromTx, getParamsFromLink, interfaces, prepareApproveERC20Tx, trim_decimal_overflow } from "."

function generateAmountsDistribution(totalAmount: BigNumber, numberOfLinks: number): BigNumber[] {
  const values: BigNumber[] = []

  for (let i = 0; i < numberOfLinks - 1; i++) {
    const random = Math.random() // generate a random value

    // multiplier to be used with BigNumber. 1e9 is the precision
    const mult = BigNumber.from(Math.floor(random * 1e9))

    // calculate the value
    const value = totalAmount.mul(mult).div(BigNumber.from(1e9))

    values.push(value)
    totalAmount = totalAmount.sub(value)
  }

  // push the remaining amount as is so that the sum adds up to totalAmount
  values.push(totalAmount)

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
      provider,
    )
  }

  const peanutVaultAddress = getContractAddress(linkDetails.chainId, peanutContractVersion)
  const { address: pubKey20 } = generateKeysFromString(password)
  const amounts = generateAmountsDistribution(tokenAmountBigNum, numberOfLinks)
  console.log('Requested amount:', tokenAmountBigNum.toString())
  console.log('Got amounts:', amounts.map((am) => am.toString()))

  const depositParams = [
    peanutVaultAddress,
    linkDetails.tokenAddress,
    linkDetails.tokenType,
    amounts,
    pubKey20,
  ]

  let txOptions: interfaces.ITxOptions = {}
  if (linkDetails.tokenType === 0) {
    txOptions = {
      ...txOptions,
      value: tokenAmountBigNum,
    }
  }

  const batcherContract = await getContract(linkDetails.chainId, provider, batcherContractVersion)
  const depositTxRequest = await batcherContract.populateTransaction.batchMakeDepositRaffle(...depositParams, txOptions)
  const depositTx = ethersV5ToPeanutTx(depositTxRequest)

  let unsignedTxs: interfaces.IPeanutUnsignedTransaction[] = []
  if (approveTx) unsignedTxs.push(approveTx)
  unsignedTxs.push(depositTx)

  unsignedTxs.forEach((tx) => tx.from = userAddress)

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

export async function getRaffleInfo({
  link
}: interfaces.IGetRaffleInfoParams): Promise<interfaces.IRaffleInfo> {
  // const links = getLinksFromMultilink(link)
  const links = [
    'https://peanut.to/claim?c=11155111&v=v4.2&i=0#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=1#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=2#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=3#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=4#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=5#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=6#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=7#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=8#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=9#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=10#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=11#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=12#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=13#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=14#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=15#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=16#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=17#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=18#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=19#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=20#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=21#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=22#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=23#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=24#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=25#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=26#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=27#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=28#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=29#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=30#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=31#p=12345678',
    'https://peanut.to/claim?c=11155111&v=v4.2&i=32#p=12345678',
  ]

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
  const deposits: interfaces.IPeanutV4_2Deposit[] = await Promise.all(depositIndices.map((idx) => contract.deposits(idx)))
  console.log('Deposit!!', deposits[0])

  const tokenAddress = deposits[0].tokenAddress
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

  const slotsDetails: interfaces.IRaffleSlot[] = deposits.map((deposit) => ({
    amount: ethers.utils.formatUnits(deposit.amount, tokenDecimals),
    claimed: deposit.claimed,
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

/**
 * Find an unclaimed slot in a raffle link and claim it!
 * @param param0 
 */
export async function claimRaffleLink({

}) {

}
