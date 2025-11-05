# Fundraisely Bingo - Solana Smart Contract

A trustless, on-chain fundraising platform built on Solana using the Anchor framework.

## Overview

Fundraisely enables transparent, verifiable charitable fundraising through competitive game rooms. All fund distribution logic executes on-chain, ensuring trustless operation with zero possibility of fund misappropriation.

## Architecture

This program implements a comprehensive set of instructions organized by feature domain:

- **Admin Instructions**: Platform configuration and management
- **Room Management**: Room creation and lifecycle
- **Player Operations**: Player participation
- **Game Execution**: Winner declaration and fund distribution
- **Asset Management**: Asset-based prize management

## Security Features

- ✅ PDA-based accounts preventing signature forgery
- ✅ Formal reentrancy guards and checks-effects-interactions pattern
- ✅ Token validation with mint and owner verification
- ✅ Input validation and sanitization
- ✅ Amount validation with overflow/dust protection
- ✅ Emergency pause circuit breaker
- ✅ Host restrictions preventing self-dealing
- ✅ Arithmetic safety with checked math
- ✅ Centralized security module

## Economic Model

Entry fees are automatically split via on-chain execution:
- **Platform Fee**: 20% (fixed)
- **Host Fee**: 0-5% (configurable)
- **Prize Pool**: 0-35% (configurable)
- **Charity**: 40%+ minimum (calculated remainder)

**Critical Feature**: All "extras" payments go 100% to charity.

## Deployment

### Program ID
```
8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i
```

### Build
```bash
cd bingo
anchor build
```

### Deploy
```bash
anchor deploy --provider.cluster devnet
```

### Upgrade
```bash
anchor upgrade target/deploy/bingo.so \
  --program-id 8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i \
  --provider.cluster devnet
```

## Documentation

- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Detailed improvements documentation
- [CHANGES.md](./CHANGES.md) - Summary of changes
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

## Branches

- `main` / `master` - Original stable version
- `improved-contracts` - Enhanced version with improved documentation, security, and modularity

## License

[Add your license here]

