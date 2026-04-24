import { createContext, useContext, useEffect, useRef, useState } from 'react';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket('ws://localhost:5000');
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        try { setLastMessage(JSON.parse(e.data)); } catch {}
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  return (
    <SocketContext.Provider value={{ lastMessage, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
