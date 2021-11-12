import { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3, BN } from '@project-serum/anchor';


import idl from './idl.json';
//key pair

let envKeypair = JSON.parse(atob(process.env.REACT_APP_KEYPAIR));
console.log(envKeypair)
// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// load the  keypair for the account that will hold the GIF data.
const arr = Object.values(envKeypair._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = Keypair.fromSecretKey(secret);

// Get our program's id form the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devent.
const network = clusterApiUrl('devnet');

// Control's how we want to acknowledge when a trasnaction is "done".
const opts = {
  preflightCommitment: 'processed',
};
// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const MY_TWITTER_HANDLE = 'SoyKono';
const MY_TWITTER_LINK = `https://twitter.com/${MY_TWITTER_HANDLE}`;

const App = () => {
  // Initial State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  // Actions
  //Verify if user is using Phantom
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );

          /*
           * Set the user's publicKey in state to be used later!
           */
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Please, Download a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };
  //connects to the Phantom wallet
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };
  //if there is no base account hte program cant run
  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        'Created a new BaseAccount w/ address:',
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log('Error creating BaseAccount account:', error);
    }
  };

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log('Got the account', account);
      setGifList(account.gifList);
    } catch (error) {
      console.log('Error in getGifs: ', error);
      setGifList(null);
    }
  };
  //send gif to program
  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No gif link given!');
      return;
    }
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log('GIF sucesfully sent to program', inputValue);

      await getGifList();
    } catch (error) {
      console.log('Error sending GIF:', error);
    }
  };

  const upVote = async (event) => {
    try {
      event.preventDefault();

      const target = event.target;
      const index = target.value;

      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.upVote(new BN(index), {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log('Upvote successfully sent to program', index);

      await getGifList();
    } catch (error) {
      console.error('Error sending up vote: ', error);
    }
  };

  const downVote = async (event) => {
    try {
      event.preventDefault();

      const target = event.target;
      const index = target.value;

      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.downVote(new BN(index), {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log('Downvote successfully sent to program', index);

      await getGifList();
    } catch (error) {
      console.error('Error sending down vote: ', error);
    }
  };
  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} alt={`gif#${index}`} />
               <div className="gif-info">
               <div className="gif-poster">
                <span>Posted by:</span>
                <a
                  href={`https://explorer.solana.com/address/${item.userAddress.toString()}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.userAddress.toString()}
                </a>
                  </div>

                <div className="vote">
                  <button
                    className="vote-button vote-down-button"
                    onClick={downVote}
                    value={index}
                  >
                    -1
                  </button>

                  <span className="vote-counter">
                    {item.votes.toString()} votes
                  </span>
                  <button
                    className="vote-button vote-up-button"
                    onClick={upVote}
                    value={index}
                  >
                    +1
                  </button>
                </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  // UseEffects
  useEffect(() => {
    window.addEventListener('load', async (event) => {
      await checkIfWalletIsConnected();
    });
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');

      // Call Solana program here.

      getGifList();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  return (
    <div className="App">
      {/* This was solely added for some styling fanciness */}
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">✨ The Simpsons GIF Portal ✨</p>
          <p className="sub-text">
           Vote for the best scenes
           
           
                 </p>
          {/* Add the condition to show this only if we don't have a wallet address */}
          {!walletAddress && renderNotConnectedContainer()}
          {/* We just need to add the inverse here! */}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={MY_TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${MY_TWITTER_HANDLE}`}</a>
           <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`thanks to  @${TWITTER_HANDLE}`}</a>
          
        </div>
      </div>
    </div>
  );
};

export default App;
