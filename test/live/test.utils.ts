export async function waitForTransaction(provider, txHash, timeout = 60000) {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		const receipt = await provider.getTransactionReceipt(txHash) // v5/v6?
		if (receipt && receipt.blockNumber) {
			return receipt
		}
		await new Promise((res) => setTimeout(res, 1000)) // Wait for 1 second before retrying
	}

	throw new Error('Transaction was not confirmed within the timeout period.')
}

export function getRandomDistinctValues<T>(arr: T[]): T[] {
	if (arr.length < 2) {
		throw new Error('Array must have at least two distinct elements')
	}

	let index1 = Math.floor(Math.random() * arr.length)
	let index2 = Math.floor(Math.random() * arr.length)

	while (index2 === index1) {
		index2 = Math.floor(Math.random() * arr.length)
	}

	return [arr[index1], arr[index2]]
}
