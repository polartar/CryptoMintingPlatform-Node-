import { eSupportedInterfaces, ICoinMetadata } from '../types';
import { config } from '.';

import * as erc20Abi from './ABI/erc20.json';
import * as erc1155Abi from './ABI/erc1155.json';

const { contractAddresses, tokenIds } = config;

const walletConfigurations: ICoinMetadata[] = [
  {
    name: 'Bitcoin',
    backgroundColor: '#FB9A00',
    icon:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjQuMTEgMTkuODcyYTI1LjQzIDI1LjQzIDAgMCAxLS42MTMuMTQ0TDI0Ljc3NiAyNmMuMTQtLjAzLjMwOC0uMDYzLjQ5NS0uMSAyLjA1Ny0uNDA0IDYuNTQzLTEuMjg1IDUuODgtNC4zOS0uNjc4LTMuMTc0LTQuOTUzLTIuMTQyLTcuMDQtMS42Mzh6TTI1LjQyMSAyOS4wMmwxLjQwOSA2LjZjLjE2Ny0uMDM3LjM2NS0uMDc2LjU4Ni0uMTIgMi40NjUtLjQ5IDcuODUyLTEuNTYzIDcuMTIxLTQuOTc5LS43NDctMy40OTMtNS44ODYtMi4yNjYtOC4zODgtMS42NjktLjI3OS4wNjctLjUyNC4xMjUtLjcyOC4xNjl6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yNy42NSA1NC40NzVjMTUuMDQyLS4yMjYgMjcuMDUyLTEyLjYwNCAyNi44MjUtMjcuNjQ2QzU0LjI1IDExLjc4NyA0MS44NzEtLjIyMyAyNi44My4wMDMgMTEuNzg3LjIzLS4yMjMgMTIuNjA3LjAwMyAyNy42NS4yMyA0Mi42OTIgMTIuNjA3IDU0LjcwMiAyNy42NSA1NC40NzV6bTguODEtMzUuNWMuODA4IDIuNTQ0LjA1MyA0LjMzNS0xLjQ5NyA1LjU5MiAzLjAxLjA3NSA1LjE2OCAxLjM5MiA1LjYyOSA1LjI3OC41NzIgNC44MjYtMi42ODggNi44NS03LjY3IDguMjE3bDEuMDYgNC45NzItMyAuNjQxLTEuMDQ3LTQuOTA1Yy0uNzc3LjE2OC0xLjU3NS4zMy0yLjQwMy40OWwxLjA1NCA0LjkyNy0yLjk5Ny42NC0xLjA2Ny00Ljk4Yy0uNzAyLjE0NS0xLjQyLjI4Ni0yLjE0Ny40NGwtMy45MDQuODM1LS4xNy0zLjcwNnMyLjIyOS0uNDQgMi4xODMtLjQ2NmMuODUtLjE4My45NDQtLjg0MS45MTYtMS4yMzVsLTIuODgzLTEzLjQ4OGMtLjI0NC0uNTg0LS43OTItMS4yMDQtMi4wMDctLjk0Ni4wMjgtLjA0OC0yLjE3OS40NjctMi4xNzkuNDY3bC0uNjg0LTMuMiA0LjEzOS0uODgzLjAwMy4wMTVhOTYuMjk3IDk2LjI5NyAwIDAgMCAxLjkwNS0uNDM1bC0xLjA1MS00LjkyMyAyLjk5OC0uNjQgMS4wMzIgNC44MjVjLjc5Ny0uMTg3IDEuNTk5LS4zNzQgMi4zODgtLjU0M2wtMS4wMjMtNC43OTUgMy0uNjQgMS4wNTMgNC45MjNjMy45NDUtLjQ4OCA3LjI2Ny4wNDcgOC4zNjggMy41MjN6IiBmaWxsPSIjZmZmIi8+PC9zdmc+',
    symbol: 'BTC',
    abi: null,
    walletApi: eSupportedInterfaces.btc,
    contractAddress: null,
    decimalPlaces: 8,
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    backgroundColor: '#669AFF',
    icon:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNy42NDYiIGN5PSIyNy42NDYiIHI9IjI3LjIzOSIgdHJhbnNmb3JtPSJyb3RhdGUoLS44NjMgMjcuNjQ2IDI3LjY0NikiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMjcuNDk2IDRsLS4zMTcgMS4wN3YzMS4wNzFsLjMxNy4zMTVMNDEuOTkgMjcuOTMgMjcuNDk2IDR6IiBmaWxsPSIjN0I4OEM3Ii8+PHBhdGggZD0iTTI3LjQ5NiA0TDEzIDI3LjkzbDE0LjQ5NiA4LjUyNlY0eiIgZmlsbD0iI0EyQUFEOCIvPjxwYXRoIGQ9Ik0yNy40OTYgMzkuMTg3bC0uMTc5LjIxNlY1MC40N2wuMTc5LjUxOUw0MiAzMC42NjVsLTE0LjUwNCA4LjUyeiIgZmlsbD0iIzdCODhDNyIvPjxwYXRoIGQ9Ik0yNy40OTYgNTAuOTlWMzkuMTg1TDEzIDMwLjY2NmwxNC40OTYgMjAuMzIzeiIgZmlsbD0iI0EyQUFEOCIvPjxwYXRoIGQ9Ik0yNy40OTYgMzYuNDU2TDQxLjk5IDI3LjkzbC0xNC40OTUtNi41NTZ2MTUuMDh6IiBmaWxsPSIjNUQ2REJDIi8+PHBhdGggZD0iTTEzIDI3LjkzbDE0LjQ5NiA4LjUyNnYtMTUuMDhMMTMgMjcuOTN6IiBmaWxsPSIjN0I4OEM3Ii8+PC9zdmc+',
    abi: null,
    walletApi: eSupportedInterfaces.eth,
    contractAddress: null,
    decimalPlaces: 18,
  },
  {
    name: 'Green',
    symbol: 'GREEN',
    backgroundColor: '#0ACE00',
    icon:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTI3LjY1IDU0LjQ3NWMxNS4wNDItLjIyNiAyNy4wNTItMTIuNjA0IDI2LjgyNS0yNy42NDZDNTQuMjUgMTEuNzg3IDQxLjg3MS0uMjIzIDI2LjgzLjAwMyAxMS43ODcuMjMtLjIyMyAxMi42MDcuMDAzIDI3LjY1LjIzIDQyLjY5MiAxMi42MDcgNTQuNzAyIDI3LjY1IDU0LjQ3NXptMS45NDMtNDMuODgybC0xMiAxOWgxMGwtMiAxNCAxMi0xOC05LTEgMS0xNHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
    abi: erc20Abi,
    walletApi: eSupportedInterfaces.erc20,
    contractAddress: contractAddresses.green,
    decimalPlaces: 8,
  },
  {
    name: 'Gala',
    symbol: 'GALA',
    backgroundColor: '#454545',
    icon:
      'data:image/png;base64,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',
    abi: erc1155Abi,
    walletApi: eSupportedInterfaces.erc1155,
    contractAddress: contractAddresses.gala,
    decimalPlaces: 8,
    tokenId: tokenIds.gala,
  },
  {
    walletApi: eSupportedInterfaces.doc,
    name: 'WinX',
    symbol: 'WinX',
    backgroundColor: '#0066FF',
    icon:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTI4LjA1NyA1NC44ODNjMTUuMDQyLS4yMjcgMjcuMDUyLTEyLjYwNSAyNi44MjYtMjcuNjQ3QzU0LjY1NiAxMi4xOTQgNDIuMjc4LjE4NCAyNy4yMzYuNDEgMTIuMTk0LjYzNy4xODQgMTMuMDE1LjQxIDI4LjA1N2MuMjI3IDE1LjA0MiAxMi42MDUgMjcuMDUyIDI3LjY0NyAyNi44MjZ6TTEwIDE3aDVsNC41IDE0LjUgNi0xNC41SDI5bDYgMTQuNUw0MC41IDE3SDQ1bC03IDIxLjVoLTQuNWwtNi0xNC41TDIyIDM4LjVoLTQuNUwxMCAxN3oiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
    abi: null,
    decimalPlaces: 8,
    contractAddress: null,
  },
];

export const coinSymbolToCoinConfig = new Map<string, ICoinMetadata>(
  walletConfigurations.map(walletConf => [
    walletConf.symbol.toLowerCase(),
    walletConf,
  ]),
);

export default walletConfigurations;
