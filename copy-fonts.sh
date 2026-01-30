#!/bin/bash

# Realitease Font Copy Script
# This script helps copy the required fonts from your external drive to the project

echo "🎨 Realitease Font Setup Script"
echo "=================================="

# Define the target directory
TARGET_DIR="/Users/thomashulihan/Projects/TRR-APP/apps/web/public/fonts/realitease"

# Create the target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Function to copy font if it exists
copy_font() {
    local font_name="$1"
    local search_path="$2"
    
    echo "Searching for $font_name..."
    
    # Find the font file
    font_file=$(find "$search_path" -name "*$font_name*" -type f \( -name "*.ttf" -o -name "*.otf" -o -name "*.woff" -o -name "*.woff2" \) 2>/dev/null | head -1)
    
    if [ -n "$font_file" ]; then
        echo "✅ Found: $font_file"
        cp "$font_file" "$TARGET_DIR/"
        echo "   Copied to: $TARGET_DIR/"
    else
        echo "❌ Not found: $font_name"
    fi
    echo ""
}

# Define search paths (you can modify these)
SEARCH_PATHS=(
    "/Volumes/HardDrive/WEB-APP"
    "/Volumes/HardDrive"
    "/System/Library/Fonts"
    "/Library/Fonts"
    "$HOME/Library/Fonts"
    "$HOME/Desktop"
    "$HOME/Downloads"
)

echo "Required fonts for Realitease:"
echo "- NYTKarnak_Condensed (main title)"
echo "- KarnakPro-Book (subtitle)"
echo "- NYTFranklin (play button)"
echo "- TN_Web_Use_Only (date)"
echo "- Helvetica_Neue (general text)"
echo ""

# Search for each font in all paths
for search_path in "${SEARCH_PATHS[@]}"; do
    if [ -d "$search_path" ]; then
        echo "🔍 Searching in: $search_path"
        
        copy_font "NYTKarnak" "$search_path"
        copy_font "Karnak" "$search_path"
        copy_font "NYTFranklin" "$search_path"
        copy_font "Franklin" "$search_path"
        copy_font "TN_Web" "$search_path"
        copy_font "Helvetica" "$search_path"
        
        echo "---"
    fi
done

echo "✨ Font setup complete!"
echo ""
echo "📁 Fonts copied to: $TARGET_DIR"
echo "🔗 Check the files: ls -la \"$TARGET_DIR\""
echo ""
echo "💡 After copying fonts, restart your development server:"
echo "   pnpm run web:dev"
