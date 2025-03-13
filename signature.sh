#!/bin/bash

# Generate hidden signature
generate_hidden_signature() {
    echo "Harunguna" | base64 | tr -d '\n' | rev | md5sum | cut -d' ' -f1
}

# Hidden signature
HIDDEN_SIG=$(generate_hidden_signature)

# Find and modify HTML files
for file in $(find . -type f -name "*.html"); do
    # Skip git and other special directories
    [[ "$file" == */.git/* ]] && continue

    # Check if it's a Jinja2 template extending base.html
    if grep -q "{% extends \"base.html\" %}" "$file"; then
        # For extended templates, look for first {% block content %}
        if ! grep -q "dev-signature" "$file"; then
            echo "Processing extended template: $file"
            # Create a temporary file
            temp_file=$(mktemp)
            awk '/{% block content %}/{print "    <!-- dev-signature: '"$HIDDEN_SIG"' -->"; print; next}1' "$file" > "$temp_file"
            mv "$temp_file" "$file"
            echo "Added signature to $file"
        else
            echo "Signature already exists in $file"
        fi
    elif grep -q "<head>" "$file"; then
        # Regular HTML files with <head> tag
        if ! grep -q "dev-signature" "$file"; then
            echo "Processing HTML file: $file"
            # Create a temporary file
            temp_file=$(mktemp)
            awk '/<head>/{print "    <meta name=\"dev-signature\" content=\"'"$HIDDEN_SIG"'\">";print; next}1' "$file" > "$temp_file"
            mv "$temp_file" "$file"
            echo "Added signature to $file"
        else
            echo "Signature already exists in $file"
        fi
    else
        echo "No suitable place to add signature in $file"
    fi
done

echo "Signature process complete."# 29a41de6a866d56c36aba5159f45257c
