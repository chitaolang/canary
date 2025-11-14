#!/bin/bash
set -e

# Ensure PATH includes suiup binaries
export PATH="/root/.local/bin:/root/.sui/bin:${PATH}"

# Use suiup which to find the default binary locations and create symlinks
if command -v suiup >/dev/null 2>&1; then
    echo "Debug: Checking suiup binary locations..."
    
    # Try to use suiup which to find binary locations
    SUI_PATH=$(suiup which sui 2>/dev/null || echo "")
    WALRUS_PATH=$(suiup which walrus 2>/dev/null || echo "")
    MVR_PATH=$(suiup which mvr 2>/dev/null || echo "")
    
    # Create symlinks using suiup which output
    if [ -n "$SUI_PATH" ] && [ -f "$SUI_PATH" ]; then
        echo "Found sui at: $SUI_PATH"
        ln -sf "$SUI_PATH" /usr/local/bin/sui 2>/dev/null || true
    else
        # Fallback: check default bin directory
        if [ -f "/root/.local/bin/sui" ]; then
            echo "Found sui at: /root/.local/bin/sui"
            ln -sf /root/.local/bin/sui /usr/local/bin/sui 2>/dev/null || true
        else
            # Last resort: find in binaries directory
            SUI_BIN=$(find /root/.local/share/suiup/binaries -name "sui" -type f 2>/dev/null | head -1)
            if [ -n "$SUI_BIN" ]; then
                echo "Found sui at: $SUI_BIN"
                ln -sf "$SUI_BIN" /usr/local/bin/sui || true
            fi
        fi
    fi
    
    if [ -n "$WALRUS_PATH" ] && [ -f "$WALRUS_PATH" ]; then
        echo "Found walrus at: $WALRUS_PATH"
        ln -sf "$WALRUS_PATH" /usr/local/bin/walrus 2>/dev/null || true
    else
        if [ -f "/root/.local/bin/walrus" ]; then
            echo "Found walrus at: /root/.local/bin/walrus"
            ln -sf /root/.local/bin/walrus /usr/local/bin/walrus 2>/dev/null || true
        else
            WALRUS_BIN=$(find /root/.local/share/suiup/binaries -name "walrus" -type f 2>/dev/null | head -1)
            if [ -n "$WALRUS_BIN" ]; then
                echo "Found walrus at: $WALRUS_BIN"
                ln -sf "$WALRUS_BIN" /usr/local/bin/walrus || true
            fi
        fi
    fi
    
    if [ -n "$MVR_PATH" ] && [ -f "$MVR_PATH" ]; then
        echo "Found mvr at: $MVR_PATH"
        ln -sf "$MVR_PATH" /usr/local/bin/mvr 2>/dev/null || true
    else
        if [ -f "/root/.local/bin/mvr" ]; then
            echo "Found mvr at: /root/.local/bin/mvr"
            ln -sf /root/.local/bin/mvr /usr/local/bin/mvr 2>/dev/null || true
        else
            MVR_BIN=$(find /root/.local/share/suiup/binaries -name "mvr" -type f 2>/dev/null | head -1)
            if [ -n "$MVR_BIN" ]; then
                echo "Found mvr at: $MVR_BIN"
                ln -sf "$MVR_BIN" /usr/local/bin/mvr || true
            fi
        fi
    fi
fi

# Verify tools are available
echo "Checking available tools..."
command -v suiup >/dev/null 2>&1 && echo "✓ suiup found" || echo "✗ suiup not found"
command -v sui >/dev/null 2>&1 && echo "✓ sui found" || echo "✗ sui not found"
command -v walrus >/dev/null 2>&1 && echo "✓ walrus found" || echo "✗ walrus not found"
command -v mvr >/dev/null 2>&1 && echo "✓ mvr found" || echo "✗ mvr not found"

# Initialize Sui client configuration if needed (required before creating address)
if command -v sui >/dev/null 2>&1; then
    # Create new address and save to account.json
    ACCOUNT_JSON="/app/account.json"
    
    # Fix: If account.json is a directory (Docker volume issue), remove it
    if [ -d "$ACCOUNT_JSON" ]; then
        echo "Warning: $ACCOUNT_JSON is a directory, removing it..."
        rm -rf "$ACCOUNT_JSON"
    fi
    
    # Check if file exists and is not empty, and contains valid JSON
    NEED_CREATE=true
    if [ -f "$ACCOUNT_JSON" ] && [ -s "$ACCOUNT_JSON" ]; then
        # Check if file contains valid JSON (starts with { and ends with })
        if grep -q "^{" "$ACCOUNT_JSON" && grep -q "}" "$ACCOUNT_JSON"; then
            # Try to validate JSON if jq is available
            if command -v jq >/dev/null 2>&1; then
                if jq empty "$ACCOUNT_JSON" 2>/dev/null; then
                    NEED_CREATE=false
                    echo "✓ Valid account.json found at $ACCOUNT_JSON"
                fi
            else
                # If jq not available, assume valid if it has { and }
                NEED_CREATE=false
                echo "✓ Account file exists at $ACCOUNT_JSON (validation skipped, jq not available)"
            fi
        fi
    fi
    
    if [ "$NEED_CREATE" = true ]; then
        echo "Creating new Sui address (ed25519, alias: canery)..."
        
        # Use temporary file to capture all output
        TEMP_OUTPUT=$(mktemp)
        
        # Use here document (EOF) to provide answers to interactive questions:
        # 1. Config file doesn't exist, connect to Sui Full node server? → y
        # 2. Sui Full node server URL → <enter> (use default)
        # 3. Select key scheme (0 for ed25519, 1 for secp256k1, 2 for secp256r1) → 0
        if sui client new-address ed25519 canery --json > "$TEMP_OUTPUT" 2>&1 <<EOF
y

0
EOF
        then
            # Extract only the JSON output (from first { to last })
            # Method 1: Try using jq if available (most reliable)
            if command -v jq >/dev/null 2>&1; then
                jq -r '.' "$TEMP_OUTPUT" 2>/dev/null > "$ACCOUNT_JSON" || {
                    # If jq fails, try to extract JSON manually
                    awk '/^{/,/^}/' "$TEMP_OUTPUT" > "$ACCOUNT_JSON" 2>/dev/null || true
                }
            else
                # Method 2: Use awk to extract JSON object (from { to })
                awk '
                    BEGIN { in_json = 0; brace_count = 0; json = "" }
                    /^{/ { 
                        in_json = 1
                        json = $0
                        brace_count = gsub(/{/, "&", $0) - gsub(/}/, "&", $0)
                        next
                    }
                    in_json {
                        json = json "\n" $0
                        brace_count += gsub(/{/, "&", $0)
                        brace_count -= gsub(/}/, "&", $0)
                        if (brace_count == 0) {
                            print json
                            exit
                        }
                    }
                ' "$TEMP_OUTPUT" > "$ACCOUNT_JSON" 2>/dev/null
            fi
            
            # Verify JSON is valid and not empty
            if [ -s "$ACCOUNT_JSON" ] && grep -q "^{" "$ACCOUNT_JSON" && grep -q "}" "$ACCOUNT_JSON"; then
                echo "✓ New address created and saved to $ACCOUNT_JSON"
                echo "Address info:"
                cat "$ACCOUNT_JSON"
            else
                echo "Warning: Failed to extract JSON from output, but address may have been created"
                # Check if address already exists
                if sui client addresses 2>/dev/null | grep -q "canery"; then
                    echo "Note: Address 'canery' exists, trying to get address info..."
                    # Try to get address info in JSON format
                    sui client addresses --json 2>/dev/null | grep -A 10 "canery" | awk '/^{/,/^}/' > "$ACCOUNT_JSON" 2>/dev/null || true
                fi
            fi
        else
            echo "Warning: Failed to create new address, but continuing..."
            # Check if address already exists
            if sui client addresses 2>/dev/null | grep -q "canery"; then
                echo "Note: Address 'canery' may already exist"
            fi
        fi
        
        # Clean up temporary file
        rm -f "$TEMP_OUTPUT"
    fi
fi

# if SUI_NETWORK is set, configure Sui client network
if [ -n "$SUI_NETWORK" ]; then
    echo "Setting Sui network to: $SUI_NETWORK"
    # use sui client switch to set network
    # note: this requires an active address, otherwise it will fail
    # if it fails, application code should specify network directly via RPC URL
    if command -v sui >/dev/null 2>&1; then
        sui client switch --env "$SUI_NETWORK" || echo "Warning: Failed to switch network, will use RPC URL from environment"
    else
        echo "Warning: sui command not found, cannot switch network"
    fi
fi

# 显示当前配置
echo "Sui network: ${SUI_NETWORK:-not set}"
echo "Sui RPC URL: ${SUI_RPC_URL:-using default for network}"

# 执行主程序
exec "$@"

