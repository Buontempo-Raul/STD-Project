#!/bin/bash

# Script pentru a construi și publica imaginile Docker în registry-ul privat

# Asigură-te că registry-ul privat rulează
if ! docker ps | grep -q "registry"; then
  echo "Se pornește registry-ul local..."
  docker run -d -p 5000:5000 --name registry registry:2
else
  echo "Registry-ul local este deja pornit"
fi

# Construiește și publică backend-ul
echo "Se construiește imaginea pentru chat-backend..."
cd ./backend
docker build -t chat-backend .
docker tag chat-backend localhost:5000/chat-backend:latest
docker push localhost:5000/chat-backend:latest
cd ..

# Construiește și publică frontend-ul
echo "Se construiește imaginea pentru chat-frontend..."
cd ./frontend
docker build -t chat-frontend .
docker tag chat-frontend localhost:5000/chat-frontend:latest
docker push localhost:5000/chat-frontend:latest
cd ..

echo "Toate imaginile au fost construite și publicate cu succes!"