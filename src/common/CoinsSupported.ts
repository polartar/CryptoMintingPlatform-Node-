import { IEnvCoin, IExportedCoinInterfaceEnv } from '../types'

export default class SupportedCoins {
  private btcEnv: IEnvCoin = {
    dev: {
      "name": "Bitcoin",
      "backgroundColor": "#FB9A00",
      "icon": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1920px-Bitcoin.svg.png",
      "symbol": "BTC",
      "abi": null,
      "contractAddress": null,
      "decimalPlaces": 8
    },
    prod: {
      "name": "Bitcoin",
      "backgroundColor": "#FB9A00",
      "icon": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1920px-Bitcoin.svg.png",
      "symbol": "BTC",
      "abi": null,
      "contractAddress": null,
      "decimalPlaces": 8
    }
  }

  private ethEnv: IEnvCoin = {
    dev: {
      "name": "Ethereum",
      "symbol": "ETH",
      "backgroundColor": "#669AFF",
      "icon": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ethereum_logo_2014.svg/628px-Ethereum_logo_2014.svg.png",
      "abi": null,
      "contractAddress": null,
      "decimalPlaces": 18
    },
    prod: {
      "name": "Ethereum",
      "symbol": "ETH",
      "backgroundColor": "#669AFF",
      "icon": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ethereum_logo_2014.svg/628px-Ethereum_logo_2014.svg.png",
      "abi": null,
      "contractAddress": null,
      "decimalPlaces": 18
    }
  }

  private erc20sEnv: IEnvCoin[] = [
    {
      dev: {
        "name": "Green",
        "symbol": "GREEN",
        "backgroundColor": "#0ACE00",
        "icon": "data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMTMzLjcgMjIwLjUiPjxzdHlsZT4uc3Qwe2ZpbGwtcnVsZTpldmVub2RkO2NsaXAtcnVsZTpldmVub2RkO2ZpbGw6IzY2OTA3M308L3N0eWxlPjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yLjQgOTguOGw2NS0yNy40IDYzIDI4LjFMNjcuMyAwem0uMiAzMC40bDY0LjkgMzcuNiA2Ni4yLTM3LjYtNjUuNiA5MS4zeiIvPjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik02Ny43IDg0LjhMMCAxMTMuM2w2Ny43IDM3LjYgNjUuOC0zNi44eiIvPjwvc3ZnPg==",
        "abi": [
          {
            "constant": false,
            "inputs": [
              {
                "name": "distAddresses",
                "type": "address[]"
              },
              {
                "name": "distValues",
                "type": "uint256[]"
              }
            ],
            "name": "distributeMinting",
            "outputs": [
              {
                "name": "success",
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
                "name": "spender",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "approve",
            "outputs": [
              {
                "name": "success",
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
                "name": "from",
                "type": "address"
              },
              {
                "name": "to",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "transferFrom",
            "outputs": [
              {
                "name": "success",
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
            "inputs": [],
            "name": "_totalSupply",
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
                "name": "_value",
                "type": "uint256"
              }
            ],
            "name": "burn",
            "outputs": [
              {
                "name": "success",
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
                "name": "tokenOwner",
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
            "constant": false,
            "inputs": [],
            "name": "acceptOwnership",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "constant": true,
            "inputs": [],
            "name": "owner",
            "outputs": [
              {
                "name": "",
                "type": "address"
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
            "constant": true,
            "inputs": [
              {
                "name": "a",
                "type": "uint256"
              },
              {
                "name": "b",
                "type": "uint256"
              }
            ],
            "name": "safeSub",
            "outputs": [
              {
                "name": "c",
                "type": "uint256"
              }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
          },
          {
            "constant": false,
            "inputs": [
              {
                "name": "to",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "transfer",
            "outputs": [
              {
                "name": "success",
                "type": "bool"
              }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "constant": false,
            "inputs": [
              {
                "name": "spender",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              },
              {
                "name": "data",
                "type": "bytes"
              }
            ],
            "name": "approveAndCall",
            "outputs": [
              {
                "name": "success",
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
            "name": "newOwner",
            "outputs": [
              {
                "name": "",
                "type": "address"
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
                "name": "tokenAddress",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "transferAnyERC20Token",
            "outputs": [
              {
                "name": "success",
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
                "name": "tokenOwner",
                "type": "address"
              },
              {
                "name": "spender",
                "type": "address"
              }
            ],
            "name": "allowance",
            "outputs": [
              {
                "name": "remaining",
                "type": "uint256"
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
                "name": "a",
                "type": "uint256"
              },
              {
                "name": "b",
                "type": "uint256"
              }
            ],
            "name": "safeAdd",
            "outputs": [
              {
                "name": "c",
                "type": "uint256"
              }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
          },
          {
            "constant": false,
            "inputs": [
              {
                "name": "_newOwner",
                "type": "address"
              }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "constructor"
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
                "name": "_from",
                "type": "address"
              },
              {
                "indexed": true,
                "name": "_to",
                "type": "address"
              }
            ],
            "name": "OwnershipTransferred",
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
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "Transfer",
            "type": "event"
          },
          {
            "anonymous": false,
            "inputs": [
              {
                "indexed": true,
                "name": "tokenOwner",
                "type": "address"
              },
              {
                "indexed": true,
                "name": "spender",
                "type": "address"
              },
              {
                "indexed": false,
                "name": "tokens",
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
                "indexed": false,
                "name": "value",
                "type": "uint256"
              }
            ],
            "name": "Burn",
            "type": "event"
          }
        ],
        "contractAddress": "0x1c3940bc09bb356af76c75a80d86313d620faa32",
        "decimalPlaces": 18
      },
      prod: {
        "name": "Green",
        "symbol": "GREEN",
        "backgroundColor": "#0ACE00",
        "icon": "data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMTMzLjcgMjIwLjUiPjxzdHlsZT4uc3Qwe2ZpbGwtcnVsZTpldmVub2RkO2NsaXAtcnVsZTpldmVub2RkO2ZpbGw6IzY2OTA3M308L3N0eWxlPjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yLjQgOTguOGw2NS0yNy40IDYzIDI4LjFMNjcuMyAwem0uMiAzMC40bDY0LjkgMzcuNiA2Ni4yLTM3LjYtNjUuNiA5MS4zeiIvPjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik02Ny43IDg0LjhMMCAxMTMuM2w2Ny43IDM3LjYgNjUuOC0zNi44eiIvPjwvc3ZnPg==",
        "abi": [
          {
            "constant": false,
            "inputs": [
              {
                "name": "distAddresses",
                "type": "address[]"
              },
              {
                "name": "distValues",
                "type": "uint256[]"
              }
            ],
            "name": "distributeMinting",
            "outputs": [
              {
                "name": "success",
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
                "name": "spender",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "approve",
            "outputs": [
              {
                "name": "success",
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
                "name": "from",
                "type": "address"
              },
              {
                "name": "to",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "transferFrom",
            "outputs": [
              {
                "name": "success",
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
            "inputs": [],
            "name": "_totalSupply",
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
                "name": "_value",
                "type": "uint256"
              }
            ],
            "name": "burn",
            "outputs": [
              {
                "name": "success",
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
                "name": "tokenOwner",
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
            "constant": false,
            "inputs": [],
            "name": "acceptOwnership",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "constant": true,
            "inputs": [],
            "name": "owner",
            "outputs": [
              {
                "name": "",
                "type": "address"
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
            "constant": true,
            "inputs": [
              {
                "name": "a",
                "type": "uint256"
              },
              {
                "name": "b",
                "type": "uint256"
              }
            ],
            "name": "safeSub",
            "outputs": [
              {
                "name": "c",
                "type": "uint256"
              }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
          },
          {
            "constant": false,
            "inputs": [
              {
                "name": "to",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "transfer",
            "outputs": [
              {
                "name": "success",
                "type": "bool"
              }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "constant": false,
            "inputs": [
              {
                "name": "spender",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              },
              {
                "name": "data",
                "type": "bytes"
              }
            ],
            "name": "approveAndCall",
            "outputs": [
              {
                "name": "success",
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
            "name": "newOwner",
            "outputs": [
              {
                "name": "",
                "type": "address"
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
                "name": "tokenAddress",
                "type": "address"
              },
              {
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "transferAnyERC20Token",
            "outputs": [
              {
                "name": "success",
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
                "name": "tokenOwner",
                "type": "address"
              },
              {
                "name": "spender",
                "type": "address"
              }
            ],
            "name": "allowance",
            "outputs": [
              {
                "name": "remaining",
                "type": "uint256"
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
                "name": "a",
                "type": "uint256"
              },
              {
                "name": "b",
                "type": "uint256"
              }
            ],
            "name": "safeAdd",
            "outputs": [
              {
                "name": "c",
                "type": "uint256"
              }
            ],
            "payable": false,
            "stateMutability": "pure",
            "type": "function"
          },
          {
            "constant": false,
            "inputs": [
              {
                "name": "_newOwner",
                "type": "address"
              }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "constructor"
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
                "name": "_from",
                "type": "address"
              },
              {
                "indexed": true,
                "name": "_to",
                "type": "address"
              }
            ],
            "name": "OwnershipTransferred",
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
                "name": "tokens",
                "type": "uint256"
              }
            ],
            "name": "Transfer",
            "type": "event"
          },
          {
            "anonymous": false,
            "inputs": [
              {
                "indexed": true,
                "name": "tokenOwner",
                "type": "address"
              },
              {
                "indexed": true,
                "name": "spender",
                "type": "address"
              },
              {
                "indexed": false,
                "name": "tokens",
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
                "indexed": false,
                "name": "value",
                "type": "uint256"
              }
            ],
            "name": "Burn",
            "type": "event"
          }
        ],
        "contractAddress": "0xb2089a7069861c8d90c8da3aacab8e9188c0c531",
        "decimalPlaces": 18
      }
    }
  ]
  public prod: IExportedCoinInterfaceEnv;
  public dev: IExportedCoinInterfaceEnv

  constructor() {
    this.prod = { btc: this.btcEnv.prod, eth: this.ethEnv.prod, erc20s: this.erc20sEnv.map(erc20 => erc20.prod) }

    this.dev = { btc: this.btcEnv.dev, eth: this.ethEnv.dev, erc20s: this.erc20sEnv.map(erc20 => erc20.dev) }
  }
}










