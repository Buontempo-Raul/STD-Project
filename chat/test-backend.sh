#!/bin/sh

# Script pentru a verifica dacă serverul backend funcționează

echo "Verificare backend-chat..."
echo "Așteptăm 5 secunde ca serverul să pornească complet..."
sleep 5

# Încercăm să facem o cerere HTTP către backend
BACKEND_RESPONSE=$(curl -s http://localhost:88 || echo "Eroare de conexiune")

echo "Răspuns backend: $BACKEND_RESPONSE"

if echo "$BACKEND_RESPONSE" | grep -q "Serverul de chat funcționează"; then
  echo "✅ Backend-ul funcționează corect!"
else
  echo "❌ Backend-ul nu răspunde conform așteptărilor."
  echo "Verifică log-urile cu: docker compose logs chat-backend"
fi

# Verificare MongoDB
echo -e "\nVerificare conexiune MongoDB..."
docker compose exec chat-backend curl -s http://localhost:88/messages || echo "Eroare la accesarea endpoint-ului /messages"

# Testare WebSocket
echo -e "\nPentru a testa conexiunea WebSocket, deschide în browser:"
echo "http://localhost:90"
echo "și urmează instrucțiunile din interfață."