#!/bin/bash

# Script to modify registry address in build-and-push-images.sh
# Changes from localhost:5000 to 172.20.10.2:5000

echo "Modifying registry address in build-and-push-images.sh..."

# Check if the script exists
if [ ! -f "build-and-push-images.sh" ]; then
    echo "Error: build-and-push-images.sh not found in current directory."
    exit 1
fi

# Create a backup of the original file
cp build-and-push-images.sh build-and-push-images.sh.bak
echo "Created backup at build-and-push-images.sh.bak"

# Replace localhost:5000 with 172.20.10.2:5000 in the file
# Using sed to perform the substitution
sed -i 's/raulbuontempo:5000/raulbuontempo/g' build-and-push-images.sh

# Count the number of replacements
REPLACED_COUNT=$(grep -c "172.20.10.2:5000" build-and-push-images.sh)

echo "Replacement complete! Modified $REPLACED_COUNT occurrences."
echo "Registry address changed from localhost:5000 to 172.20.10.2:5000"

# Make sure the script is executable
chmod +x build-and-push-images.sh

echo "Script is ready to use."