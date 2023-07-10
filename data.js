let PEANUT_ABI_V3, PEANUT_CONTRACTS, ERC20_ABI, ERC721_ABI, ERC1155_ABI, CHAIN_MAP, PROVIDERS;

const loadJSON = async (filePath) => {
  if (typeof window === 'undefined') { // Node.js environment
    const fs = await import('fs');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    try {
      const data = fs.readFileSync(join(__dirname, filePath), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to load JSON data from ${filePath}: `, error);
    }
  } else { // Browser environment
    try {
      return import(`./data/${filePath}`);
      // return import(`./${filePath}`); // this resulted in webpack creating huge files
    } catch (error) {
      console.error(`Failed to load JSON data from ${filePath}: `, error);
    }
  }
}

// load all JSON files
PEANUT_ABI_V3 = await loadJSON('data/peanutAbiV3.json');
ERC20_ABI = await loadJSON('data/erc20abi.json');
ERC721_ABI = await loadJSON('data/erc721abi.json');
ERC1155_ABI = await loadJSON('data/erc1155abi.json');
PEANUT_CONTRACTS = await loadJSON('data/contracts.json');
PROVIDERS = await loadJSON('data/providers.json');
CHAIN_MAP = await loadJSON('data/chainMap.json');

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
