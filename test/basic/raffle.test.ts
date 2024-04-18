test('get raffle info', async () => {
	const link = 'https://red.peanut.to/packet?c=5000&v=v4.3&i=(33248,5098)&t=mantle#p=7SMDzKEn7ZOwdwPw'
	const info = await getRaffleInfo({ link, APIKey })
	console.log('Raffle info!', info)
}, 120000)

test('generate amounts distribution', async () => {
	const totalAmount = BigNumber.from(1e6)
	const numberOfLinks = 1
	const values = generateAmountsDistribution(totalAmount, numberOfLinks)
	console.log(
		'Values!!',
		values.map((val) => val.toString())
	)
}, 120000)

// Smoke tests of raffle names to see that the sdk adapters work.
// Main testing happens in the api repository.
test('raffle names', async () => {
	// randomise the password to make the link unique in every test
	const p = await getRandomString()
	const link = `https://peanut.to/claim?c=11155111&v=v4.2&i=28,29,30,31,32#p=${p}`

	const address2 = makeRandomAddress()
	const address3 = makeRandomAddress()

	const leaderboard = await getRaffleLeaderboard({
		link,
		APIKey,
	})
	expect(leaderboard).toEqual([
		{
			address: address3,
			amount: '0.078',
			name: null,
		},
		{
			address: address2,
			amount: '0.05',
			name: 'bye-bye',
		},
	])
})

test('hasAddressParticipatedInRaffle', async () => {
	const link =
		'https://red.peanut.to/packet?c=137&v=v4.2&i=637,638,639,640,641,642,643,644,645,646&t=ui#p=rTe4ve5LkxcHbZVb'

	// Manually claimed this link for this address
	const participated1 = await hasAddressParticipatedInRaffle({
		address: '0xa3635c5A3BFb209b5caF76CD4A9CD33De65e2f72',
		link,
		APIKey,
	})
	expect(participated1).toBe(true)

	// New random address, so has to be false
	const participated2 = await hasAddressParticipatedInRaffle({
		address: makeRandomAddress(),
		link,
		APIKey,
	})
	expect(participated2).toBe(false)
})

// test('getGenerosityLeaderboard', async () => {
// 	const leaderboard = await getGenerosityLeaderboard({})
// 	console.log({ leaderboard })
// })

// test('getPopularityLeaderboard', async () => {
// 	const leaderboard = await getPopularityLeaderboard({})
// 	console.log({ leaderboard })
// })

test('bad password', async () => {
	const link =
		'https://red.peanut.to/packet?c=11155111&v=v4.2&i=180,181,182,183,184,185,186,187,188,189&t=ui#p=oJ0gRayKwakXx3KgFFFFFFF'
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
		expect(err.code).toBe(interfaces.ERaffleErrorCodes.ERROR)
		raised = true
	}
	expect(raised).toBe(true)
}, 120000)
