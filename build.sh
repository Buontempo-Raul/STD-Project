#!/bin/bash

# Script for building and pushing all project images to Docker Hub repository
# Usage: ./build-and-push.sh [username]
# If username is not provided, uses "raulbuontempo" as default

# Default Docker Hub username
DOCKER_USERNAME=${1:-"raulbuontempo"}
echo "Using Docker Hub username: $DOCKER_USERNAME"

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to build and push a component
build_and_push() {
    local component=$1
    local path=$2
    local tag="${DOCKER_USERNAME}/${component}:latest"
    
    echo -e "\n${YELLOW}Building ${component}...${NC}"
    cd "$path" || { echo "Directory $path not found"; return 1; }
    
    # Build the Docker image
    docker build -t "$tag" .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully built ${tag}${NC}"
        
        # Push the image to Docker Hub
        echo -e "${YELLOW}Pushing ${tag} to Docker Hub...${NC}"
        docker push "$tag"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Successfully pushed ${tag}${NC}"
        else
            echo "Failed to push ${tag}"
            return 1
        fi
    else
        echo "Failed to build ${tag}"
        return 1
    fi
    
    # Return to original directory
    cd - > /dev/null
    return 0
}

# Login to Docker Hub
echo -e "${YELLOW}Logging in to Docker Hub...${NC}"
docker login

if [ $? -ne 0 ]; then
    echo "Failed to login to Docker Hub"
    exit 1
fi

# Create a timestamped log file
LOG_FILE="build-$(date +%Y%m%d-%H%M%S).log"
echo "Build started at $(date)" > "$LOG_FILE"

# Build and push all components
echo -e "\n${YELLOW}Starting build and push process for all components...${NC}"
echo "Build process started at $(date)" >> "$LOG_FILE"

# Array of components to build
declare -A components=(
    ["chat-backend"]="./chat/backend"
    ["chat-frontend"]="./chat/frontend"
    ["ai-backend"]="./ai/backend"
    ["ai-frontend"]="./ai/frontend"
    ["statamic"]="./cms"
)

# Track success/failure
FAILED_COMPONENTS=()

# Build and push each component
for component in "${!components[@]}"; do
    path="${components[$component]}"
    echo -e "\n${YELLOW}===== Processing $component from $path =====${NC}"
    echo "Building $component from $path" >> "$LOG_FILE"
    
    if build_and_push "$component" "$path"; then
        echo "$component: SUCCESS" >> "$LOG_FILE"
    else
        echo "$component: FAILED" >> "$LOG_FILE"
        FAILED_COMPONENTS+=("$component")
    fi
done

# Summary
echo -e "\n${YELLOW}===== Build and Push Summary =====${NC}"
echo "Summary:" >> "$LOG_FILE"

if [ ${#FAILED_COMPONENTS[@]} -eq 0 ]; then
    echo -e "${GREEN}All components successfully built and pushed to Docker Hub!${NC}"
    echo "All components successfully built and pushed" >> "$LOG_FILE"
else
    echo "The following components failed to build or push:"
    for component in "${FAILED_COMPONENTS[@]}"; do
        echo " - $component"
        echo "Failed: $component" >> "$LOG_FILE"
    done
fi

echo -e "\nLog saved to $LOG_FILE"
echo "Build completed at $(date)" >> "$LOG_FILE"

# Reminder to apply Kubernetes deployment
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Verify images in your Docker Hub repository: https://hub.docker.com/r/${DOCKER_USERNAME}"
echo "2. Apply Kubernetes deployment: kubectl apply -f complete-deployment.yaml"