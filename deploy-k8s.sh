#!/bin/bash

# Deployment script for Kubernetes

# Check if Kubernetes cluster is running
if ! kubectl cluster-info; then
  echo "ERROR: Kubernetes cluster is not running. Please make sure your cluster is up."
  exit 1
fi

# Check for registry
if ! kubectl get pods -n kube-system | grep -q registry; then
  echo "WARNING: Registry not found in kube-system namespace. Make sure your registry is running."
  echo "You might need to deploy a registry first."
  # Uncomment the following line to automatically deploy a registry
  # kubectl apply -f https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/registry/registry-dp.yaml
fi

# Apply secrets first
echo "Applying Secrets..."
kubectl apply -f secrets.yaml

# Apply ConfigMap
echo "Applying ConfigMap..."
kubectl apply -f configmap.yaml

# Apply all resources with one command
echo "Deploying all services..."
kubectl apply -f all-in-one-deployment.yaml

# Wait for resources to be created
echo "Waiting for deployments to become ready..."
sleep 5

# Check deployment status
kubectl get deployments
kubectl get pods

echo "Deployment complete! Your application should be accessible at http://localhost"
echo "Chat interface: http://localhost/chat"
echo "AI Face Detection: http://localhost/ai"