import { useState } from "react";
import "./App.css";
// import { peanut } from '@squirrel-labs/peanut-sdk'
import { peanut } from "@squirrel-labs/peanut-sdk";
import { ethers } from "ethers";
import { useEffect } from "react";

function App() {
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [amount, setAmount] = useState(0.01);
  const [link, setLink] = useState(
    "https://peanut.to/claim?c=5&v=v3&i=243&p=xChtaH9t3ONAZczD&t=sdk"
  );
  const [linkStatus, setLinkStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [claimTx, setClaimTx] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", function (accounts) {
        if (accounts?.length > 0) {
          setIsConnected(true);
          connectWallet();
        } else {
          setIsConnected(false);
          setSigner(null);
        }
      });

      window.ethereum.on("chainChanged", function (chainId) {
        console.log("chainChanged", chainId);
        connectWallet();
      });
    }
  }, []);

  const connectWallet = async () => {
    if (isConnected) return;
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.enable();
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      const signer = await provider.getSigner();

      setSigner(signer);
      setIsConnected(true);
      setChainId((await provider.getNetwork()).chainId);
      console.log(signer.address, (await provider.getNetwork()).chainId);
    } else {
      alert("Please install MetaMask!");
    }
  };

  const createLink = async () => {
    if (!signer) throw new Error("Connect wallet first");
    const network = await signer.provider.getNetwork();
    const chainId = network.chainId;

    // export signer to window
    window.signer = signer;
    console.log(signer);

    // create link
    const { link, txReceipt } = await peanut.createLink({
      signer: signer,
      chainId: chainId,
      tokenAmount: amount,
      tokenType: 0, // 0 for ether, 1 for erc20, 2 for erc721, 3 for erc1155
      verbose: true,
    });
    setLink(link);
    console.log(txReceipt);
  };

  const claimLink = async () => {
    if (!signer || !link) return;
    const claimTx = await peanut.claimLink({ signer: signer, link: link });
    console.log(claimTx);
    setClaimTx(claimTx);
  };

  const claimLinkGasless = async () => {
    if (!signer || !link) return;
    const claimTx = await peanut.claimLinkGasless(
      link,
      signer.address,
      "AbOlrI9htv38pmHPENNoCwDc9lqgCFTP"
    );
    console.log(claimTx);
    setClaimTx(claimTx);
  };

  const checkLinkStatus = async () => {
    if (!signer || !link) throw new Error("signer or link is not set");
    try {
      // setLinkStatus({ claimed: true, deposit: null})
      console.log("checking link status...");
      const { claimed, deposit } = await peanut.getLinkStatus({
        signer: signer,
        link: link,
      });
      console.log(claimed, deposit);
      setLinkStatus(claimed);
    } catch (error) {
      console.error("Failed to check link status", error);
    }
  };

  return (
    <div style={{ width: "80%", margin: "auto" }}>
    <h1 style={{ textAlign: "center" }}> Peanut SDK Example</h1>
    <h3 style={{ textAlign: "center" }}> Ethers v5 + React + Vite</h3>
      {chainId && <p>Chain ID: {parseInt(chainId)}</p>}
      <button onClick={connectWallet} style={{ background: "green", margin: "10px" }}>
        {isConnected ? "Connected" : "Connect Wallet"}
      </button>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: "50%" }}>
          <label htmlFor="amount" style={{ fontSize: "12px" }}>Amount</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount in ETH"
            style={{ width: "200px",  margin: "auto", marginBottom: "10px", marginTop: "10px" }}
          />
          <p style={{ fontSize: "12px" }}>Clicking the button will send a link with entered ETH.</p>
          <button onClick={createLink}>Create new link</button>
        </div>
        <div
          style={{
            marginLeft: "20px",
            padding: "10px",
            width: "50%",
            border: "1px solid #ccc",
          }}
        >
          <div>
            {link && (
              <div>
                <h2>Link: </h2>
                <p>{link}</p>
              </div>
            )}
            {!link && <p>Please create or copy a peanut link first</p>}
          </div>
          <div>
            <button onClick={checkLinkStatus}>Check Status</button>
            {linkStatus !== null && (
              <div>
                <p>Link is claimed: {linkStatus.toString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ margin: "20px 0" }}>
        <button onClick={claimLink}>Claim link</button>
        {claimTx && (
          <div>
            <p>Claim tx hash: {claimTx.hash}</p>
            <p>Claim tx status: {claimTx.status}</p>
          </div>
        )}
      </div>

      <div style={{ margin: "20px 0" }}>
        <button onClick={claimLinkGasless}>Claim link Gasless</button>
        {claimTx && (
          <div>
            <p>Claim tx hash: {claimTx.hash}</p>
            <p>Claim tx status: {claimTx.status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
