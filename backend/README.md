# Canary Backend SDK

TypeScript SDK for interacting with the Canary contract on Sui blockchain.

## Prerequisites

- Node.js >= 18.0.0
- Yarn >= 1.22.0

## Installation

Install dependencies using Yarn:

```bash
yarn install
```

## Development

### Build

Compile TypeScript to JavaScript:

```bash
yarn build
```

### Watch Mode

Watch for changes and rebuild automatically:

```bash
yarn dev
```

### Type Checking

Check types without building:

```bash
yarn typecheck
```

### Clean

Remove build artifacts:

```bash
yarn clean
```

## Project Structure

```
backend/
├── src/
│   └── key/              # Key management module
│       ├── bech32-parser.ts
│       ├── key-manager.ts
│       ├── index.ts
│       └── ...
├── dist/                 # Compiled output (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Usage

### Key Management

```typescript
import { KeyManager } from './src/key';

const keyManager = new KeyManager();
const keypair = keyManager.loadFromBech32('suiprivkey1...');
const address = keyManager.getAddress(keypair);
```

See [src/key/README.md](./src/key/README.md) for detailed documentation.

## Dependencies

- `@mysten/sui`: Sui TypeScript SDK
- `bech32`: Bech32 encoding/decoding library

## License

MIT

