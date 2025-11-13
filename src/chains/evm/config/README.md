# EVM Configuration

Configuration files for EVM-compatible chains (Base, Polygon, Optimism, Avalanche, BSC, etc.).

## Files

### contracts.pool.ts
- **Purpose**: PoolFactory contract addresses for each network
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy, BSC, Avalanche, Optimism
- **Usage**: Used by `useContractActions` to deploy pool-based rooms
- **ABI**: Exports `PoolFactoryABI` and `PoolRoomABI` from `src/abis/quiz/`

### contracts.asset.ts
- **Purpose**: AssetFactory contract addresses for each network
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy, BSC, Avalanche, Optimism
- **Usage**: Used by `useContractActions` to deploy asset-based rooms
- **ABI**: Exports `AssetFactoryABI` from `src/abis/quiz/`

### tokens.ts
- **Purpose**: Token addresses (USDC, USDGLO) for each network
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy, Optimism, Avalanche, BSC
- **Usage**: Used for entry fee payments and prize distributions
- **Decimals**: USDC (6), USDGLO (18)

### networks.ts
- **Purpose**: Network configuration and RPC endpoints
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy, Optimism, Avalanche, BSC
- **Usage**: Used by wallet providers and contract interactions

## Configuration

### Factory Contracts

#### PoolFactory
- **Base Sepolia**: `0x1407B51e43F5983B72577d1dB70AB107820c2e75` ✅ (deployed)
- **Avalanche Fuji**: `0xbD144cA5539FEBdBCf40eE24F90Ab3E608609D5d` ✅ (deployed)
- **Base**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **Polygon**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **Polygon Amoy**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **BSC**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **BSC Testnet**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **Avalanche**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **Optimism**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **Optimism Sepolia**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)

#### AssetFactory
- **Base Sepolia**: `0x7775A6c38347FE7284be1298FCdDB291F1A24CCe` ✅ (deployed)
- **Base**: `0x3333333333333333333333333333333333333333` ⏳ (placeholder - TODO)
- **Polygon**: `0x4444444444444444444444444444444444444444` ⏳ (placeholder - TODO)
- **Polygon Amoy**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **BSC**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **BSC Testnet**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **Avalanche**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **Avalanche Fuji**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **Optimism**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)
- **Optimism Sepolia**: `0x1111111111111111111111111111111111111111` ⏳ (placeholder - TODO)

### Token Addresses

#### USDC (USD Coin - 6 decimals)
- **Base**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` ✅ (native USDC)
- **Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` ✅ (Circle test USDC)
- **Optimism**: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` ✅ (native USDC)
- **Optimism Sepolia**: `0x5fd84259d66Cd46123540766Be93DFE6D43130D7` ✅ (Circle test USDC)
- **Avalanche**: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` ✅ (native USDC)
- **Avalanche Fuji**: `0x5425890298aed601595a70ab815c96711a31bc65` ✅ (Circle test USDC)
- **Polygon**: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` ✅ (native USDC)
- **Polygon Amoy**: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` ✅ (Circle test USDC)
- **BSC**: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` ✅ (Binance-Peg USDC)
- **BSC Testnet**: `0x64544969ED7EBf5F083679233325356EBe738930` ✅ (test token)

#### USDGLO (Glo Dollar - 18 decimals)
- **Ethereum**: `0x4F604735c1cF31399C6E711D5962b2B3E0225AD3` ✅ (same address across chains)
- **Base**: `0x4F604735c1cF31399C6E711D5962b2B3E0225AD3` ✅
- **Polygon**: `0x4F604735c1cF31399C6E711D5962b2B3E0225AD3` ✅
- **Optimism**: `0x4F604735c1cF31399C6E711D5962b2B3E0225AD3` ✅

**Note**: USDGLO uses the same contract address across all supported EVM chains.

## Usage

```typescript
import { POOL_FACTORY, PoolFactoryABI } from '@/chains/evm/config/contracts.pool';
import { ASSET_FACTORY, AssetFactoryABI } from '@/chains/evm/config/contracts.asset';
import { USDC, USDGLO, USDC_DECIMALS, USDGLO_DECIMALS } from '@/chains/evm/config/tokens';

// Get factory address for current network
const factoryAddress = POOL_FACTORY.baseSepolia;

// Get USDC address for current network
const usdcAddress = USDC.baseSepolia;

// Get token decimals
const decimals = USDC_DECIMALS; // 6
```

## Network Support

### Implemented (Testnet)
- ✅ Base Sepolia (testnet) - PoolFactory and AssetFactory deployed
- ✅ Avalanche Fuji (testnet) - PoolFactory deployed
- ✅ All testnet USDC addresses configured

### Implemented (Mainnet)
- ✅ Base - USDC configured
- ✅ Polygon - USDC configured
- ✅ Optimism - USDC configured
- ✅ Avalanche - USDC configured
- ✅ BSC - USDC configured (Binance-Peg)

### In Progress
- 🚧 Base (mainnet) - Factory contracts need deployment
- 🚧 Polygon (mainnet) - Factory contracts need deployment
- 🚧 Polygon Amoy (testnet) - Factory contracts need deployment

### Planned
- ⏳ BSC (Binance Smart Chain) - Factory contracts
- ⏳ Optimism - Factory contracts
- ⏳ Ethereum - Full support

## Adding a New Network

1. **Add network configuration** to `networks.ts`:
   ```typescript
   export const EVM_NETWORKS = {
     // ... existing networks
     newNetwork: {
       id: 12345,
       name: 'New Network',
       // ... other config
     },
   };
   ```

2. **Add factory addresses** to `contracts.pool.ts` and `contracts.asset.ts`:
   ```typescript
   export const POOL_FACTORY = {
     // ... existing networks
     newNetwork: '0x...' as const,
   };
   ```

3. **Add token addresses** to `tokens.ts`:
   ```typescript
   export const USDC = {
     // ... existing networks
     newNetwork: '0x...' as const,
   };
   ```

4. **Update network resolution logic** in `evmSelect.ts` if needed

5. **Test deployment** on the new network

## Notes

- **Placeholder Addresses**: Networks marked with `⏳` use placeholder addresses (`0x1111...` or specific placeholders like `0x3333...`). These must be replaced with actual deployed contract addresses before use.

- **USDC on BSC**: Circle does NOT issue native USDC on BSC. The configured address is Binance-Peg USDC, which is a wrapped version.

- **USDGLO**: Glo Dollar uses the same contract address across all supported EVM chains, making it easy to use across different networks.
