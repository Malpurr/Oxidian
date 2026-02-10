#!/bin/bash
# Download popular Obsidian community plugins for compatibility testing

cd "$(dirname "$0")"

# Plugin list with their GitHub repositories
declare -A plugins=(
    ["dataview"]="blacksmithgu/obsidian-dataview"
    ["templater"]="SilentVoid13/Templater" 
    ["calendar"]="liamcain/obsidian-calendar-plugin"
    ["kanban"]="mgmeyers/obsidian-kanban"
    ["excalidraw"]="zsviczian/obsidian-excalidraw-plugin"
    ["admonition"]="javalent/admonitions"
    ["outliner"]="vslinko/obsidian-outliner"
)

echo "Downloading Obsidian community plugins..."

for plugin_name in "${!plugins[@]}"; do
    repo="${plugins[$plugin_name]}"
    echo
    echo "=== Downloading $plugin_name from $repo ==="
    
    # Create plugin directory
    mkdir -p "$plugin_name"
    cd "$plugin_name"
    
    # Get latest release info
    echo "Fetching release info..."
    release_url="https://api.github.com/repos/$repo/releases/latest"
    curl -s "$release_url" > release.json
    
    # Check if we got a valid response
    if ! jq -e '.assets' release.json > /dev/null 2>&1; then
        echo "Warning: Could not fetch release info for $plugin_name"
        cd ..
        continue
    fi
    
    # Download manifest.json
    manifest_url=$(jq -r '.assets[] | select(.name == "manifest.json") | .browser_download_url' release.json)
    if [ "$manifest_url" != "null" ] && [ -n "$manifest_url" ]; then
        echo "Downloading manifest.json..."
        curl -L -o manifest.json "$manifest_url"
    else
        echo "Warning: manifest.json not found in release assets for $plugin_name"
    fi
    
    # Download main.js
    main_url=$(jq -r '.assets[] | select(.name == "main.js") | .browser_download_url' release.json)
    if [ "$main_url" != "null" ] && [ -n "$main_url" ]; then
        echo "Downloading main.js..."
        curl -L -o main.js "$main_url"
    else
        echo "Warning: main.js not found in release assets for $plugin_name"
    fi
    
    # Download styles.css if available
    styles_url=$(jq -r '.assets[] | select(.name == "styles.css") | .browser_download_url' release.json)
    if [ "$styles_url" != "null" ] && [ -n "$styles_url" ]; then
        echo "Downloading styles.css..."
        curl -L -o styles.css "$styles_url"
    else
        echo "No styles.css found (optional)"
    fi
    
    # Clean up
    rm release.json
    
    echo "Downloaded $plugin_name"
    cd ..
done

echo
echo "Download complete! Check each plugin directory for manifest.json and main.js"