import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const contractAddress = "0x8128FB42206e3aF1e7847F3A54Bc59875cCc3923";

const contractABI = [
  "function flip(bool guess) external payable returns (bool)",
  "event CoinFlipped(address player, bool won, uint256 amount)"
];

async function getContractBalance(provider) {
  const balance = await provider.getBalance(contractAddress);
  return ethers.utils.formatEther(balance);
}

function canAffordBet(balance, betAmount) {
  if (!balance || !betAmount) return false;
  try {
    const balanceWei = ethers.utils.parseEther(balance);
    const betAmountWei = ethers.utils.parseEther(betAmount);
    const gasEstimate = ethers.utils.parseEther("0.01");
    return balanceWei.gte(betAmountWei.add(gasEstimate));
  } catch (error) {
    console.error("Error in canAffordBet:", error);
    return false;
  }
}

function getEtherscanUrl(network) {
  switch (network) {
    case "mainnet":
      return "https://etherscan.io";
    case "goerli":
      return "https://goerli.etherscan.io";
    case "sepolia":
      return "https://sepolia.etherscan.io";
    default:
      return "https://etherscan.io";
  }
}



function App() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [chosenSide, setChosenSide] = useState("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [network, setNetwork] = useState("");
  const [contractBalance, setContractBalance] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  function handleNetworkChange(chainId) {
    switch (chainId) {
      case "0x1":
        setNetwork("mainnet");
        break;
      case "0x5":
        setNetwork("goerli");
        break;
      case "0xaa36a7":
        setNetwork("sepolia");
        break;
      default:
        setNetwork("unknown");
    }
  }

  async function checkIfWalletIsConnected() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          await updateBalances();

          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          handleNetworkChange(chainId);
        }
      } catch (error) {
        console.error("An error occurred checking the wallet connection:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log("Please install MetaMask!");
      setIsLoading(false);
    }
  }

  async function updateBalances() {
    if (window.ethereum && address) {
      try {
        setIsLoading(true);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(address);
        setBalance(ethers.utils.formatEther(balance));

        const contractBal = await getContractBalance(provider);
        setContractBalance(contractBal);
      } catch (error) {
        console.error("Failed to fetch balances:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', (chainId) => {
        handleNetworkChange(chainId);
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleNetworkChange);
      }
    };
  }, []);

  useEffect(() => {
    if (address) {
      updateBalances();
    }
  }, [address]);

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length > 0) {
      setAddress(accounts[0]);
      await updateBalances();
    } else {
      setAddress("");
      setBalance("");
      setContractBalance("");
    }
  };

  async function connectWallet() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(accounts[0]);
        await updateBalances();
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      console.log("Please install MetaMask!");
    }
  }

  async function flipCoin() {
    console.log("Flip Coin function called!");
    if (!chosenSide || !betAmount) return;
    if (!canAffordBet(balance, betAmount)) {
      alert("Insufficient funds to place this bet. Please lower your bet amount or add more funds to your wallet.");
      return;
    }
    setIsFlipping(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const parsedBetAmount = ethers.utils.parseEther(betAmount);

      // Check if contract has enough balance to pay out
      const contractBal = await getContractBalance(provider);
      if (ethers.utils.parseEther(contractBal).lt(parsedBetAmount.mul(2))) {
        alert("The contract doesn't have enough balance to potentially pay out. Please try a smaller bet.");
        setIsFlipping(false);
        return;
      }

      let gasLimit;
      try {
        gasLimit = await contract.estimateGas.flip(chosenSide === "heads", {
          value: parsedBetAmount
        });
        gasLimit = gasLimit.mul(120).div(100);  // Increase gas limit by 20%
      } catch (error) {
        console.error("Gas estimation failed:", error);
        gasLimit = ethers.BigNumber.from("300000");
      }

      const transaction = await contract.flip(chosenSide === "heads", {
        value: parsedBetAmount,
        gasLimit: gasLimit
      });

      setTxHash(transaction.hash);

      console.log("Transaction sent:", transaction.hash);

      const receipt = await transaction.wait();
      if (receipt.logs.length > 0) {
        const log = receipt.logs[0];
        const player = ethers.utils.getAddress('0x' + log.data.slice(26, 66));
        const bet = ethers.BigNumber.from('0x' + log.data.slice(66, 130));
        const won = log.data.slice(130) !== '0'.repeat(64);

        console.log('Player:', player);
        console.log('Bet:', ethers.utils.formatEther(bet), 'ETH');
        console.log('Result:', won ? 'Won' : 'Lost');
        console.log("Full transaction receipt:", JSON.stringify(receipt, null, 2));
        console.log("All events in receipt:", receipt.events);
        console.log("All logs in receipt:", receipt.logs);

        setResult(won ? "won" : "lost");
        alert(`You ${won ? "won" : "lost"}! Bet: ${ethers.utils.formatEther(bet)} ETH. Transaction: ${transaction.hash}`);
      } else {
        console.error('No logs found in the transaction receipt');
        alert(`Transaction completed, but the result couldn't be determined. Please check your wallet. Transaction hash: ${transaction.hash}`);
      }

      setIsFlipping(false);
      updateBalances();
    } catch (err) {
      console.error("Error:", err);
      setIsFlipping(false);
      if (err.code === 'INSUFFICIENT_FUNDS') {
        alert("Insufficient funds to complete the transaction. Please lower your bet amount or add more funds to your wallet.");
      } else if (err.message.includes("execution reverted")) {
        alert("The transaction was reverted by the contract. This could be due to contract restrictions or insufficient contract balance.");
      } else if (err.message.includes("user rejected transaction")) {
        alert("You rejected the transaction. Please try again if you want to proceed.");
      } else if (err.message.includes("network changed")) {
        alert("The network changed during the transaction. Please ensure you're on the correct network and try again.");
      } else if (err.message.includes("nonce too low")) {
        alert("Transaction nonce is too low. Please refresh the page and try again.");
      } else if (err.message.includes("replacement transaction underpriced")) {
        alert("The transaction was underpriced. Please try again with a higher gas price.");
      } else {
        alert(`An unexpected error occurred: ${err.message}. Please try again or contact support if the issue persists.`);
      }
    } finally {
      setIsFlipping(false);
    }
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-8 text-blue-600">Ethereum Coin Flip</h1>
      {!address ? (
        <button
          onClick={connectWallet}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 mb-2">Address: <span className="font-mono text-sm break-all">{address}</span></p>
          <p className="text-gray-600 mb-4">Balance: <span className="font-bold">{isLoading ? "Loading..." : `${balance} ETH`}</span></p>
          <p className="text-gray-600 mb-4">Contract Balance: <span className="font-bold">{isLoading ? "Loading..." : `${contractBalance} ETH`}</span></p>
          <p className="text-gray-600 mb-4">Bet Amount: <span className="font-bold">{betAmount} ETH</span></p>

          <div className="mb-4">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Bet amount in ETH"
              className="w-full px-3 py-2 placeholder-gray-400 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="mb-4">
            <select
              value={chosenSide}
              onChange={(e) => setChosenSide(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Choose a side</option>
              <option value="heads">Heads</option>
              <option value="tails">Tails</option>
            </select>
          </div>
          <button
            onClick={flipCoin}
            disabled={isFlipping || !chosenSide || !betAmount || !canAffordBet(balance, betAmount)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFlipping ? "Flipping..." : "Flip Coin"}
          </button>
          {betAmount && !canAffordBet(balance, betAmount) && (
            <p className="text-red-500 text-sm mt-2">
              Insufficient funds for this bet amount. Please lower your bet or add more funds to your wallet.
            </p>
          )}
          {isFlipping && (
            <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto my-8 animate-spin"></div>
          )}
          {result && (
            <p className="mt-4 text-lg font-bold text-center text-green-600">
              Result: You {result}!
            </p>
          )}
          {txHash && (
            <p className="mt-4 text-sm text-center">
              <a
                href={`${getEtherscanUrl(network)}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                View transaction on Etherscan
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;



