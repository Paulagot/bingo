# EVM Configuration

Configuration files for EVM-compatible chains (Base, Polygon, etc.).

## Files

### contracts.pool.ts
- **Purpose**: PoolFactory contract addresses for each network
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy, BSC, Avalanche, Optimism
- **Usage**: Used by `useContractActions` to deploy pool-based rooms

### contracts.asset.ts
- **Purpose**: AssetFactory contract addresses for each network
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy, BSC, Avalanche, Optimism
- **Usage**: Used by `useContractActions` to deploy asset-based rooms

### tokens.ts
- **Purpose**: Token addresses (USDC) for each network
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy
- **Usage**: Used for entry fee payments and prize distributions

### networks.ts
- **Purpose**: Network configuration and RPC endpoints
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy
- **Usage**: Used by wallet providers and contract interactions

## Configuration

### Factory Contracts

#### PoolFactory
- **Base Sepolia**: `0x1407B51e43F5983B72577d1dB70AB107820c2e75`
- **Avalanche Fuji**: `0xbD144cA5539FEBdBCf40eE24F90Ab3E608609D5d`
- **Other Networks**: TBD (dummy addresses)

#### AssetFactory
- **Base Sepolia**: `0x7775A6c38347FE7284be1298FCdDB291F1A24CCe`
- **Base**: `0x3333333333333333333333333333333333333333` (placeholder)
- **Polygon**: `0x4444444444444444444444444444444444444444` (placeholder)
- **Other Networks**: TBD (dummy addresses)

### Token Addresses

#### USDC
- **Base**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Base Sepolia**: Testnet address (configurable)
- **Polygon**: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`
- **Polygon Amoy**: Testnet address (configurable)

## Usage

```typescript
import { POOL_FACTORY, PoolFactoryABI } from './config/contracts.pool';
import { ASSET_FACTORY, AssetFactoryABI } from './config/contracts.asset';
import { USDC } from './config/tokens';

// Get factory address for current network
const factoryAddress = POOL_FACTORY.baseSepolia;

// Get USDC address for current network
const usdcAddress = USDC.baseSepolia;
```

## Network Support

### Implemented
- ✅ Base Sepolia (testnet)
- ✅ Avalanche Fuji (testnet)

### In Progress
- 🚧 Base (mainnet)
- 🚧 Polygon (mainnet)
- 🚧 Polygon Amoy (testnet)

### Planned
- ⏳ BSC (Binance Smart Chain)
- ⏳ Optimism
- ⏳ Ethereum

## Adding a New Network

1. Add network configuration to `networks.ts`
2. Add factory addresses to `contracts.pool.ts` and `contracts.asset.ts`
3. Add token addresses to `tokens.ts`
4. Update network resolution logic in `evmSelect.ts`
5. Test deployment on the new network

