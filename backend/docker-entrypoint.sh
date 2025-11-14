#!/bin/bash
set -e

# if SUI_NETWORK is set, configure Sui client network
if [ -n "$SUI_NETWORK" ]; then
    echo "Setting Sui network to: $SUI_NETWORK"
    # use sui client switch to set network
    # note: this requires an active address, otherwise it will fail
    # if it fails, application code should specify network directly via RPC URL
    sui client switch --env "$SUI_NETWORK" || echo "Warning: Failed to switch network, will use RPC URL from environment"
fi

# 显示当前配置
echo "Sui network: ${SUI_NETWORK:-not set}"
echo "Sui RPC URL: ${SUI_RPC_URL:-using default for network}"

# 执行主程序
exec "$@"

