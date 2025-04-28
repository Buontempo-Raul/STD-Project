// server.js - Backend pentru sistemul de chat
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Configurare Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Crearea serverului HTTP
const server = http.createServer(app);

// Configurare WebSocket Server
const wss = new WebSocket.Server({ 
  server: server,
  // Eliminăm restricția de cale pentru a simplifica debugging-ul
});

// Conectare la MongoDB
mongoose.connect('mongodb://root:example@mongodb:27017/chat?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Conectat la MongoDB');
}).catch(err => {
  console.error('Eroare conectare MongoDB:', err);
});

// Definirea schemei pentru mesaje
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Endpoint pentru preluarea tuturor mesajelor
app.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gestionarea conexiunilor WebSocket
wss.on('connection', (ws, req) => {
  console.log('Client conectat de la:', req.socket.remoteAddress);
  console.log('Total clienți conectați:', wss.clients.size);
  
  // Trimiterea mesajelor existente către client la conectare
  Message.find().sort({ timestamp: 1 })
    .then(messages => {
      console.log('Trimit istoric cu', messages.length, 'mesaje');
      
      const historyData = {
        type: 'history',
        data: messages
      };
      
      try {
        ws.send(JSON.stringify(historyData));
        console.log('Istoric trimis cu succes');
      } catch (error) {
        console.error('Eroare la trimiterea istoricului:', error);
      }
    })
    .catch(err => {
      console.error('Eroare la încărcarea mesajelor:', err);
    });

  // Primirea mesajelor de la client
  ws.on('message', async (message) => {
    try {
      const messageString = message.toString();
      console.log('Mesaj raw primit:', messageString);
      
      const data = JSON.parse(messageString);
      console.log('Mesaj parsat:', data);
      
      if (!data.username || !data.message) {
        console.error('Date incomplete:', data);
        return;
      }
      
      // Salvarea mesajului în baza de date
      const newMessage = new Message({
        username: data.username,
        message: data.message,
        timestamp: new Date()
      });
      
      console.log('Salvez mesaj în baza de date:', {
        username: newMessage.username,
        message: newMessage.message,
        timestamp: newMessage.timestamp
      });
      
      await newMessage.save();
      console.log('Mesaj salvat cu ID:', newMessage._id);
      
      // Transmiterea mesajului către toți clienții conectați
      const broadcastMessage = {
        type: 'message',
        data: {
          _id: newMessage._id,
          username: newMessage.username,
          message: newMessage.message,
          timestamp: newMessage.timestamp
        }
      };
      
      console.log('Trimit broadcast către', wss.clients.size, 'clienți');
      let clientCount = 0;
      
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(JSON.stringify(broadcastMessage));
            clientCount++;
          } catch (err) {
            console.error('Eroare la trimiterea către client:', err);
          }
        }
      });
      
      console.log('Mesaj trimis către', clientCount, 'clienți');
      
    } catch (err) {
      console.error('Eroare la procesarea mesajului:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client deconectat. Total clienți rămași:', wss.clients.size);
  });

  ws.on('error', (error) => {
    console.error('Eroare cu clientul WebSocket:', error);
  });

  ws.on('close', () => {
    console.log('Client deconectat');
  });
});

// Portul pe care va rula serverul
const PORT = process.env.PORT || 88;

// Adăugăm un endpoint de test simplu
app.get('/', (req, res) => {
  res.send('Serverul de chat funcționează!');
});

// Pornire server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
});