import React from 'react'
import logo from './logo.svg'
import './App.css'

import { Web3Button, useWeb3Modal } from '@web3modal/react'
import { getWalletClient } from '@wagmi/core'
import { WalletClient, useAccount } from 'wagmi'
import { providers } from 'ethers'
import { useState } from 'react'
import peanut from '@squirrel-labs/peanut-sdk'

function App() {
	const { isConnected, address } = useAccount()
	const { open } = useWeb3Modal()
	const [selectedChain, setSelectedChain] = useState<string | null>(null)
	const [amount, setAmount] = useState<string>('')
	const [link, setLink] = useState<string | undefined>(undefined)

	const chainList = {
		'137': {
			name: 'Polygon',
			chain: 'POLYGON',
		},
		'5': {
			name: 'Goerli',
			chain: 'ETH',
		},
	}
	const tokenList = {
		'137': {
			name: 'MATIC',
			tokenType: 0,
			address: '0x0000000000000000000000000000000000000000',
		},
		'5': {
			name: 'Goerli ETH',
			tokenType: 0,
			address: '0x0000000000000000000000000000000000000000',
		},
	}

	function walletClientToSigner(walletClient: WalletClient): providers.JsonRpcSigner {
		const { account, chain, transport } = walletClient
		const network = {
			chainId: chain.id,
			name: chain.name,
			ensAddress: chain.contracts?.ensRegistry?.address,
		}
		const provider = new providers.Web3Provider(transport, network)
		const signer = provider.getSigner(account.address)
		return signer
	}

	const getWalletClientAndUpdateSigner = async ({
		chainId,
	}: {
		chainId: number
	}): Promise<providers.JsonRpcSigner> => {
		const walletClient = await getWalletClient({ chainId: Number(chainId) })
		if (!walletClient) {
			throw new Error('Failed to get wallet client')
		}
		const signer = walletClientToSigner(walletClient)
		return signer
	}

	const _createLink = async () => {
		const signer = await getWalletClientAndUpdateSigner({
			chainId: Number(selectedChain),
		})

		const response = await peanut.createLink({
			structSigner: {
				signer: signer,
			},
			linkDetails: {
				chainId: Number(selectedChain),
				tokenAmount: Number(amount),
				tokenType: tokenList[selectedChain as keyof typeof tokenList].tokenType,
				tokenAddress: tokenList[selectedChain as keyof typeof tokenList].address,
			},
		})

		console.log(response.createdLink.link[0])
	}

	const _claimLinkGasless = async () => {
		const claimLinkGaslessResponse = await peanut.claimLinkGasless({
			link: '',
			recipientAddress: '',
			APIKey: '',
		})
	}

	const _claimLink = async () => {
		const signer = await getWalletClientAndUpdateSigner({
			chainId: Number(selectedChain),
		})
		const claimLinkResponse = await peanut.claimLink({
			structSigner: {
				signer: signer,
			},
			link: '',
		})
	}

	const _createLinkAdvancedWrapper = async () => {
		const signer = await getWalletClientAndUpdateSigner({
			chainId: Number(selectedChain),
		})

		const linkDetails = {
			chainId: Number(selectedChain),
			tokenAmount: Number(amount),
			tokenType: tokenList[selectedChain as keyof typeof tokenList].tokenType,
			tokenAddress: tokenList[selectedChain as keyof typeof tokenList].address,
		}

		const passwords = [peanut.getRandomString(16)]

		const prepareTxsResponse = await peanut.prepareTxs({
			address: address ?? '',
			linkDetails,
			passwords,
		})

		const signedTxs = await Promise.all(
			prepareTxsResponse.unsignedTxs.map((unsignedTx: any) =>
				peanut.signAndSubmitTx({
					structSigner: {
						signer: signer,
					},
					unsignedTx,
				})
			)
		)

		const links = await peanut.getLinksFromTx({
			linkDetails,
			txHash: signedTxs[signedTxs.length - 1].txHash,
			passwords: passwords,
		})

		console.log(links)
	}
	return (
		<div className="App">
			<header className="App-header">
				<img src={logo} className="App-logo" alt="logo" />
				<p>
					Edit <code>src/App.tsx</code> and save to reload.
				</p>
				<a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
					Learn React
				</a>
			</header>
		</div>
	)
}

export default App
