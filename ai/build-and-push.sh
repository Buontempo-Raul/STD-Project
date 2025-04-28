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
echo "Se construiește imaginea pentru ai-backend..."
cd ./backend
docker build -t ai-backend .
docker tag ai-backend localhost:5000/ai-backend:latest
docker push localhost:5000/ai-backend:latest
cd ..

# Construiește și publică frontend-ul
echo "Se construiește imaginea pentru ai-frontend..."
cd ./frontend
docker build -t ai-frontend .
docker tag ai-frontend localhost:5000/ai-frontend:latest
docker push localhost:5000/ai-frontend:latest
cd ..

echo "Toate imaginile pentru componenta AI au fost construite și publicate cu succes!"