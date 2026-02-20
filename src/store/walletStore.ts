import { create } from 'zustand'
import type { Wallet } from '../types'

interface WalletState {
  wallet: Wallet | null
  setWallet: (wallet: Wallet) => void
  updateBalance: (balance: number, exposure: number) => void
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,

  setWallet: (wallet) => set({ wallet }),

  updateBalance: (balance, exposure) =>
    set((state) => ({
      wallet: state.wallet
        ? { ...state.wallet, balance, exposure, availableBalance: balance - exposure }
        : null,
    })),
}))
