# FundRaisely - Multiplayer Fundraising Quiz Platform 🎲

A real-time multiplayer quiz platform built with React, TypeScript, and Socket.io, featuring blockchain integration for transparent, trustless fundraising. Supports both traditional payment methods and Web3 payments via Solana, EVM-compatible chains (Base, Polygon), and Stellar.

## Overview

FundRaisely enables charities and community organizations to run engaging quiz fundraising events with automated payment processing, prize distribution, and transparent accounting. The platform combines traditional fundraising with blockchain technology, offering both hosted events (using mobile devices and tablets) and fully online quizzes.

### Key Differentiators

- **Trustless Prize Distribution**: Smart contracts automatically distribute funds according to immutable rules
- **Multi-Chain Support**: Deploy fundraising rooms on Solana, Base, Polygon, or Stellar
- **Real-Time Gameplay**: Socket.io-powered real-time multiplayer quiz experience
- **Transparent Accounting**: All transactions and distributions are verifiable on-chain
- **Charity-First Design**: Minimum 40% of all funds automatically go to charity
- **Interactive Fundraising**: Gamified extras (Freeze, Clue, Robin Hood, Restore) that maximize donations

## Features

### Core Quiz Features
- **Real-Time Multiplayer**: Play with friends in real-time using WebSockets
- **Dynamic Room Management**: Create or join rooms with unique room IDs
- **Responsive Design**: Fully optimized for mobile and desktop devices
- **Interactive Gameplay**: Multiple question types, rounds, and interactive extras
- **Auto-Scoring**: Automatic score calculation and leaderboard updates
- **Host Controls**: Comprehensive dashboard for managing quiz events
- **Payment Reconciliation**: Automated payment tracking and reporting

### Web3 Features
- **Multi-Chain Deployment**: Deploy smart contracts on Solana, Base, Polygon, or Stellar
- **Automated Prize Distribution**: Smart contracts handle prize distribution automatically
- **Token Support**: 
  - Solana: SOL, USDC, PYUSD, USDT (SPL tokens)
  - EVM: ETH, USDC (ERC-20 tokens)
  - Stellar: XLM, USDC, Glo USD
- **Wallet Integration**: Support for popular wallets (Phantom, MetaMask, Freighter, etc.)
- **Transaction Simulation**: Pre-flight transaction simulation to prevent failures
- **On-Chain Events**: All distributions emit events for transparent tracking

### Smart Contract Features (Solana)
- **Pool-Based Rooms**: Prize pool from collected entry fees
- **Asset-Based Rooms**: Pre-deposited prize assets (NFTs, tokens, etc.)
- **Automatic Token Account Creation**: Missing token accounts created automatically
- **PDA-Based Security**: Program Derived Addresses prevent signature forgery
- **Emergency Pause**: Admin can halt operations if critical vulnerability discovered
- **Room Recovery**: Admin recovery mechanism for abandoned rooms

## Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand for global state, React Query for server state
- **Styling**: Tailwind CSS with custom components
- **Real-Time Communication**: Socket.io for game events
- **Blockchain Integration**: Multi-chain wallet adapters and contract interfaces

### Backend
- **Runtime**: Node.js with Express
- **Real-Time**: Socket.io server for game coordination
- **Database**: MySQL for user data and room metadata
- **Authentication**: JWT-based authentication
- **API**: RESTful API for room management and user operations

### Smart Contracts
- **Solana**: Anchor framework (Rust) - see `C:\Users\isich\bingo-solana-contracts`
- **EVM**: Solidity contracts deployed on Base and Polygon
- **Stellar**: Stellar Smart Contracts (Soros)

## Multi-Chain Support

### Solana
- **Status**: ✅ Fully Implemented
- **Networks**: Devnet, Testnet, Mainnet
- **Program ID**: `7cBb4Ho5W66nBdcaAgt7sLnY3HG6jwTWkmCFF9d2yxBn` (devnet)
- **Features**: Pool rooms, asset rooms, automatic token account creation
- **Documentation**: See [Solana Chain Documentation](./src/chains/solana/README.md)

### EVM (Ethereum Virtual Machine)
- **Status**: ✅ Partially Implemented
- **Networks**: Base, Base Sepolia, Polygon, Polygon Amoy
- **Features**: Pool rooms, asset rooms, factory pattern
- **Documentation**: See [EVM Chain Documentation](./src/chains/evm/README.md)

### Stellar
- **Status**: ✅ Implemented
- **Networks**: Testnet, Mainnet
- **Features**: Stellar asset rooms, multi-currency support
- **Documentation**: See [Stellar Chain Documentation](./src/chains/stellar/README.md)

## Solana Smart Contract Integration

### Economic Model

The Solana smart contract enforces a trustless economic model where all funds are automatically distributed according to immutable rules:

#### Fee Allocation (Entry Fees)
```
Platform Fee:  20% (fixed by GlobalConfig)
Host Allocation: 40% total (configurable within this limit)
  - Host Fee:   0-5% (host chooses)
  - Prize Pool: 0-35% (calculated as 40% - host fee)
Charity:       Minimum 40% (calculated remainder)
```

#### Extras Allocation
```
All extras (beyond entry fee) go 100% to charity
This maximizes fundraising impact and is transparent to all participants
```

#### Distribution Calculation
```typescript
const platformFee = totalEntryFees * 0.20;
const hostFee = totalEntryFees * (hostFeeBps / 10000);
const prizeAmount = totalEntryFees * (prizePoolBps / 10000);
const charityFromEntry = totalEntryFees - platformFee - hostFee - prizeAmount;
const totalCharity = charityFromEntry + totalExtrasFees;
```

### Prize Distribution Flow

1. **Host Declares Winners**: Host calls `declareWinners` with winner list
2. **Token Account Validation**: System checks if all recipient token accounts exist
3. **Automatic Account Creation**: Missing token accounts (host, platform, charity, winners) are created automatically
4. **Fund Distribution**: Smart contract distributes funds from room vault to:
   - Platform wallet (20%)
   - Host wallet (0-5%)
   - Winner wallets (0-35%, split according to prize distribution)
   - Charity wallet (40%+ remainder)
5. **Transaction Simulation**: All transactions are simulated before execution to prevent failures
6. **Event Emission**: `RoomEnded` event is emitted for off-chain indexing and transparency

### Token Account Management

The system automatically handles token account creation for all recipients:

- **Host Token Account**: Created if missing before prize distribution
- **Platform Token Account**: Created if missing before prize distribution
- **Charity Token Account**: Created if missing before prize distribution
- **Winner Token Accounts**: Created if missing for each winner
- **Prize Asset Accounts**: Created if missing for asset-based rooms

All account creation instructions are included in the same transaction as prize distribution, ensuring atomic execution.

### Prize Pool Validation

The system enforces strict validation rules for prize pool allocation:

- **Maximum Prize Pool**: `40% - host fee` (dynamic calculation)
- **Host Fee Range**: 0-5% (500 basis points)
- **Prize Pool Range**: 0-35% (0-3500 basis points)
- **Total Validation**: Ensures platform (20%) + host allocation (40%) + charity (40%+) = 100%
- **Charity Minimum**: Guaranteed minimum of 40% to charity

Example validation:
```typescript
// Host fee: 1% (100 bps)
// Maximum prize pool: 40% - 1% = 39% (3900 bps)
// Valid configuration: 1% host + 38% prizes + 61% charity = 100%
```

### Program Derived Addresses (PDAs)

All accounts use PDAs for security and determinism:

- **GlobalConfig**: `["global-config"]`
- **Room**: `["room", host_pubkey, room_id]`
- **RoomVault**: `["room-vault", room_pubkey]`
- **PlayerEntry**: `["player-entry", room_pubkey, player_pubkey]`
- **TokenRegistry**: `["approved_tokens"]`

### Contract Structure

The Solana program is organized into modules:

- **Admin Instructions**: `initialize`, `update_global_config`, `set_emergency_pause`, `recover_room`
- **Room Management**: `init_pool_room`, `init_asset_room`, `close_joining`, `cleanup_room`
- **Player Operations**: `join_room`
- **Game Execution**: `declare_winners`, `end_room`
- **Asset Management**: `add_prize_asset`

For detailed contract documentation, see the Rust source code in `C:\Users\isich\bingo-solana-contracts\bingo\programs\bingo\src\lib.rs`.

## Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v22.0.0 or higher)
- [npm](https://www.npmjs.com/) (v10.0.0 or higher)
- [Docker](https://www.docker.com/get-started) (optional, for Docker development)
- [Docker Compose](https://docs.docker.com/compose/install/) (optional, for Docker development)

### Web3 Prerequisites

For Web3 features, you'll need:

- **Solana**: 
  - Testnet SOL for deploying contracts (get from [Solana Faucet](https://faucet.solana.com/))
  - Testnet USDC (mintable at [Circle Faucet](https://faucet.circle.com/))
  - Phantom or other Solana wallet
  
- **EVM (Base/Polygon)**:
  - Testnet ETH/AVAX for gas fees
  - Testnet USDC tokens
  - MetaMask or other EVM wallet
  
- **Stellar**:
  - Testnet XLM (get from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test))
  - Freighter or other Stellar wallet

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Paulagot/bingo.git
cd bingo
```

### 2. Install Dependencies

Using `npm`:

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Then edit `.env` with your specific values. See `.env.example` for all available configuration options.

Key environment variables:
- `VITE_SOLANA_RPC_DEVNET`: Solana RPC endpoint for devnet
- `VITE_SOLANA_RPC_URL`: Solana RPC endpoint for mainnet
- Database configuration (MySQL)
- JWT secret for authentication
- Socket.io configuration

### 4. Set Up Database

Create a MySQL database and update the connection string in `.env`:

```bash
# Example .env configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fundraisely
DB_USER=your_user
DB_PASSWORD=your_password
```

### 5. Run Database Migrations

```bash
# Run migrations (if applicable)
npm run migrate
```

## Running the App

### Option 1: Local Development (Traditional)

```bash
npm run dev
```

This starts both the frontend (Vite) and backend (Express) servers:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

### Option 2: Docker Development (Recommended)

Docker ensures consistent environments across all systems and simplifies deployment.

#### Quick Start with Docker

```bash
# Start all services
npm run docker:dev

# Or use docker-compose directly
docker-compose up
```

The app will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

#### Stop Docker Services

```bash
npm run docker:stop

# Or use docker-compose directly
docker-compose down
```

#### Build Docker Image

```bash
npm run docker:build

# Or use docker directly
docker build -t fundraisely-bingo .
```

### Docker Benefits

- **Consistent Environment**: Same Node.js version (22.18.0) everywhere
- **Faster Onboarding**: New developers can start with just `docker-compose up`
- **Production Parity**: Development environment matches production deployment
- **Easy Deployment**: Deploy to Railway, AWS, or any Docker-compatible platform

## Web3 Deployment

### Solana Deployment

1. **Connect Wallet**: Connect your Solana wallet (Phantom, etc.)
2. **Select Network**: Choose devnet/testnet for testing
3. **Create Room**: Use the quiz creation wizard to set up a room
4. **Configure Fees**: Set host fee (0-5%) and prize pool (0-35%)
5. **Deploy Contract**: The system will deploy the room contract automatically
6. **Share Room**: Share the room ID with players

### EVM Deployment (Base/Polygon)

1. **Connect Wallet**: Connect your EVM wallet (MetaMask, etc.)
2. **Select Network**: Choose Base Sepolia or Polygon Amoy for testing
3. **Create Room**: Use the quiz creation wizard to set up a room
4. **Deploy Contract**: The system will deploy the room contract via factory
5. **Share Room**: Share the room ID with players

### Stellar Deployment

1. **Connect Wallet**: Connect your Stellar wallet (Freighter, etc.)
2. **Select Network**: Choose testnet for testing
3. **Create Room**: Use the quiz creation wizard to set up a room
4. **Deploy Contract**: The system will deploy the Stellar contract
5. **Share Room**: Share the room ID with players

## Scripts

### Development
- `npm run dev`: Starts the development server (frontend + backend)
- `npm run build`: Builds the React app for production
- `npm start`: Starts the production server

### Docker
- `npm run docker:dev`: Start development with Docker Compose
- `npm run docker:build`: Build the Docker image
- `npm run docker:stop`: Stop Docker Compose services

### Testing
- `npm test`: Run all tests
- `npm run test:ui`: Run tests with UI
- `npm run test:coverage`: Run tests with coverage report
- `npm run test:quiz`: Run quiz integration tests
- `npm run test:quiz-watch`: Run quiz tests in watch mode
- `npm run test:deposit-prize`: Test prize asset deposits

### Linting
- `npm run lint`: Run ESLint on the codebase

### Web3
- `npm run fetch-idl`: Fetch latest Solana program IDL

## Tech Stack

### Frontend
- **Framework**: React 18, TypeScript
- **State Management**: Zustand, React Query
- **Styling**: Tailwind CSS
- **Real-Time**: Socket.io Client
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **UI Components**: Headless UI, Radix UI

### Backend
- **Runtime**: Node.js, Express
- **Real-Time**: Socket.io Server
- **Database**: MySQL
- **Authentication**: JWT
- **Validation**: Zod

### Blockchain
- **Solana**: Anchor Framework, @solana/web3.js, @solana/spl-token
- **EVM**: ethers.js, viem, wagmi
- **Stellar**: @stellar/stellar-sdk, @creit.tech/stellar-wallets-kit

### Development Tools
- **Build Tool**: Vite
- **Testing**: Vitest, Testing Library
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript

## Configuration

### Solana Configuration

See `src/chains/solana/config.ts` for:
- Program ID: `7cBb4Ho5W66nBdcaAgt7sLnY3HG6jwTWkmCFF9d2yxBn` (devnet)
- RPC Endpoints: Configurable per network
- Token Mints: USDC, PYUSD, USDT, SOL
- PDA Seeds: Must match Rust program
- Fee Configuration: Platform 20%, Host 0-5%, Combined 40%

### EVM Configuration

See `src/chains/evm/config/` for:
- Factory Contracts: PoolFactory, AssetFactory
- Network Configuration: Base, Polygon
- Token Addresses: USDC per network
- RPC Endpoints: Configurable per network

### Stellar Configuration

See `src/chains/stellar/config.ts` for:
- Network Configuration: Testnet, Mainnet
- Asset Support: XLM, USDC, Glo USD
- Contract Addresses: Stellar contract addresses

## Recent Updates

### Prize Pool Validation Fix
- **Issue**: Prize pool validation was hardcoded to 35% maximum
- **Fix**: Dynamic calculation based on host fee (max prize pool = 40% - host fee)
- **Impact**: Hosts can now allocate up to 39% for prizes when host fee is 1%

### Charity Wallet Handling
- **Issue**: Charity wallet was defaulting to user's wallet
- **Fix**: Priority-based retrieval (GlobalConfig > params > error)
- **Impact**: Proper charity wallet is now used for all distributions

### Token Account Creation
- **Issue**: Prize distribution failed when recipient token accounts didn't exist
- **Fix**: Automatic token account creation before prize distribution
- **Impact**: Prize distribution now works even when token accounts don't exist

## Contributing

Contributions are welcome! Please open an issue or create a pull request for any suggestions or improvements.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Run linting (`npm run lint`)
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For questions or support, please open an issue on GitHub.

## Additional Documentation

- [Solana Chain Documentation](./src/chains/solana/README.md)
- [EVM Chain Documentation](./src/chains/evm/README.md)
- [Stellar Chain Documentation](./src/chains/stellar/README.md)
- [Chains Overview](./src/chains/README.md)
- [Solana Contracts](../bingo-solana-contracts/bingo/programs/bingo/src/lib.rs)
