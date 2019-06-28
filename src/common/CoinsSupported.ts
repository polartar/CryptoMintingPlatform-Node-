import { IEnvCoin, IExportedCoinInterfaceEnv } from '../types';

export default class SupportedCoins {
  private btcEnv: IEnvCoin = {
    dev: {
      name: 'Bitcoin',
      backgroundColor: '#FB9A00',
      icon:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjQuMTEgMTkuODcyYTI1LjQzIDI1LjQzIDAgMCAxLS42MTMuMTQ0TDI0Ljc3NiAyNmMuMTQtLjAzLjMwOC0uMDYzLjQ5NS0uMSAyLjA1Ny0uNDA0IDYuNTQzLTEuMjg1IDUuODgtNC4zOS0uNjc4LTMuMTc0LTQuOTUzLTIuMTQyLTcuMDQtMS42Mzh6TTI1LjQyMSAyOS4wMmwxLjQwOSA2LjZjLjE2Ny0uMDM3LjM2NS0uMDc2LjU4Ni0uMTIgMi40NjUtLjQ5IDcuODUyLTEuNTYzIDcuMTIxLTQuOTc5LS43NDctMy40OTMtNS44ODYtMi4yNjYtOC4zODgtMS42NjktLjI3OS4wNjctLjUyNC4xMjUtLjcyOC4xNjl6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yNy42NSA1NC40NzVjMTUuMDQyLS4yMjYgMjcuMDUyLTEyLjYwNCAyNi44MjUtMjcuNjQ2QzU0LjI1IDExLjc4NyA0MS44NzEtLjIyMyAyNi44My4wMDMgMTEuNzg3LjIzLS4yMjMgMTIuNjA3LjAwMyAyNy42NS4yMyA0Mi42OTIgMTIuNjA3IDU0LjcwMiAyNy42NSA1NC40NzV6bTguODEtMzUuNWMuODA4IDIuNTQ0LjA1MyA0LjMzNS0xLjQ5NyA1LjU5MiAzLjAxLjA3NSA1LjE2OCAxLjM5MiA1LjYyOSA1LjI3OC41NzIgNC44MjYtMi42ODggNi44NS03LjY3IDguMjE3bDEuMDYgNC45NzItMyAuNjQxLTEuMDQ3LTQuOTA1Yy0uNzc3LjE2OC0xLjU3NS4zMy0yLjQwMy40OWwxLjA1NCA0LjkyNy0yLjk5Ny42NC0xLjA2Ny00Ljk4Yy0uNzAyLjE0NS0xLjQyLjI4Ni0yLjE0Ny40NGwtMy45MDQuODM1LS4xNy0zLjcwNnMyLjIyOS0uNDQgMi4xODMtLjQ2NmMuODUtLjE4My45NDQtLjg0MS45MTYtMS4yMzVsLTIuODgzLTEzLjQ4OGMtLjI0NC0uNTg0LS43OTItMS4yMDQtMi4wMDctLjk0Ni4wMjgtLjA0OC0yLjE3OS40NjctMi4xNzkuNDY3bC0uNjg0LTMuMiA0LjEzOS0uODgzLjAwMy4wMTVhOTYuMjk3IDk2LjI5NyAwIDAgMCAxLjkwNS0uNDM1bC0xLjA1MS00LjkyMyAyLjk5OC0uNjQgMS4wMzIgNC44MjVjLjc5Ny0uMTg3IDEuNTk5LS4zNzQgMi4zODgtLjU0M2wtMS4wMjMtNC43OTUgMy0uNjQgMS4wNTMgNC45MjNjMy45NDUtLjQ4OCA3LjI2Ny4wNDcgOC4zNjggMy41MjN6IiBmaWxsPSIjZmZmIi8+PC9zdmc+',
      symbol: 'BTC',
      abi: null,
      contractAddress: null,
      decimalPlaces: 8,
    },
    prod: {
      name: 'Bitcoin',
      backgroundColor: '#FB9A00',
      icon:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjQuMTEgMTkuODcyYTI1LjQzIDI1LjQzIDAgMCAxLS42MTMuMTQ0TDI0Ljc3NiAyNmMuMTQtLjAzLjMwOC0uMDYzLjQ5NS0uMSAyLjA1Ny0uNDA0IDYuNTQzLTEuMjg1IDUuODgtNC4zOS0uNjc4LTMuMTc0LTQuOTUzLTIuMTQyLTcuMDQtMS42Mzh6TTI1LjQyMSAyOS4wMmwxLjQwOSA2LjZjLjE2Ny0uMDM3LjM2NS0uMDc2LjU4Ni0uMTIgMi40NjUtLjQ5IDcuODUyLTEuNTYzIDcuMTIxLTQuOTc5LS43NDctMy40OTMtNS44ODYtMi4yNjYtOC4zODgtMS42NjktLjI3OS4wNjctLjUyNC4xMjUtLjcyOC4xNjl6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yNy42NSA1NC40NzVjMTUuMDQyLS4yMjYgMjcuMDUyLTEyLjYwNCAyNi44MjUtMjcuNjQ2QzU0LjI1IDExLjc4NyA0MS44NzEtLjIyMyAyNi44My4wMDMgMTEuNzg3LjIzLS4yMjMgMTIuNjA3LjAwMyAyNy42NS4yMyA0Mi42OTIgMTIuNjA3IDU0LjcwMiAyNy42NSA1NC40NzV6bTguODEtMzUuNWMuODA4IDIuNTQ0LjA1MyA0LjMzNS0xLjQ5NyA1LjU5MiAzLjAxLjA3NSA1LjE2OCAxLjM5MiA1LjYyOSA1LjI3OC41NzIgNC44MjYtMi42ODggNi44NS03LjY3IDguMjE3bDEuMDYgNC45NzItMyAuNjQxLTEuMDQ3LTQuOTA1Yy0uNzc3LjE2OC0xLjU3NS4zMy0yLjQwMy40OWwxLjA1NCA0LjkyNy0yLjk5Ny42NC0xLjA2Ny00Ljk4Yy0uNzAyLjE0NS0xLjQyLjI4Ni0yLjE0Ny40NGwtMy45MDQuODM1LS4xNy0zLjcwNnMyLjIyOS0uNDQgMi4xODMtLjQ2NmMuODUtLjE4My45NDQtLjg0MS45MTYtMS4yMzVsLTIuODgzLTEzLjQ4OGMtLjI0NC0uNTg0LS43OTItMS4yMDQtMi4wMDctLjk0Ni4wMjgtLjA0OC0yLjE3OS40NjctMi4xNzkuNDY3bC0uNjg0LTMuMiA0LjEzOS0uODgzLjAwMy4wMTVhOTYuMjk3IDk2LjI5NyAwIDAgMCAxLjkwNS0uNDM1bC0xLjA1MS00LjkyMyAyLjk5OC0uNjQgMS4wMzIgNC44MjVjLjc5Ny0uMTg3IDEuNTk5LS4zNzQgMi4zODgtLjU0M2wtMS4wMjMtNC43OTUgMy0uNjQgMS4wNTMgNC45MjNjMy45NDUtLjQ4OCA3LjI2Ny4wNDcgOC4zNjggMy41MjN6IiBmaWxsPSIjZmZmIi8+PC9zdmc+',
      symbol: 'BTC',
      abi: null,
      contractAddress: null,
      decimalPlaces: 8,
    },
  };

  private ethEnv: IEnvCoin = {
    dev: {
      name: 'Ethereum',
      symbol: 'ETH',
      backgroundColor: '#669AFF',
      icon:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNy42NDYiIGN5PSIyNy42NDYiIHI9IjI3LjIzOSIgdHJhbnNmb3JtPSJyb3RhdGUoLS44NjMgMjcuNjQ2IDI3LjY0NikiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMjcuNDk2IDRsLS4zMTcgMS4wN3YzMS4wNzFsLjMxNy4zMTVMNDEuOTkgMjcuOTMgMjcuNDk2IDR6IiBmaWxsPSIjN0I4OEM3Ii8+PHBhdGggZD0iTTI3LjQ5NiA0TDEzIDI3LjkzbDE0LjQ5NiA4LjUyNlY0eiIgZmlsbD0iI0EyQUFEOCIvPjxwYXRoIGQ9Ik0yNy40OTYgMzkuMTg3bC0uMTc5LjIxNlY1MC40N2wuMTc5LjUxOUw0MiAzMC42NjVsLTE0LjUwNCA4LjUyeiIgZmlsbD0iIzdCODhDNyIvPjxwYXRoIGQ9Ik0yNy40OTYgNTAuOTlWMzkuMTg1TDEzIDMwLjY2NmwxNC40OTYgMjAuMzIzeiIgZmlsbD0iI0EyQUFEOCIvPjxwYXRoIGQ9Ik0yNy40OTYgMzYuNDU2TDQxLjk5IDI3LjkzbC0xNC40OTUtNi41NTZ2MTUuMDh6IiBmaWxsPSIjNUQ2REJDIi8+PHBhdGggZD0iTTEzIDI3LjkzbDE0LjQ5NiA4LjUyNnYtMTUuMDhMMTMgMjcuOTN6IiBmaWxsPSIjN0I4OEM3Ii8+PC9zdmc+',
      abi: null,
      contractAddress: null,
      decimalPlaces: 18,
    },
    prod: {
      name: 'Ethereum',
      symbol: 'ETH',
      backgroundColor: '#669AFF',
      icon:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNy42NDYiIGN5PSIyNy42NDYiIHI9IjI3LjIzOSIgdHJhbnNmb3JtPSJyb3RhdGUoLS44NjMgMjcuNjQ2IDI3LjY0NikiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMjcuNDk2IDRsLS4zMTcgMS4wN3YzMS4wNzFsLjMxNy4zMTVMNDEuOTkgMjcuOTMgMjcuNDk2IDR6IiBmaWxsPSIjN0I4OEM3Ii8+PHBhdGggZD0iTTI3LjQ5NiA0TDEzIDI3LjkzbDE0LjQ5NiA4LjUyNlY0eiIgZmlsbD0iI0EyQUFEOCIvPjxwYXRoIGQ9Ik0yNy40OTYgMzkuMTg3bC0uMTc5LjIxNlY1MC40N2wuMTc5LjUxOUw0MiAzMC42NjVsLTE0LjUwNCA4LjUyeiIgZmlsbD0iIzdCODhDNyIvPjxwYXRoIGQ9Ik0yNy40OTYgNTAuOTlWMzkuMTg1TDEzIDMwLjY2NmwxNC40OTYgMjAuMzIzeiIgZmlsbD0iI0EyQUFEOCIvPjxwYXRoIGQ9Ik0yNy40OTYgMzYuNDU2TDQxLjk5IDI3LjkzbC0xNC40OTUtNi41NTZ2MTUuMDh6IiBmaWxsPSIjNUQ2REJDIi8+PHBhdGggZD0iTTEzIDI3LjkzbDE0LjQ5NiA4LjUyNnYtMTUuMDhMMTMgMjcuOTN6IiBmaWxsPSIjN0I4OEM3Ii8+PC9zdmc+',
      abi: null,
      contractAddress: null,
      decimalPlaces: 18,
    },
  };

  private erc20sEnv: IEnvCoin[] = [
    {
      dev: {
        name: 'Green',
        symbol: 'GREEN',
        backgroundColor: '#0ACE00',
        icon:
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTI3LjY1IDU0LjQ3NWMxNS4wNDItLjIyNiAyNy4wNTItMTIuNjA0IDI2LjgyNS0yNy42NDZDNTQuMjUgMTEuNzg3IDQxLjg3MS0uMjIzIDI2LjgzLjAwMyAxMS43ODcuMjMtLjIyMyAxMi42MDcuMDAzIDI3LjY1LjIzIDQyLjY5MiAxMi42MDcgNTQuNzAyIDI3LjY1IDU0LjQ3NXptMS45NDMtNDMuODgybC0xMiAxOWgxMGwtMiAxNCAxMi0xOC05LTEgMS0xNHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
        abi: [
          {
            constant: false,
            inputs: [
              {
                name: 'distAddresses',
                type: 'address[]',
              },
              {
                name: 'distValues',
                type: 'uint256[]',
              },
            ],
            name: 'distributeMinting',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'name',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'spender',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'approve',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'totalSupply',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'from',
                type: 'address',
              },
              {
                name: 'to',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'transferFrom',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'decimals',
            outputs: [
              {
                name: '',
                type: 'uint8',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: '_totalSupply',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_value',
                type: 'uint256',
              },
            ],
            name: 'burn',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'tokenOwner',
                type: 'address',
              },
            ],
            name: 'balanceOf',
            outputs: [
              {
                name: 'balance',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [],
            name: 'acceptOwnership',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'owner',
            outputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'symbol',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'a',
                type: 'uint256',
              },
              {
                name: 'b',
                type: 'uint256',
              },
            ],
            name: 'safeSub',
            outputs: [
              {
                name: 'c',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'pure',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'to',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'transfer',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'spender',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
              {
                name: 'data',
                type: 'bytes',
              },
            ],
            name: 'approveAndCall',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'newOwner',
            outputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'tokenAddress',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'transferAnyERC20Token',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'tokenOwner',
                type: 'address',
              },
              {
                name: 'spender',
                type: 'address',
              },
            ],
            name: 'allowance',
            outputs: [
              {
                name: 'remaining',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'a',
                type: 'uint256',
              },
              {
                name: 'b',
                type: 'uint256',
              },
            ],
            name: 'safeAdd',
            outputs: [
              {
                name: 'c',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'pure',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_newOwner',
                type: 'address',
              },
            ],
            name: 'transferOwnership',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            inputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'constructor',
          },
          {
            payable: true,
            stateMutability: 'payable',
            type: 'fallback',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: '_from',
                type: 'address',
              },
              {
                indexed: true,
                name: '_to',
                type: 'address',
              },
            ],
            name: 'OwnershipTransferred',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'from',
                type: 'address',
              },
              {
                indexed: true,
                name: 'to',
                type: 'address',
              },
              {
                indexed: false,
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'Transfer',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'tokenOwner',
                type: 'address',
              },
              {
                indexed: true,
                name: 'spender',
                type: 'address',
              },
              {
                indexed: false,
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'Approval',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'from',
                type: 'address',
              },
              {
                indexed: false,
                name: 'value',
                type: 'uint256',
              },
            ],
            name: 'Burn',
            type: 'event',
          },
        ],
        contractAddress: '0x1c3940bc09bb356af76c75a80d86313d620faa32',
        decimalPlaces: 18,
      },
      prod: {
        name: 'Green',
        symbol: 'GREEN',
        backgroundColor: '#0ACE00',
        icon:
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTI3LjY1IDU0LjQ3NWMxNS4wNDItLjIyNiAyNy4wNTItMTIuNjA0IDI2LjgyNS0yNy42NDZDNTQuMjUgMTEuNzg3IDQxLjg3MS0uMjIzIDI2LjgzLjAwMyAxMS43ODcuMjMtLjIyMyAxMi42MDcuMDAzIDI3LjY1LjIzIDQyLjY5MiAxMi42MDcgNTQuNzAyIDI3LjY1IDU0LjQ3NXptMS45NDMtNDMuODgybC0xMiAxOWgxMGwtMiAxNCAxMi0xOC05LTEgMS0xNHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
        abi: [
          {
            constant: false,
            inputs: [
              {
                name: 'distAddresses',
                type: 'address[]',
              },
              {
                name: 'distValues',
                type: 'uint256[]',
              },
            ],
            name: 'distributeMinting',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'name',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'spender',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'approve',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'totalSupply',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'from',
                type: 'address',
              },
              {
                name: 'to',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'transferFrom',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'decimals',
            outputs: [
              {
                name: '',
                type: 'uint8',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: '_totalSupply',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_value',
                type: 'uint256',
              },
            ],
            name: 'burn',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'tokenOwner',
                type: 'address',
              },
            ],
            name: 'balanceOf',
            outputs: [
              {
                name: 'balance',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [],
            name: 'acceptOwnership',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'owner',
            outputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'symbol',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'a',
                type: 'uint256',
              },
              {
                name: 'b',
                type: 'uint256',
              },
            ],
            name: 'safeSub',
            outputs: [
              {
                name: 'c',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'pure',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'to',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'transfer',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'spender',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
              {
                name: 'data',
                type: 'bytes',
              },
            ],
            name: 'approveAndCall',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'newOwner',
            outputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'tokenAddress',
                type: 'address',
              },
              {
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'transferAnyERC20Token',
            outputs: [
              {
                name: 'success',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'tokenOwner',
                type: 'address',
              },
              {
                name: 'spender',
                type: 'address',
              },
            ],
            name: 'allowance',
            outputs: [
              {
                name: 'remaining',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'a',
                type: 'uint256',
              },
              {
                name: 'b',
                type: 'uint256',
              },
            ],
            name: 'safeAdd',
            outputs: [
              {
                name: 'c',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'pure',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: '_newOwner',
                type: 'address',
              },
            ],
            name: 'transferOwnership',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            inputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'constructor',
          },
          {
            payable: true,
            stateMutability: 'payable',
            type: 'fallback',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: '_from',
                type: 'address',
              },
              {
                indexed: true,
                name: '_to',
                type: 'address',
              },
            ],
            name: 'OwnershipTransferred',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'from',
                type: 'address',
              },
              {
                indexed: true,
                name: 'to',
                type: 'address',
              },
              {
                indexed: false,
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'Transfer',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'tokenOwner',
                type: 'address',
              },
              {
                indexed: true,
                name: 'spender',
                type: 'address',
              },
              {
                indexed: false,
                name: 'tokens',
                type: 'uint256',
              },
            ],
            name: 'Approval',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'from',
                type: 'address',
              },
              {
                indexed: false,
                name: 'value',
                type: 'uint256',
              },
            ],
            name: 'Burn',
            type: 'event',
          },
        ],
        contractAddress: '0xb2089a7069861c8d90c8da3aacab8e9188c0c531',
        decimalPlaces: 18,
      },
    },
  ];
  public prod: IExportedCoinInterfaceEnv;
  public dev: IExportedCoinInterfaceEnv;

  constructor() {
    this.prod = {
      btc: this.btcEnv.prod,
      eth: this.ethEnv.prod,
      erc20s: this.erc20sEnv.map(erc20 => erc20.prod),
    };

    this.dev = {
      btc: this.btcEnv.dev,
      eth: this.ethEnv.dev,
      erc20s: this.erc20sEnv.map(erc20 => erc20.dev),
    };
  }
}