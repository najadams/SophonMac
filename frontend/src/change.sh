#!/bin/bash
rename_files() {
  find "$1" -type f -name "*.js" -exec bash -c 'mv "$1" "${1%.js}.jsx"' _ {} \;
}

# Check if the correct number of arguments is provided
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <folder_path>"
  exit 1
fi

# Get the folder path from the command line argument
folder_path="$1"

# Check if the provided path is a valid directory
if [ ! -d "$folder_path" ]; then
  echo "Error: '$folder_path' is not a valid directory."
  exit 1
fi

# Rename files
rename_files "$folder_path"

echo "Files renamed successfully."

