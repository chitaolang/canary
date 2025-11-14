# builder stage
# 使用 Rust nightly 以支持 edition2024 (seal-sdk-rs 需要)
FROM rustlang/rust:nightly-slim as builder

# install necessary system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    ca-certificates \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# 验证 Rust 和 Cargo 已安装
RUN rustc --version && cargo --version

# install suiup with retry and error handling
RUN set -eux; \
    for i in 1 2 3; do \
    if curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh; then \
    break; \
    fi; \
    echo "Attempt $i failed, retrying..."; \
    sleep 2; \
    done; \
    test -f /root/.local/bin/suiup || (echo "Failed to install suiup" && exit 1)

# add both .local/bin and .sui/bin to PATH
ENV PATH="/root/.local/bin:/root/.sui/bin:${PATH}"

# verify suiup is installed
RUN suiup --version

# install sui, walrus, and mvr via suiup
# Note: Network will be configured at runtime via SUI_NETWORK environment variable
RUN suiup install sui@testnet -y && \
    suiup install sui@mainnet -y && \
    suiup install walrus -y && \
    suiup install mvr -y

# verify installations (suiup manages binaries, use suiup to verify)
RUN suiup list && \
    /root/.local/share/suiup/binaries/*/sui-*/sui --version 2>/dev/null | head -1 || echo "sui installed" && \
    /root/.local/share/suiup/binaries/*/walrus-*/walrus --version 2>/dev/null | head -1 || echo "walrus installed" && \
    /root/.local/share/suiup/binaries/*/mvr-*/mvr --version 2>/dev/null | head -1 || echo "mvr installed"

# set working directory
WORKDIR /app

# copy Cargo files (if exist) to leverage Docker cache
COPY backend/Cargo.toml backend/Cargo.lock* ./

# copy source code
COPY backend/ .

# build Rust project
RUN cargo build --release

# runtime image
# Use Ubuntu 24.04 which has GLIBC 2.39 (required by sui binaries)
FROM ubuntu:24.04

# install runtime dependencies
# Set DEBIAN_FRONTEND to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    findutils \
    && rm -rf /var/lib/apt/lists/*

# install suiup in runtime stage
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh

# copy suiup and installed binaries from builder stage
# Copy the entire .local directory to preserve all binaries and symlinks
COPY --from=builder /root/.local/bin /root/.local/bin
COPY --from=builder /root/.local/share/suiup /root/.local/share/suiup

# add both .local/bin and .sui/bin to PATH
ENV PATH="/root/.local/bin:/root/.sui/bin:${PATH}"

# create symlinks for easy access (optional, but helpful)
RUN mkdir -p /usr/local/bin && \
    ln -sf /root/.local/bin/suiup /usr/local/bin/suiup || true

# copy compiled binary from builder stage
COPY --from=builder /app/target/release/* /usr/local/bin/

# copy entrypoint script
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# create application directory
WORKDIR /app

# move-decompiler will be mapped via docker-compose volume
# working directory will be used for temporary files, also mapped via volume

# set environment variable (default value, can be overridden via .env)
ENV RUST_LOG=info

# use entrypoint script to set network before running application
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/local/bin/canary-worker"]

