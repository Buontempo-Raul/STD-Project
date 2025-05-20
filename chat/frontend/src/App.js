import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Conectare la WebSocket server
  useEffect(() => {
    if (username && !wsConnected) {
      // Folosim calea relativă prin proxy Nginx      
      let wsUrl = 'ws://4.213.180.54/ws';

      console.log("Connecting to WebSocket at:", wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Conectat la WebSocket');
        setWsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        console.log('Mesaj primit:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'history') {
            console.log('Am primit istoric cu', data.data ? data.data.length : 0, 'mesaje');
            setMessages(data.data || []);
          } else if (data.type === 'message') {
            console.log('Am primit mesaj nou:', data.data);
            setMessages(prevMessages => [...prevMessages, data.data]);
          }
        } catch (err) {
          console.error('Eroare la parsarea datelor primite:', err, event.data);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Deconectat de la WebSocket. Cod:', event.code, 'Motiv:', event.reason);
        setWsConnected(false);
      };

      wsRef.current.onerror = (error) => {
        console.error('Eroare WebSocket:', error);
      };

      // Cleanup la deconectare
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [username, wsConnected]);

  // Scroll automat la ultimul mesaj
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Trimitere mesaj
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (input.trim() && wsRef.current) {
      // Verificare stare conexiune
      if (wsRef.current.readyState !== WebSocket.OPEN) {
        console.error('WebSocket nu este deschis. Stare:', wsRef.current.readyState);
        alert('Conexiunea la server nu este disponibilă. Reîncarcă pagina și încearcă din nou.');
        return;
      }
      
      const message = {
        username: username,
        message: input
      };
      
      console.log('Trimit mesaj:', message);
      try {
        wsRef.current.send(JSON.stringify(message));
        setInput('');
      } catch (err) {
        console.error('Eroare la trimiterea mesajului:', err);
        alert('Eroare la trimiterea mesajului. Reîncarcă pagina și încearcă din nou.');
      }
    }
  };

  // Salvarea numelui de utilizator
  const saveUsername = (e) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      setUsername(usernameInput);
      setConnected(true);
    }
  };

  // Formatarea datei pentru afișare
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="chat-container">
      <h2>Chat în timp real</h2>
      
      {!connected ? (
        <div className="username-form">
          <form onSubmit={saveUsername}>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Numele tău..."
              required
            />
            <button type="submit">Intră în chat</button>
          </form>
        </div>
      ) : (
        <>
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div 
                key={msg._id || index} 
                className={`message ${msg.username === username ? 'own-message' : ''}`}
              >
                <div className="message-header">
                  <strong>{msg.username}</strong>
                  <span className="timestamp">{formatDate(msg.timestamp)}</span>
                </div>
                <div className="message-content">{msg.message}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={sendMessage} className="message-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrie un mesaj..."
              required
            />
            <button type="submit">Trimite</button>
          </form>
        </>
      )}
    </div>
  );
}

export default App;