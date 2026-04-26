import { createContext, useContext, useEffect, useRef, useState } from 'react';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const isDev = window.location.hostname === 'localhost';
      const url = isDev ? `${protocol}//localhost:5001` : `${protocol}//${window.location.host}`;
      
      const ws = new WebSocket(url);
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
