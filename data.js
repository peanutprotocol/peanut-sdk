let PEANUT_ABI_V3, PEANUT_ABI_V4, PEANUT_CONTRACTS, ERC20_ABI, ERC721_ABI, ERC1155_ABI, CHAIN_MAP, PROVIDERS;

// const loadJSON = async (filePath) => {
//   if (typeof window === 'undefined') { // Node.js environment
//     const fs = await import('fs');
//     const { fileURLToPath } = await import('url');
//     const { dirname, join } = await import('path');

//     const __filename = fileURLToPath(import.meta.url);
//     const __dirname = dirname(__filename);

//     try {
//       const data = fs.readFileSync(join(__dirname, filePath), 'utf-8');
//       return JSON.parse(data);
//     } catch (error) {
//       console.error(`Failed to load JSON data from ${filePath}: `, error);
//     }
//   } else { // Browser environment
//     try {
//       const response = await fetch(filePath);
//       return await response.json();
//     } catch (error) {
//       console.error(`Failed to load JSON data from ${filePath}: `, error);
//     }
//   }
// }

// load all JSON files
PEANUT_ABI_V3 = [{ "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "_index", "type": "uint256" }, { "indexed": false, "internalType": "uint8", "name": "_contractType", "type": "uint8" }, { "indexed": false, "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "_senderAddress", "type": "address" }], "name": "DepositEvent", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "string", "name": "message", "type": "string" }], "name": "MessageEvent", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "_index", "type": "uint256" }, { "indexed": false, "internalType": "uint8", "name": "_contractType", "type": "uint8" }, { "indexed": false, "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "_recipientAddress", "type": "address" }], "name": "WithdrawEvent", "type": "event" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "deposits", "outputs": [{ "internalType": "address", "name": "pubKey20", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "address", "name": "tokenAddress", "type": "address" }, { "internalType": "uint8", "name": "contractType", "type": "uint8" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getDepositCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_tokenAddress", "type": "address" }, { "internalType": "uint8", "name": "_contractType", "type": "uint8" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "address", "name": "_pubKey20", "type": "address" }], "name": "makeDeposit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_operator", "type": "address" }, { "internalType": "address", "name": "_from", "type": "address" }, { "internalType": "uint256[]", "name": "_ids", "type": "uint256[]" }, { "internalType": "uint256[]", "name": "_values", "type": "uint256[]" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "onERC1155BatchReceived", "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_operator", "type": "address" }, { "internalType": "address", "name": "_from", "type": "address" }, { "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "uint256", "name": "_value", "type": "uint256" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "onERC1155Received", "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_operator", "type": "address" }, { "internalType": "address", "name": "_from", "type": "address" }, { "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "onERC721Received", "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "_interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_index", "type": "uint256" }, { "internalType": "address", "name": "_recipientAddress", "type": "address" }, { "internalType": "bytes32", "name": "_recipientAddressHash", "type": "bytes32" }, { "internalType": "bytes", "name": "_signature", "type": "bytes" }], "name": "withdrawDeposit", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }];
PEANUT_ABI_V4 = [{ "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "_index", "type": "uint256" }, { "indexed": false, "internalType": "uint8", "name": "_contractType", "type": "uint8" }, { "indexed": false, "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "_senderAddress", "type": "address" }], "name": "DepositEvent", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "string", "name": "message", "type": "string" }], "name": "MessageEvent", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "_index", "type": "uint256" }, { "indexed": false, "internalType": "uint8", "name": "_contractType", "type": "uint8" }, { "indexed": false, "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "_recipientAddress", "type": "address" }], "name": "WithdrawEvent", "type": "event" }, { "inputs": [{ "internalType": "address[]", "name": "_tokenAddresses", "type": "address[]" }, { "internalType": "uint8[]", "name": "_contractTypes", "type": "uint8[]" }, { "internalType": "uint256[]", "name": "_amounts", "type": "uint256[]" }, { "internalType": "uint256[]", "name": "_tokenIds", "type": "uint256[]" }, { "internalType": "address[]", "name": "_pubKeys20", "type": "address[]" }], "name": "batchMakeDeposit", "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_tokenAddress", "type": "address" }, { "internalType": "uint256[]", "name": "_amounts", "type": "uint256[]" }, { "internalType": "address[]", "name": "_pubKeys20", "type": "address[]" }], "name": "batchMakeDepositERC20", "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256[]", "name": "_amounts", "type": "uint256[]" }, { "internalType": "address[]", "name": "_pubKeys20", "type": "address[]" }], "name": "batchMakeDepositEther", "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "deposits", "outputs": [{ "internalType": "address", "name": "pubKey20", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "address", "name": "tokenAddress", "type": "address" }, { "internalType": "uint8", "name": "contractType", "type": "uint8" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "address", "name": "senderAddress", "type": "address" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getDepositCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_tokenAddress", "type": "address" }, { "internalType": "uint8", "name": "_contractType", "type": "uint8" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "address", "name": "_pubKey20", "type": "address" }], "name": "makeDeposit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_operator", "type": "address" }, { "internalType": "address", "name": "_from", "type": "address" }, { "internalType": "uint256[]", "name": "_ids", "type": "uint256[]" }, { "internalType": "uint256[]", "name": "_values", "type": "uint256[]" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "onERC1155BatchReceived", "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_operator", "type": "address" }, { "internalType": "address", "name": "_from", "type": "address" }, { "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "uint256", "name": "_value", "type": "uint256" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "onERC1155Received", "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_operator", "type": "address" }, { "internalType": "address", "name": "_from", "type": "address" }, { "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "onERC721Received", "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "_interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "pure", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_index", "type": "uint256" }, { "internalType": "address", "name": "_recipientAddress", "type": "address" }, { "internalType": "bytes32", "name": "_recipientAddressHash", "type": "bytes32" }, { "internalType": "bytes", "name": "_signature", "type": "bytes" }], "name": "withdrawDeposit", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_index", "type": "uint256" }], "name": "withdrawDepositSender", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }];
ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_from",
        "type": "address"
      },
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "payable": true,
    "stateMutability": "payable",
    "type": "fallback"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  }
]

ERC721_ABI = [{ "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "mint", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "safeTransferFrom", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "safeTransferFrom", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "bool", "name": "approved", "type": "bool" }], "name": "setApprovalForAll", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "transferFrom", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "approved", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "operator", "type": "address" }, { "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" }], "name": "ApprovalForAll", "type": "event" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "getApproved", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "operator", "type": "address" }], "name": "isApprovedForAll", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }]

ERC1155_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "ApprovalForAll",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "ids",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "values",
        "type": "uint256[]"
      }
    ],
    "name": "TransferBatch",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "TransferSingle",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "value",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "URI",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "accounts",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "ids",
        "type": "uint256[]"
      }
    ],
    "name": "balanceOfBatch",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "isApprovedForAll",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "ids",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "safeBatchTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "uri",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

PEANUT_CONTRACTS = {
  "1": {
    "ethereum-mainnt": "This is a comment",
    "v3": "0xdB60C736A30C41D9df0081057Eae73C3eb119895"
  },
  "5": {
    "ethereum-goerli": "This is a comment",
    "v1": "0x616d197A29E50EBD08a4287b26e47041286F171D",
    "v2": "0xd4964Df4dc2eb6B2fD4157DFda264AA9dd720C92",
    "v3": "0xd068b1F6F0623CbCC7ADC7545290f8991C9B8Ec9",
    "v4": "0xb476eba8bf2ca71166cdf9f1b95f50277fa54533"
  },
  "137": {
    "polygon-mainnet": "This is a comment",
    "v1": "0xB184b7D19d747Db9084C355b5B6a093d7063B710",
    "v2": "0x45fd48f58c47d929E9D181837fBB7Cda1974a773",
    "v3": "0xCEd763C2Ff8d5B726b8a5D480c17C24B6686837F",
    "v4": "0xb0d6a10351a54d3c6b275e18cf5554a079489abb"
  },
  "80001": {
    "polygon-mumbai": "This is a comment"
  },
  "10": {
    "optimism-mainnet": "This is a comment",
    "v1": "0x9B0817fA08b46670B92300B58AA1f4AB155701ea",
    "v3": "0x1aBe03DC4706aE47c4F2ae04EEBe5c8607c74e17"
  },
  "420":{
    "optimism-goerli": "This is a comment",
    "v3": "0xDC608f2Bc4f0AFf02D12d51Ca8b543B343525c8a"
  },
  "42": {
    "ethereum-kovan": "This is a comment"
  },
  "42161": {
    "arbitrum-mainnet": "This is a comment",
    "v1": "0x8d1a17A3A4504aEB17515645BA8098f1D75237f7",
    "v3": "0x9B0817fA08b46670B92300B58AA1f4AB155701ea"
  },
  "4": {
    "ethereum-rinkeby": "This is a comment"
  },
  "100": {
    "xdai-mainnet": "This is a comment",
    "v1": "0x8d1a17A3A4504aEB17515645BA8098f1D75237f7",
    "v3": "0x897F8EDdB345F0d16081615823F76055Ad60A00c"
  },
  "bsctestnet": {},
  "56": {
    "bsc-mainnet": "This is a comment",
    "v3": "0x8d1a17A3A4504aEB17515645BA8098f1D75237f7"
  },
  "97": {
    "bsc-testnet": "This is a comment"
  },
  "moonbeam": {
    "mainnet": {
      "v1": "0xF5D83DF662f58255D9E9d5fe9a59ac7Cd1eF85BC"
    },
    "moonbase": {}
  },
  "43114": {
    "avalanche-mainnet": "This is a comment",
    "v1": "0x8d1a17A3A4504aEB17515645BA8098f1D75237f7"
  },
  "43113": {
    "avalanche-fuji": "This is a comment"
  },
  "314159": {
    "comment": "filecoin testnet",
    "v4": "0x1851359AB8B002217cf4D108d7F027B63563754C"
  },
  "1442": {
    "comment": "polygon zkevm testnet",
    "v4": "0x60d5db92eca3ee10ccf60517f910d8154ff62231"
  },
  "7001": {
    "comment": "zetachain testnet",
    "v4": "0xABCf92BD1c01f2eFe63FfcEaa73F19ec72F0Eba5"
  },
  "245022926": {
    "comment": "neon devnet",
    "v4": "0x8d1a17A3A4504aEB17515645BA8098f1D75237f7"
  },
  "5001": {
    "comment": "mantle testnet",
    "v4": "0x7B36e10AA3ff44576efF4b1AfB80587B9b3BA3a5"
  },
  "44787": {
    "comment": "celo alfajores testnet",
    "v4": "0x8d1a17A3A4504aEB17515645BA8098f1D75237f7"
  },
  "10200": {
    "comment": "gnosis chiado testnet",
    "v4": "0xABCf92BD1c01f2eFe63FfcEaa73F19ec72F0Eba5"
  }
}
   



PROVIDERS = {
  "1": "https://mainnet.infura.io/v3/",
  "5": "https://goerli.infura.io/v3/",
  "137": "https://polygon-rpc.com/",
  "80001": "https://polygon-mumbai.infura.io/v3/",
  "10": "https://optimism-mainnet.infura.io/v3/",
  "420": "https://endpoints.omniatech.io/v1/op/goerli/public",
  "69": "https://optimism-kovan.infura.io/v3/",
  "42161": "https://arbitrum-mainnet.infura.io/v3/",
  "421611": "https://arbitrum-rinkeby.infura.io/v3/",
  "1313161556": "https://near-mainnet.infura.io/v3/",
  "1313161555": "https://near-testnet.infura.io/v3/",
  "1287": "https://moonbeam-mainnet.infura.io/v3/",
  "100": "https://rpc.gnosischain.com/",
  "56": "https://bsc-dataseed.binance.org/",
  "461": "https://filecoin-hyperspace.chainstacklabs.com/rpc/v1",
  "60001": "https://prealpha-rpc.scroll.io/l2",
  "60002": "https://alpha-rpc.scroll.io/l2",
  "44787": "https://alfajores-forno.celo-testnet.org",
  "245022926": "https://devnet.neonevm.org",
  "10200": "https://rpc.chiado.gnosis.gateway.fm",
  "ethereum": {
    "mainnet": "https://mainnet.infura.io/v3/",
    "goerli": "https://goerli.infura.io/v3/"
  },
  "polygon": {
    "mainnet": "https://polygon-rpc.com/",
    "mumbai": "https://polygon-mumbai.infura.io/v3/"
  },
  "optimism": {
    "mainnet": "https://optimism-mainnet.infura.io/v3/",
    "kovan": "https://optimism-kovan.infura.io/v3/"
  },
  "arbitrum": {
    "mainnet": "https://arbitrum-mainnet.infura.io/v3/",
    "rinkeby": "https://arbitrum-rinkeby.infura.io/v3/"
  },
  "starknet": {
    "mainnet": "https://starknet-mainnet.infura.io/v3/",
    "goerli": "https://starknet-mainnet.infura.io/v3/"
  },
  "near": {
    "mainnet": "https://near-mainnet.infura.io/v3/",
    "testnet": "https://near-testnet.infura.io/v3/"
  },
  "avalanche": {},
  "moonbeam": {
    "mainnet": "https://moonbeam-mainnet.infura.io/v3/"
  },
  "xdai": {
    "mainnet": "https://rpc.gnosischain.com/"
  },
  "bsc": {
    "mainnet": "https://bsc-dataseed.binance.org/"
  },
  "filecoin": {
    "mainnet": "",
    "hyperspace": "https://filecoin-hyperspace.chainstacklabs.com/rpc/v1"
  },
  "scroll": {
    "pre_alpha_l2": "https://prealpha-rpc.scroll.io/l2",
    "alpha": "https://alpha-rpc.scroll.io/l2"
  }
}

CHAIN_MAP = {
  "eth": 1,
  "ethereum-mainnet": 1,
  "goerli": 5,
  "ethereum-goerli": 5,
  "matic": 137,
  "polygon-mainnet": 137,
  "polygon-mumbai": 80001,
  "mumbai": 80001,
  "opt": 10,
  "optimism-mainnet": 10,
  "optimism-goerli": 420,
  "moonbeam-mainnet": 1284,
  "starkware-mainnet": 1001,
  "arb": 42161,
  "arbitrum-mainnet": 42161,
  "xdai-mainnet": 100,
  "xdai": 100,
  "bsc-mainnet": 56,
  "bnb": 56,
  "filecoin-mainnet": 314,
  "fil": 314,
  "filecoin-hyperspace": 3141,
  "fil-2": 3141,
  "scroll-pre_alpha_l2": 534354,
  "scroll-l2p": 534354,
  "scroll-alpha_l2": 534353,
  "scroll-alpha": 534353,
  "avalanche-mainnet": 43114,
  "avax": 43114
}
// package version
// const { version } = await loadJSON('package.json'); // removed as was giving errors
// console.log(`Peanut SDK version: ${version}`); // removed as was giving errors

// export all these functions (imported in index.js)
export {
  PEANUT_ABI_V3,
  PEANUT_ABI_V4,
  PEANUT_CONTRACTS,
  ERC20_ABI,
  ERC721_ABI,
  ERC1155_ABI,
  CHAIN_MAP,
  PROVIDERS,
  // version, // removed as was giving errors
};
