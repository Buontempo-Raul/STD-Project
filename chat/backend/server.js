// server.js - Backend pentru sistemul de chat
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const Redis = require('redis');

const IP_ADDRESS = process.env.IP_ADDRESS || '0.0.0.0';

// Configurare Express
const app = express();
app.use(cors({
  origin: '*', // In production, specify actual allowed origins
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// Crearea serverului HTTP
const server = http.createServer(app);

// Configurare WebSocket Server
const wss = new WebSocket.Server({ 
  server: server,
  // Remove path restrictions completely
  path: undefined,
  verifyClient: (info) => {
    // Log connection attempts for debugging
    console.log('Connection attempt from:', info.req.socket.remoteAddress);
    console.log('Connection path:', info.req.url);
    console.log('Connection headers:', JSON.stringify(info.req.headers, null, 2));
    // Accept all connections, regardless of path
    return true;
  }
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:example@mongodb:27017/chat?authSource=admin';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// Create Redis publisher and subscriber clients
const redisPublisher = Redis.createClient({
  url: REDIS_URL
});
const redisSubscriber = Redis.createClient({
  url: REDIS_URL
});

// Connect to Redis
async function connectRedis() {
  try {
    await redisPublisher.connect();
    await redisSubscriber.connect();
    console.log('Connected to Redis');
    
    // Subscribe to the message channel
    await redisSubscriber.subscribe('chat-messages', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received message from Redis:', data);
        
        // Broadcast to all clients connected to THIS pod
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'message',
              data: data
            }));
          }
        });
      } catch (err) {
        console.error('Error handling Redis message:', err);
      }
    });
  } catch (err) {
    console.error('Error connecting to Redis:', err);
    // Don't fail completely, try to continue without Redis
    console.log('Continuing without Redis synchronization');
  }
}

// Call Redis connection
connectRedis();

// Fix for Mongoose deprecation warning
mongoose.set('strictQuery', false);

// Conectare la MongoDB
mongoose.connect(MONGODB_URI, {
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

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Gestionarea conexiunilor WebSocket
wss.on('connection', (ws, req) => {
  console.log('Client conectat de la:', req.socket.remoteAddress);
  console.log('Path:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
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
      
      // Create message data for broadcast
      const messageData = {
        _id: newMessage._id.toString(),
        username: newMessage.username,
        message: newMessage.message,
        timestamp: newMessage.timestamp
      };
      
      // Publish to Redis for all pods to broadcast (including this one)
      try {
        if (redisPublisher.isReady) {
          console.log('Publishing message to Redis');
          await redisPublisher.publish('chat-messages', JSON.stringify(messageData));
        } else {
          console.log('Redis not connected, falling back to local broadcast');
          // Only do local broadcast if Redis is not available
          const fallbackMessage = {
            type: 'message',
            data: messageData
          };
          
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              try {
                client.send(JSON.stringify(fallbackMessage));
              } catch (err) {
                console.error('Eroare la trimiterea către client:', err);
              }
            }
          });
        }
      } catch (redisErr) {
        console.error('Error publishing to Redis:', redisErr);
        // Fall back to local broadcast if Redis fails
        const fallbackMessage = {
          type: 'message',
          data: messageData
        };
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(JSON.stringify(fallbackMessage));
            } catch (err) {
              console.error('Eroare la trimiterea către client:', err);
            }
          }
        });
      }
      
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
});

// Portul pe care va rula serverul
const PORT = process.env.PORT || 88;

// Adăugăm un endpoint de test simplu
app.get('/', (req, res) => {
  res.send('Serverul de chat funcționează!');
});

// Pornire server
server.listen(PORT, IP_ADDRESS, () => {
  console.log(`Serverul rulează pe ${IP_ADDRESS}:${PORT}`);
});