// holds configuration data for the library

import * as PEANUT_ABI_V3 from "../../data/peanutAbiV3.json";
import * as PEANUT_ABI_V4 from "../../data/peanutAbiV4.json";
import * as ERC20_ABI from "../../data/erc20abi.json";
import * as ERC721_ABI from "../../data/erc721abi.json";
import * as ERC1155_ABI from "../../data/erc1155abi.json";
import * as PEANUT_CONTRACTS from "../../data/contracts.json";
import * as CHAIN_MAP from "../../data/chainMap.json";
import * as CHAIN_DETAILS from "../../data/chainDetails.json";
import * as TOKEN_DETAILS from "../../data/tokenDetails.json";
import * as PACKAGE_JSON from '../../package.json';
const VERSION = PACKAGE_JSON.version;

const chainMapKeys = Object.keys(CHAIN_MAP);
type ChainMapKey = keyof typeof CHAIN_MAP;

const chainDetailKeys = Object.keys(CHAIN_DETAILS);
type ChainDetailKey = keyof typeof CHAIN_DETAILS;


// CONSTANTS
enum TOKEN_TYPES {
	ETH = 0,
	ERC20 = 1,
	ERC721 = 2,
	ERC1155 = 3,
};

const DEFAULT_CONTRACT_VERSION = 'v3';

// export all these functions (imported in index.js)
export {
	PEANUT_ABI_V3,
	PEANUT_ABI_V4,
	PEANUT_CONTRACTS,
	ERC20_ABI,
	ERC721_ABI,
	ERC1155_ABI,
	CHAIN_MAP,
	chainMapKeys,
	ChainMapKey,
	CHAIN_DETAILS,
	chainDetailKeys,
	ChainDetailKey,
	TOKEN_DETAILS,
	VERSION,
	TOKEN_TYPES,
	DEFAULT_CONTRACT_VERSION,
};
