import { createContext, useContext } from 'react';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  // WebSockets are disabled in this serverless version. 
  // We provide a dummy context to avoid breaking existing components.
  return (
    <SocketContext.Provider value={{ connected: false, lastMessage: null }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
