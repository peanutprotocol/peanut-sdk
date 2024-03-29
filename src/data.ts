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

// CONTRACT VERSIONS
// TODO: rename CONTRACT to VAULT
const LATEST_STABLE_CONTRACT_VERSION = 'v4.4'
const LATEST_EXPERIMENTAL_CONTRACT_VERSION = 'v4.4'
const FALLBACK_CONTRACT_VERSION = 'v4.3'
const LATEST_STABLE_ROUTER_VERSION = 'Rv4'
const LATEST_EXPERIMENTAL_ROUTER_VERSION = 'Rv4'
const LATEST_STABLE_BATCHER_VERSION = 'Bv4.4'
const LATEST_EXPERIMENTAL_BATCHER_VERSION = 'Bv4.4'

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
	LATEST_STABLE_CONTRACT_VERSION,
	LATEST_EXPERIMENTAL_CONTRACT_VERSION,
	LATEST_STABLE_ROUTER_VERSION,
	LATEST_EXPERIMENTAL_ROUTER_VERSION,
	LATEST_STABLE_BATCHER_VERSION,
	LATEST_EXPERIMENTAL_BATCHER_VERSION,
	FALLBACK_CONTRACT_VERSION,
}
