
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//////////////////////////////
// load data from json files //
//////////////////////////////

// load data/peanutAbiV3.json
const peanutAbiV3FilePath = join(__dirname, 'data', 'peanutAbiV3.json');
const PEANUT_ABI_V3 = JSON.parse(fs.readFileSync(peanutAbiV3FilePath, 'utf-8'));

// load data/erc20abi.json
const erc20AbiFilePath = join(__dirname, 'data', 'erc20abi.json');
const ERC20_ABI = JSON.parse(fs.readFileSync(erc20AbiFilePath, 'utf-8'));

// load data/erc721abi.json
const erc721AbiFilePath = join(__dirname, 'data', 'erc721abi.json');
const ERC721_ABI = JSON.parse(fs.readFileSync(erc721AbiFilePath, 'utf-8'));

// load data/erc1155abi.json
const erc1155AbiFilePath = join(__dirname, 'data', 'erc1155abi.json');
const ERC1155_ABI = JSON.parse(fs.readFileSync(erc1155AbiFilePath, 'utf-8'));

// load data/contracts.json
const contractsFilePath = join(__dirname, 'data', 'contracts.json');
const PEANUT_CONTRACTS = JSON.parse(fs.readFileSync(contractsFilePath, 'utf-8'));

// load data/providers.json
const providersFilePath = join(__dirname, 'data', 'providers.json');
const PROVIDERS = JSON.parse(fs.readFileSync(providersFilePath, 'utf-8'));

// load data/chainMap.json
const chainMapFilePath = join(__dirname, 'data', 'chainMap.json');
const CHAIN_MAP = JSON.parse(fs.readFileSync(chainMapFilePath, 'utf-8'));

// export all these functions (imported in index.js)
export {
    PEANUT_ABI_V3,
    PEANUT_CONTRACTS,
    ERC20_ABI,
    ERC721_ABI,
    ERC1155_ABI,
    CHAIN_MAP,
    PROVIDERS,
    };
