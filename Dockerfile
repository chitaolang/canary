# builder stage
FROM rust:1.75-slim as builder

# install necessary system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# install suiup
RUN curl -fsSL https://get.sui.io | sh
ENV PATH="/root/.sui/bin:${PATH}"

# install sui toolchain (via suiup)
RUN /root/.sui/bin/suiup install stable

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

# install suiup and sui toolchain
RUN curl -fsSL https://get.sui.io | sh
ENV PATH="/root/.sui/bin:${PATH}"
RUN /root/.sui/bin/suiup install stable

# copy compiled binary from builder stage
COPY --from=builder /app/target/release/* /usr/local/bin/

# create application directory
WORKDIR /app

# move-decompiler will be mapped via docker-compose volume
# working directory will be used for temporary files, also mapped via volume

# set environment variable (default value, can be overridden via .env)
ENV RUST_LOG=info

# run application
CMD ["/usr/local/bin/canary-worker"]

