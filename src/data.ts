import PEANUT_ABI_V4 from './data/peanutAbiV4.json'
import PEANUT_ABI_V4_2 from './data/peanutAbiV4.2.json'
import PEANUT_ABI_V4_3 from './data/peanutAbiV4.3.json'
import PEANUT_ABI_V4_4 from './data/peanutAbiV4.4.json'
import PEANUT_BATCHER_ABI_V4 from './data/peanutBatcherV4.json'
import PEANUT_BATCHER_ABI_V4_2 from './data/peanutBatcherV4.2.json'
import PEANUT_BATCHER_ABI_V4_3 from './data/peanutBatcherV4.3.json'
import PEANUT_BATCHER_ABI_V4_4 from './data/peanutBatcherV4.4.json'
import PEANUT_ROUTER_ABI_V4_2 from './data/peanutRouterAbiV4.2.json'
import ERC20_ABI from './data/erc20abi.json'
import ERC721_ABI from './data/erc721abi.json'
import ERC1155_ABI from './data/erc1155abi.json'
import PEANUT_CONTRACTS from './data/contracts.json'
import CHAIN_MAP from './data/chainMap.json'
import CHAIN_DETAILS from './data/chainDetails.json'
import TOKEN_DETAILS from './data/tokenDetails.json'
import PACKAGE_JSON from './data/package.json'
const VERSION = PACKAGE_JSON.version

// CONSTANTS
const TOKEN_TYPES = Object.freeze({
	ETH: 0,
	ERC20: 1,
	ERC721: 2,
	ERC1155: 3,
})

// Squid integrator IDs
const DEFAULT_SQUID_INTEGRATOR_ID = '11CBA45B-5EE9-4331-B146-48CCD7ED4C7C'
const CORAL_SQUID_INTEGRATOR_ID = 'peanut-api-coral-test'

// CONTRACT VERSIONS
// TODO: rename CONTRACT to VAULT
const LATEST_STABLE_CONTRACT_VERSION = 'v4.3'
const LATEST_EXPERIMENTAL_CONTRACT_VERSION = 'v4.4'
const FALLBACK_CONTRACT_VERSION = 'v4.2'
const LATEST_STABLE_ROUTER_VERSION = 'Rv4'
const LATEST_EXPERIMENTAL_ROUTER_VERSION = 'Rv4.2'
const LATEST_STABLE_BATCHER_VERSION = 'Bv4.3'
const LATEST_EXPERIMENTAL_BATCHER_VERSION = 'Bv4.4'

// Set of arrays for features only available on certain versions.
// !! IMPORTANT !!: Update these arrays when creating new contracts
// !! IMPORTANT !!: When creating a new array, make sure the name makes sense and is descriptive
// !! IMPORTANT !!: when updating LTS of batcher, make sure to update getLatestContractversion in raffle.ts for the batcher version
const VAULT_CONTRACTS_V4_ANDUP = ['v4', 'v4.2', 'v4.3', 'v4.4']
const VAULT_CONTRACTS_V4_2_ANDUP = ['v4.2', 'v4.3', 'v4.4']
const VAULT_CONTRACTS_WITH_FLEXIBLE_DEPOSITS = ['v4.4']
const VAULT_CONTRACTS_WITH_MFA = ['v4.3', 'v4.4']
const BATCHER_CONTRACTS_WITH_MFA = ['Bv4.3', 'Bv4.4']
const ROUTER_CONTRACTS_WITH_MFA = ['Rv4.2']

// export all these functions (imported in index.js)
export {
	PEANUT_ABI_V4,
	PEANUT_ABI_V4_2,
	PEANUT_ABI_V4_3,
	PEANUT_ABI_V4_4,
	PEANUT_BATCHER_ABI_V4,
	PEANUT_BATCHER_ABI_V4_2,
	PEANUT_BATCHER_ABI_V4_3,
	PEANUT_BATCHER_ABI_V4_4,
	PEANUT_ROUTER_ABI_V4_2,
	PEANUT_CONTRACTS,
	ERC20_ABI,
	ERC721_ABI,
	ERC1155_ABI,
	CHAIN_MAP,
	CHAIN_DETAILS,
	TOKEN_DETAILS,
	VERSION,
	TOKEN_TYPES,
	DEFAULT_SQUID_INTEGRATOR_ID,
	CORAL_SQUID_INTEGRATOR_ID,
	LATEST_STABLE_CONTRACT_VERSION,
	LATEST_EXPERIMENTAL_CONTRACT_VERSION,
	LATEST_STABLE_ROUTER_VERSION,
	LATEST_EXPERIMENTAL_ROUTER_VERSION,
	LATEST_STABLE_BATCHER_VERSION,
	LATEST_EXPERIMENTAL_BATCHER_VERSION,
	FALLBACK_CONTRACT_VERSION,
	VAULT_CONTRACTS_V4_2_ANDUP,
	VAULT_CONTRACTS_V4_ANDUP,
	VAULT_CONTRACTS_WITH_FLEXIBLE_DEPOSITS,
	ROUTER_CONTRACTS_WITH_MFA,
	VAULT_CONTRACTS_WITH_MFA,
	BATCHER_CONTRACTS_WITH_MFA,
}
