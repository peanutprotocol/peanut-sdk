////////////////// Create Link Library ///////////////////////
//
//  The intent of this library is to provide a simpler interface
//  for creating Peanut links. It is intended to be used in the main
//  Peanut SDK library.
//
/////////////////////////////////////////////////////////

import 'isomorphic-fetch'
import { ethers } from 'ethersv5' // v5
import { DEFAULT_CONTRACT_VERSION } from './data.js'
import { getAbstractSigner } from './signer.js'
import { approveSpendERC20, setFeeOptions, getContract } from './peanut.js'

import {
	assert,
	generateKeysFromString,
	getRandomString,
	getLinkFromParams,
	getDepositIdx,
	estimateGasLimit,
} from './util.js'

const CREATE_LINK_STORAGE_KEY = 'temp.peanut.deposits'

/**
 * Generates a link with the specified parameters
 *
 * @param {Object} options - An object containing the options to use for the link creation
 * @returns {Object} - An object containing the link and the txReceipt
 * @example
 * const result = await createLink({
 *   signer,
 *   chainId: 1,
 *   tokenAmount: 100,
 *   tokenAddress: "0xYourTokenAddress",
 *   tokenType: 1,
 *   tokenId: 0,
 *   tokenDecimals: 18,
 *   password: "yourPassword",
 *   baseUrl: "https://peanut.to/claim",
 *   trackId: "sdk",
 *   maxFeePerGas: null,
 *   maxPriorityFeePerGas: null,
 *   gasLimit: null,
 *   eip1559: true,
 *   verbose: false,
 *   contractVersion: "v4",
 *   nonce: null
 * });
 * console.log(result); // { link: "https://peanut.to/claim?c=1&v=v4&i=123&p=yourPassword", txReceipt: TransactionReceipt }
 */
export async function createLink({
	signer,
	chainId,
	tokenAmount,
	tokenAddress = '0x0000000000000000000000000000000000000000',
	tokenType = 0,
	tokenId = 0,
	tokenDecimals = 18,
	password = '',
	baseUrl = 'https://peanut.to/claim',
	trackId = 'sdk',
	maxFeePerGas = null,
	maxPriorityFeePerGas = null,
	gasLimit = null,
	eip1559 = true,
	verbose = false,
	contractVersion = DEFAULT_CONTRACT_VERSION,
	nonce = null,
}) {
	// validate input parameters
	await validateInputParameters({
		signer, 
		chainId, 
		tokenAmount, 
		tokenType, 
		tokenAddress,
		tokenDecimals
	});


	/* Mutate our signer object */
	signer = await getAbstractSigner(signer)

	if (tokenAddress == null) {
		tokenAddress = '0x0000000000000000000000000000000000000000'
		if (tokenType != 0) {
			throw new Error('tokenAddress is null but tokenType is not 0')
		}
	}
	// convert tokenAmount to appropriate unit
	// tokenAmount = ethers.parseUnits(tokenAmount.toString(), tokenDecimals); // v6
	// tokenAmount = ethers.utils.parseUnits(tokenAmount.toString(), tokenDecimals) // v5

	/* Avoid mutation */
	const convertedTokenAmount = convertTokenAmount(tokenAmount.toString(), tokenDecimals);


	// if native token (tokentype == 0), add value to txOptions
	let txOptions = {}
	// set nonce
	// nonce = nonce || (await signer.getNonce()); // v6
	nonce = nonce || (await signer.getTransactionCount()) // v5
	txOptions.nonce = nonce
	if (tokenType == 0) {
		txOptions = {
			...txOptions,
			value: convertedTokenAmount,
		}
	} else if (tokenType == 1) {
		// check allowance
		// TODO: check for erc721 and erc1155
		verbose && console.log('checking allowance...')
		// if token is erc20, check allowance
		const allowance = await approveSpendERC20(
			signer,
			chainId,
			tokenAddress,
			convertedTokenAmount.toString(),
			tokenDecimals,
			true,
			contractVersion
		)
		verbose && console.log('allowance: ', allowance, ' convertedTokenAmount: ', convertedTokenAmount)
		if (allowance < convertedTokenAmount) {
			throw new Error('Allowance not enough')
		}
	}

	if (password == null || password == '') {
		// if no password is provided, generate a random one
		password = getRandomString(16)
	}

	const keys = generateKeysFromString(password) // deterministically generate keys from password
	const contract = await getContract(chainId, signer, contractVersion) // get the contract instance

	verbose && console.log('Generating link...')

	// set transaction options
	txOptions = await setFeeOptions({
		txOptions,
		provider: signer.provider,
		eip1559,
		maxFeePerGas,
		maxPriorityFeePerGas,
		gasLimit,
		verbose, // Include verbose in the object passed to setFeeOptions
	})

	verbose && console.log('post txOptions: ', txOptions)
	const depositParams = [tokenAddress, tokenType, tokenAmount, tokenId, keys.address]
	const estimatedGasLimit = await estimateGasLimit(contract, 'makeDeposit', depositParams, txOptions)
	if (estimatedGasLimit) {
		txOptions.gasLimit = estimatedGasLimit.toString()
	}
	verbose && console.log('final txOptions: ', txOptions)
	// const depositParams = [tokenAddress, tokenType, tokenAmount, tokenId, keys.address, txOptions];
	verbose && console.log('depositParams: ', depositParams)
	// var tx = await contract.makeDeposit(...depositParams);

	// store in localstorage in case tx falls through (only if in web environment)

	  const tempDeposits = handleLocalStorage({
		action: 'get',
		key: CREATE_LINK_STORAGE_KEY,
		verbose: verbose,
	  }) || [];

	  const tempDeposit = {
		chain: chainId,
		tokenAmount: tokenAmount.toString(),
		contractType: tokenType,
		contractVersion: contractVersion,
		tokenAddress: tokenAddress,
		password: password,
		idx: null,
		link: null,
		txHash: null,
	}

	/* push new values into storage arr */
	  tempDeposits.push(tempDeposit);

	  handleLocalStorage({
		action: 'set', 
		key: CREATE_LINK_STORAGE_KEY, 
		verbose: verbose,
		value: tempDeposits
	});
	  

	var tx = await contract.makeDeposit(...depositParams, txOptions)

	console.log('submitted tx: ', tx.hash)

	// now we need the deposit index from the tx receipt
	var txReceipt = await tx.wait()
	var depositIdx = getDepositIdx(txReceipt, chainId)
	verbose && console.log('Deposit finalized. Deposit index: ', depositIdx)

	// now we can create the link
	const link = getLinkFromParams(chainId, contractVersion, depositIdx, password, baseUrl, trackId)
	verbose && console.log('created link: ', link)
	// return the link and the tx receipt
	return { link, txReceipt }
}



/**
 * Validates the input parameters for a token transaction.
 * @param {Object} params - The input parameters for the transaction.
 * @param {Object} params.signer - The signer object.
 * @param {number} params.chainId - The chain ID.
 * @param {number} params.tokenAmount - The amount of tokens.
 * @param {number} params.tokenType - The type of token.
 * @param {string} params.tokenAddress - The address of the token.
 * @param {number|null} params.tokenDecimals - The number of decimals for the token.
 * @returns {void}
 * @throws {Error} - Throws an error if any of the input parameters are missing or invalid.
 * @todo We should ideally use a validator library like zod, validator.js for all of our inputs instead of manually asserting them.
 */
function validateInputParameters({signer, chainId, tokenAmount, tokenType, tokenAddress, tokenDecimals}) {
    assert(signer, 'signer arg is required');
    assert(chainId, 'chainId arg is required');
    assert(tokenAmount, 'amount arg is required');
    assert(
      tokenType === 0 || tokenAddress !== '0x0000000000000000000000000000000000000000',
      'tokenAddress must be provided for non-native tokens'
    );

    assert(
        !(tokenType == 1 || tokenType == 3) || tokenDecimals != null,
        'tokenDecimals must be provided for ERC20 and ERC1155 tokens'
    )
}

/**
 * Converts the token amount to the appropriate unit.
 * @param {number} tokenAmount - The amount of tokens.
 * @param {number} tokenDecimals - The number of decimals for the token.
 * @returns {Object} - The converted token amount.
 */
function convertTokenAmount(tokenAmount, tokenDecimals) {
	return ethers.utils.parseUnits(tokenAmount.toString(), tokenDecimals);
  }
  

/**
 * Handles local storage actions.
 * @param {Object} params - The input parameters for the function.
 * @param {string} params.action - The action to perform (set or get).
 * @param {string} params.key - The key to use for the local storage.
 * @param {Object|null} params.value - The value to store in local storage.
 * @param {boolean} [params.verbose=false] - Whether to log verbose output to the console.
 * @returns {Object|null} - The retrieved value or null if not available.
 * @throws {Error} - Throws an error if the `action` parameter is missing or invalid.
 */
function handleLocalStorage({action, key, value = null, verbose = false}) {
    if (typeof window === 'undefined') {
      console.warn(`window object doesn't exist. LocalStorage is only available in the browser. for ${action} ${key}`);
      return null;
    }
  
    if (action === 'set') {
      localStorage.setItem(key, JSON.stringify(value));
       verbose && console.log(`Saved the data to the key '${key}'`);
    } else if (action === 'get') {
      const retrievedValue = localStorage.getItem(key);
        verbose && console.log(`Retrieved the data from the key '${key}'`)
      return JSON.parse(retrievedValue);
    } else {
      throw new Error(`Invalid action '${action}'. Please choose 'set' or 'get'.`);
    }
}