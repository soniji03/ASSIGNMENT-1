import React, { useState, useEffect } from 'react';

// const contractAddress = "0x8128FB42206e3aF1e7847F3A54Bc59875cCc3923";

const contractAddress = import.meta.env.VITE_CONTRACTADDRESS;

function App() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [chosenSide, setChosenSide] = useState("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    checkIfWalletIsConnected();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  async function checkIfWalletIsConnected() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          await updateBalance(accounts[0]);
        }
      } catch (error) {
        console.error("An error occurred checking the wallet connection:", error);
      }
    } else {
      console.log("Please install MetaMask!");
    }
  }

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length > 0) {
      setAddress(accounts[0]);
      await updateBalance(accounts[0]);
    } else {
      setAddress("");
      setBalance("");
    }
  };

  async function connectWallet() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(accounts[0]);
        await updateBalance(accounts[0]);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      console.log("Please install MetaMask!");
    }
  }

  async function updateBalance(address) {
    if (window.ethereum && address) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        });
        setBalance(parseInt(balance, 16) / 1e18);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    }
  }

  async function flipCoin() {
    if (!chosenSide || !betAmount) return;
    setIsFlipping(true);
    try {
      // Here you would interact with your smart contract
      // For now, we'll just simulate the flip
      setTimeout(() => {
        const randomResult = Math.random() < 0.5 ? "heads" : "tails";
        setResult(randomResult);
        setIsFlipping(false);
        
        if (randomResult === chosenSide) {
          alert("You won! Your bet has been doubled.");
        } else {
          alert("You lost. Better luck next time!");
        }
        
        updateBalance(address);
      }, 3000);
    } catch (err) {
      console.error("Error:", err);
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
        <p className="text-gray-600 mb-4">Balance: <span className="font-bold">{balance} ETH</span></p>
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
          disabled={isFlipping || !chosenSide || !betAmount}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFlipping ? "Flipping..." : "Flip Coin"}
        </button>
        {isFlipping && (
          <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto my-8 animate-spin"></div>
        )}
        {result && (
          <p className="mt-4 text-lg font-bold text-center text-green-600">
            Result: {result}
          </p>
        )}
      </div>
    )}
  </div>
  );
}

export default App;