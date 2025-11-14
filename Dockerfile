# builder stage
# rust:1.75-slim 镜像已经包含了 Rust 和 Cargo，无需单独安装
FROM rust:1.75-slim as builder

# install necessary system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 验证 Rust 和 Cargo 已安装
RUN rustc --version && cargo --version

# install suiup
RUN curl -fsSL https://get.sui.io | sh
ENV PATH="/root/.sui/bin:${PATH}"

# install sui, walrus, and mvr via suiup
# Note: Network will be configured at runtime via SUI_NETWORK environment variable
RUN /root/.sui/bin/suiup install stable && \
    /root/.sui/bin/suiup install walrus -y && \
    /root/.sui/bin/suiup install mvr

# verify installations
RUN sui --version && walrus --version && mvr --version

# set working directory
WORKDIR /app

# copy Cargo files (if exist) to leverage Docker cache
COPY backend/Cargo.toml backend/Cargo.lock* ./

# copy source code
COPY backend/ .

# build Rust project
RUN cargo build --release

# runtime image
FROM debian:bookworm-slim

# install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

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

