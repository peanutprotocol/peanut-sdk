import PEANUT_CONTRACTS from '../../src/data/contracts.json'
import CHAIN_DETAILS from '../../src/data/chainDetails.json'
import TOKEN_DETAILS from '../../src/data/tokenDetails.json'

// Function to validate that all chains in contracts.json are represented in chainDetails.json and tokenDetails.json
function validateChainRepresentation() {
	const contractChains = Object.keys(PEANUT_CONTRACTS)
	const chainDetailsChains = Object.keys(CHAIN_DETAILS)
	const tokenDetailsChains = TOKEN_DETAILS.map((token) => token.chainId)

	const missingInChainDetails = contractChains.filter((chainId) => !chainDetailsChains.includes(chainId))
	const missingInTokenDetails = contractChains.filter((chainId) => !tokenDetailsChains.includes(chainId))

	return {
		isValid: missingInChainDetails.length === 0 && missingInTokenDetails.length === 0,
		missingInChainDetails,
		missingInTokenDetails,
	}
}

describe('Chain Representation Validation', () => {
	it('should have all chains in contracts.json represented in chainDetails.json and tokenDetails.json', () => {
		const validation = validateChainRepresentation()

		expect(validation.isValid).toBe(true)
		if (!validation.isValid) {
			console.error(`Missing chains in chainDetails.json: ${validation.missingInChainDetails.join(', ')}`)
			console.error(`Missing chains in tokenDetails.json: ${validation.missingInTokenDetails.join(', ')}`)
		}
	})
})
