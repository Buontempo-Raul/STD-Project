#!/bin/bash

# Script to pull images from Docker Hub and push them to local registry
# Created for Raul Buontempo's STD Project

set -e  # Exit immediately if any command fails

echo "===== Transferring Docker Images to Local Registry ====="

# Define variables
DOCKERHUB_REPO="raulbuontempo"
REGISTRY_PORT="32000"
LOCAL_REGISTRY="localhost:$REGISTRY_PORT"

# Array of images to pull and push
IMAGES=(
  "statamic:latest"
  "chat-backend:latest"
  "chat-frontend:latest"
  "ai-backend:latest"
  "ai-frontend:latest"
)

# Function to check if Docker is installed and running
check_docker() {
  if ! command -v docker >/dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
  fi
  
  if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon is not running or you don't have permission to access it."
    echo "   Run: sudo systemctl start docker"
    echo "   Or add your user to the docker group and log out/in again."
    exit 1
  fi
}

# Function to check if local registry is accessible
check_registry() {
  echo "🔍 Checking local registry at $LOCAL_REGISTRY..."
  if ! curl -s -f "http://$LOCAL_REGISTRY/v2/" >/dev/null 2>&1; then
    echo "❌ Local registry is not accessible at $LOCAL_REGISTRY"
    echo "   Make sure you've run setup-registry.sh first and the registry is running"
    exit 1
  fi
  echo "✅ Local registry is accessible"
}

# Function to pull and push images
pull_and_push_images() {
  echo "🔄 Pulling and pushing images..."
  
  for image in "${IMAGES[@]}"; do
    echo "🔄 Processing $image"
    
    # Pull the image from Docker Hub
    echo "⬇️ Pulling $DOCKERHUB_REPO/$image from Docker Hub..."
    docker pull $DOCKERHUB_REPO/$image
    
    # Tag the image for local registry
    echo "🏷️ Tagging for local registry..."
    docker tag $DOCKERHUB_REPO/$image $LOCAL_REGISTRY/$image
    
    # Push to local registry
    echo "⬆️ Pushing to local registry..."
    docker push $LOCAL_REGISTRY/$image
    
    echo "✅ Successfully processed $image"
    echo "-----------------------------------------"
  done
}

# Main function
main() {
  echo "🔍 Checking prerequisites..."
  check_docker
  check_registry
  
  echo "🔄 Processing images..."
  pull_and_push_images
  
  echo "✅ All images have been successfully transferred to the local registry"
  echo "✅ Your images are available at: $LOCAL_REGISTRY/{image-name}:latest"
  echo "✅ You can now use these images in your Kubernetes deployments"
}

# Execute main function
main