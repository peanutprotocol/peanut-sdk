import { Wallet } from 'ethersv5'
import { getDefaultProvider, interfaces, prepareRaffleDepositTxs, signAndSubmitTx, toggleVerbose } from '../../src/index'
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY!

describe('raffle', () => {
  toggleVerbose(true)

  test('prepareRaffleDepositTxs', async () => {
    const chainId = '137'
    const provider = await getDefaultProvider(chainId)
    const wallet = new Wallet(TEST_WALLET_PRIVATE_KEY, provider)

    const linkDetails: interfaces.IPeanutLinkDetails = {
      chainId,
      tokenAmount: 0.1,
      tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      tokenDecimals: 6,
      tokenType: 1,
    }
    const { unsignedTxs } = await prepareRaffleDepositTxs({
      linkDetails,
      numberOfLinks: 5,
      password: '12345678',
      userAddress: wallet.address,
    })

    console.log({ unsignedTxs })

    for (let i = 0; i < unsignedTxs.length; i++) {
      const { tx, txHash } = await signAndSubmitTx({
        structSigner: {
          signer: wallet,
        },
        unsignedTx: unsignedTxs[i]
      })
      console.log('Submitted raffle tx with hash:', txHash)
      await tx.wait()
    }
  }, 120000)
})