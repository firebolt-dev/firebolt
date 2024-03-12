import { createContext, useContext } from 'react'

const BoardContext = createContext()

export function BoardProvider({ value, children }) {
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard() {
  return useContext(BoardContext)
}
