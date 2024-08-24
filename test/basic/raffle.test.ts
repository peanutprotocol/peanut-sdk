import { BigNumber } from 'ethersv5'
import { generateAmountsDistribution, claimRaffleLink, interfaces } from '../../src'
import { makeRandomAddress } from '../util'
import dotenv from 'dotenv'
dotenv.config()

const APIKey = process.env.PEANUT_DEV_API_KEY!

describe('raffle', () => {
	test('generate amounts distribution', async () => {
		const totalAmount = BigNumber.from(1e6)
		const numberOfLinks = 1
		const values = generateAmountsDistribution(totalAmount, numberOfLinks)
		console.log(
			'Values!!',
			values.map((val) => val.toString())
		)
		expect(values).toBeDefined()
	}, 120000)

	test('bad password', async () => {
		const link = 'https://peanut.to/raffle/claim?c=137&v=v4.3&t=ui#p=mCWD0Ryu9duTMxZ8'
		let raised = false
		try {
			await claimRaffleLink({
				link,
				APIKey,
				recipientAddress: makeRandomAddress(),
			})
		} catch (error: any) {
			console.log('Got error!', error)
			const err: interfaces.SDKStatus = error
			console.log(err)
			expect(err.message).toEqual('{"error":"this raffle link is not known to the server"}')
			raised = true
		}
		expect(raised).toBe(true)
	}, 120000)
})
