# Wallet-Server

Service as gateway for the blockchain space.



## Optional Install Of Outside Systems

### bcoin running locally (It may take a very long time to sync up the blockchain, so this should probably be the first order of business.

1. copy .bcoin folder from flash drive into your home directory ~/ - This folder is enormous, so I'm hoping that it has parsed blocks saved in that folder so that it doesn't take so long to sync up
2. Open a new terminal
3. RUN: npm i -g bcoin
4. RUN: bcoin
5. You will know it is synced when the messages in the command line start moving somewhat slowly instead of at light speed

### MongoDB - I used a locally running mongodb instance for development since a stage DB wasn't set up when I started. https://treehouse.github.io/installation-guides/mac/mongo-mac.html

### Redis

1. Copy redis.conf from flash drive to /usr/local/etc/redis.conf
2. Open a new terminal
3. RUN: redis-server /usr/local/etc/redis.conf
4. if you ever need to know the password to use redis-cli or something, the password is foobared
5. API Key Service - Used to store private keys, mnemonics, passwords, tokens, etc

### API Key Service Running Locally

1. Copy api-key-service from flash drive into your development folder (.env and development public and private keys for JWT already included)
2. Open a new terminal
3. RUN: npm i
4. RUN: npm run dev

### Mock OVH API Key Service - API Key Service will break if it doesn't have an OVH version to talk to

1. Copy api-key-service-mock-ovh from flash drive into your development folder (.env and development public and private keys for JWT already included)
2. Open a new terminal
3. RUN npm i
4. RUN npm run dev

### Wallet Server

1. pull down the WIP-MSTR-1493 branch from the https://git.netzilla.co/bb/wallet-server repository
2. copy .env-wallet-server from flash drive to the root of your newly cloned repository
3. Rename .env-wallet-server to .env
4. RUN npm i
5. RUN npm run dev
6. RECAP: 6 terminals running: bcoin, MongoDB (unless you connect to a remote DB), Redis, API Key Service, Mock OVH API Key Service, Wallet Server

## Architecture

I started a graphQL server from the platform-starter package and copied in all of the code from my days working on the BCoin interface.

My first order of business was to get the server compiling typescript and listening without errors which I did.

The intention was to build things in a way that was easiest to implement on the front end.

- There are a set of schemas/resolvers set up to do full CRUD operations on accounts. Some hardening may be necessary to prevent duplicate account names, a limit of the number of allowed accounts, etc. This is all done through the account Data Source.
- There is a separate set of schemas/resolvers set up for the wallet operations. The intention was to allow an optional argument to limit to one specific coin in which only that coin's data would be returned, or if the argument is omitted, all coins would be returned. I was seriously contemplating changing it to make the argument mandatory and pass 'all' as the argument to be more explicit.

In order to provide this flexibility, there is a wallet data source that has a getCoinAPI method that takes in a symbol, and returns the appropriate interface. i.e if 'BTC' is passed in, it returns the btc-wallet interface that interacts with bcoin. If 'ETH' is passed in, it returns the eth-wallet that uses web3 to interact with the ETH blockchain.

Each of these wallet interfaces extend the abstract Wallet-Base class (located in the common folder) to ensure that every wallet interface implements the same required methods which return the exact same shape of data for each method. This makes it predictable to display on the front end.

I was able to implement the getBalance query successfully for btc after creating an account. See the notated code to get an idea of how that is accomplished.

## Wishlist

Ideally for the ERC20 tokens, I want it to request all of the required data to create a new instance of the wallet from a mongoDb collection so that later on, if we want to add an ERC20 token, we just have to add all of the required fields (like the Name, symbol, ABI, and contractAddress to the database instead of hard-coding all of it). It would probably be more efficient to query as the server starts so that we don't need to make a db call with every request.

## Conclusion
