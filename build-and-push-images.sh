#!/bin/bash

# Script to build and push all Docker images to the local registry

# Check if registry is running
if ! docker ps | grep -q "registry"; then
  echo "Starting local Docker registry..."
  docker run -d -p 5000:5000 --name registry registry:2
else
  echo "Local Docker registry is already running."
fi

# Build and push chat-backend
echo "===== Building chat-backend ====="
cd ./chat/backend
docker build -t chat-backend .
docker tag chat-backend localhost:5000/chat-backend:latest
docker push localhost:5000/chat-backend:latest
cd ../..

# Build and push chat-frontend
echo "===== Building chat-frontend ====="
cd ./chat/frontend
docker build -t chat-frontend .
docker tag chat-frontend localhost:5000/chat-frontend:latest
docker push localhost:5000/chat-frontend:latest
cd ../..

# Build and push ai-backend
echo "===== Building ai-backend ====="
cd ./ai/backend
docker build -t ai-backend .
docker tag ai-backend localhost:5000/ai-backend:latest
docker push localhost:5000/ai-backend:latest
cd ../..

# Build and push ai-frontend
echo "===== Building ai-frontend ====="
cd ./ai/frontend
docker build -t ai-frontend .
docker tag ai-frontend localhost:5000/ai-frontend:latest
docker push localhost:5000/ai-frontend:latest
cd ../..

# Build and push statamic
echo "===== Building statamic CMS ====="
cd ./cms
docker build -t statamic .
docker tag statamic localhost:5000/statamic:latest
docker push localhost:5000/statamic:latest
cd ..

echo "All images have been built and pushed to the local registry."
echo "You can now run: kubectl apply -f all-in-one-deployment.yaml"