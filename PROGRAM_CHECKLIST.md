# FundRaisely - Complete Program Functionality Checklist

## Application Overview

**Primary Purpose:** A Web2 and Web3 fundraising quiz platform that enables clubs, charities, schools, and community groups to host interactive trivia games with integrated payment processing and blockchain-based prize distribution.

**Tech Stack:**
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + Socket.io
- Database: MySQL
- Blockchain: Multi-chain support (Stellar/Soroban, Solana, EVM chains)
- Real-time: WebSocket (Socket.io) with namespaces

---

## 1. Core Quiz Platform Features

### Quiz Creation & Setup
- Multi-step wizard for quiz configuration
- Web2 (traditional) and Web3 (blockchain) quiz modes
- Template-based quiz creation
- Custom question bank loading
- Round configuration with multiple game types:
  - General Trivia
  - Wipeout (elimination rounds)
  - Speed Round
- Question filtering by category and difficulty (easy/medium/hard)
- Global question tracking to prevent repeats across quiz sessions
- Team-based or individual player modes
- Configurable questions per round (typically 6)
- Configurable time limits per question
- Media support for questions (images, etc.)

### Game Types & Mechanics
- **General Trivia**: Standard multiple-choice questions with time limits
- **Wipeout**: Penalty-based elimination with debt system
- **Speed Round**: Fast-paced question answering
- Tiebreaker rounds for score resolution
- Freeze mechanics (pause player interactions during specific moments)
- Point-based scoring with difficulty multipliers
- Debt/penalty system for wrong answers (Wipeout mode)
- Settlement system for debt against earned points

### Live Game Management
- Real-time player join/leave handling
- Host dashboard with live controls
- Host preview panel showing upcoming questions
- Player ready status tracking
- Room capacity management (configurable limits)
- Auto-play mode for question progression
- Manual question advancement
- Game pause/unpause functionality
- Round-by-round progression
- Activity ticker showing player actions
- Live leaderboard updates
- Round statistics tracking
- Answer review phase between questions
- Player reconnection support (rejoin with state sync)

---

## 2. Player Experience

### Joining & Playing
- Room code-based joining system
- QR code generation for easy room access
- Player name registration
- Wallet connection for Web3 rooms
- Entry fee payment (Web2 or Web3)
- Optional "extras" purchase (hints, power-ups)
- Multiple-choice answer selection
- Real-time answer submission
- Visual feedback for correct/incorrect answers
- Personal score tracking
- Leaderboard visibility
- Round completion summaries
- Final standings and prize information

### Player Extras/Power-ups
- Buy Hint (reveal one wrong answer)
- Buy Free Pass (skip question without penalty)
- 50/50 (eliminate two wrong answers)
- Audience Poll (see how others answered)
- Rob Points (steal points from another player)
- Global extras usable across all rounds
- Round-specific extras
- Team-based extra limits
- Payment tracking for extras purchases

---

## 3. Web2 (Traditional) Features

### User Authentication & Management
- Club/organization registration
- Email + password authentication
- Password strength validation (uppercase, lowercase, number, 8+ chars)
- Password reset flow
- GDPR consent tracking
- Marketing consent tracking
- Privacy policy acceptance
- Session management
- JWT-based authentication for API routes

### Payment Methods (Web2)
- Cash payment option
- Card payment option
- Instant payment (e.g., Revolut)
- Payment method selection during room join
- Entry fee collection tracking
- Extras payment tracking
- Payment reconciliation system

### Subscription & Credits System
- Game credit system (consume 1 credit per quiz)
- Tiered entitlement plans:
  - Free tier (limited features)
  - Standard tier
  - Premium tier
- Player capacity limits per plan
- Round type restrictions by plan
- Extras availability by plan
- Credit balance checking
- Credit consumption on room creation

---

## 4. Web3 (Blockchain) Features

### Multi-Chain Support
- **Stellar/Soroban** integration (testnet & mainnet)
- **Solana** integration (devnet)
- **EVM chains** support (Ethereum, Base, Polygon, etc.)
- Chain selection interface
- Chain-specific wallet providers
- Network switching support

### Smart Contract Integration
- Stellar Soroban smart contract deployment
- Solana program deployment (Anchor-based)
- EVM contract deployment
- Contract address validation (format checking)
- Deployment transaction verification
- On-chain room initialization
- Token approval flows

### Web3 Room Creation
- Multi-chain quiz room deployment
- Contract deployment UI
- Prize pool configuration:
  - Split mode (percentage-based distribution)
  - Asset mode (specific token/NFT prizes)
- Token selection (USDC, SOL, XLM, custom tokens)
- Entry fee in native or stablecoin
- Host fee percentage configuration
- Charity donation integration
- Deployment proof validation (tx hash + contract address)
- Unauthenticated Web3 room creation (no login required)

### Web3 Wallet Integration
- **Stellar**: Freighter, LOBSTR, Albedo, Rabet wallet support
- **Solana**: Phantom, Solflare, Backpack, multiple wallet adapters
- **EVM**: WalletConnect, MetaMask, Rainbow, Coinbase Wallet
- Wallet connection flows
- Address formatting/display
- Balance checking
- Network validation

### Prize Distribution
- On-chain winner declaration
- Automated prize distribution via smart contracts
- Split prizes (1st, 2nd, 3rd place percentages)
- Asset-based prizes (specific tokens/NFTs)
- Charity donation routing (The Giving Block integration)
- Transaction hash tracking
- Explorer link generation
- Prize distribution confirmation UI
- Host fee collection
- Failed transaction handling

### Solana Program Features (Rust)
- Room initialization (pool & asset modes)
- Player entry with SPL token payment
- Token registry for approved tokens
- Winner declaration
- Prize distribution
- Room recovery for failed transactions
- Admin functions (initialize, token management)
- Asset room support for NFT prizes

---

## 5. The Giving Block (TGB) Integration

### Crypto-to-Charity Features
- Deposit address generation API
- Multi-network support (Ethereum, Solana, Bitcoin, etc.)
- Currency support (USDC, SOL, BTC, ETH, etc.)
- Organization ID mapping to charities
- Donation amount specification
- Donor metadata tracking
- QR code generation for deposits
- Webhook handler for donation confirmations
- AES-256-CBC webhook encryption/decryption
- Deposit status tracking (detected, confirmed, converted)
- Mock mode for testing (bypass real API calls)

---

## 6. Fundraising Mechanics

### Fundraising Options
- Entry fee configuration
- Dynamic pricing for extras
- Pay-to-play mechanics
- Team-based fundraising limits
- Global fundraising extras
- Round-specific fundraising options
- Charity selection and routing
- Sponsor recognition
- Prize value tracking

### Financial Reconciliation
- Player payment tracking
- Extras purchase ledger
- Total revenue calculation
- Payment method breakdown
- Host fee calculation
- Charity donation calculation
- CSV export for reconciliation
- PDF report generation
- ZIP download for multi-file exports
- Approval workflow for financial data

---

## 7. Host Controls & Administration

### Host Dashboard
- Player list with real-time updates
- Admin list management (co-hosts)
- Add player manually
- Remove players
- Game state monitoring
- Round progression controls
- Question preview
- Answer statistics view
- Leaderboard monitoring
- Financial overview
- Payment reconciliation access
- Prize configuration
- Room settings management

### Host Controls During Game
- Start game button
- Next question button
- Auto-play toggle
- Pause/unpause game
- Round skip functionality
- Winner declaration controls
- Review mode controls
- Tiebreaker initiation
- Score adjustments
- Player removal during game
- Real-time player activity monitoring

### Post-Game Features
- Final leaderboard display
- Winner assignment UI
- Prize delivery panel
- Certificate generation (planned)
- Game statistics export
- Impact reporting (funds raised, participants)
- Celebration screens with confetti effects
- Social sharing capabilities

---

## 8. Data Management

### Database (MySQL)
- Club/organization accounts
- User authentication data (bcrypt hashed passwords)
- Impact campaign pledge tracking
- Community registration submissions
- Session data
- Table prefix support for multi-tenancy

### In-Memory State Management
- Quiz rooms (Socket.io namespaces)
- Player state per room
- Question state tracking
- Answer history
- Score calculation
- Round progression state
- Timer state
- Freeze state
- Extras usage tracking
- Session expiration handling

### File Storage
- Community registration JSON storage
- Pledge data JSON backup
- Generated SEO files
- Sitemap files (multi-domain)
- Robots.txt files (multi-domain)

---

## 9. Real-Time Communication (Socket.io)

### Quiz Namespace (`/quiz`)

**Host Events:**
- `create_quiz_room` - Initialize a new quiz room
- `start_round` - Begin a new round
- `next_question` - Advance to next question
- `declare_winners` - Finalize game winners
- `end_game` - Conclude the quiz
- `remove_player` - Kick a player
- `start_tiebreaker` - Initiate tiebreaker round

**Player Events:**
- `join_quiz_room` - Join as player/admin
- `submit_answer` - Submit question answer
- `use_extra` - Use a power-up/extra
- `reconnect` - Rejoin after disconnect

**Shared Events:**
- Room state synchronization
- Player list updates
- Question emission
- Timer synchronization
- Leaderboard updates
- Score updates
- Round completion notifications
- Game phase transitions
- Error notifications

### Bingo Namespace (Legacy Web3 Bingo)
- Room creation
- Player join/leave
- Game start
- Number calling
- Winner declaration
- Payment finalization

### Rate Limiting
- Socket event rate limiting
- Per-user/socket throttling
- Abuse prevention

---

## 10. Marketing & Public Pages

### Landing Pages
- Main landing page
- Pricing page with plan comparison
- Features showcase
- Testimonials page
- About us page
- Blog and resources
- Founding partners page
- WhatsNew page (product updates)

### Web3-Specific Pages
- Web3 hub page (`/web3`)
- Web3 features page
- Web3 testimonials
- Web3 partners
- How it works (Web3 explainer)
- Impact campaign landing page
- Impact campaign join page
- Impact campaign leaderboard

### SEO & Multi-Domain
- Dynamic SEO meta tag injection
- Open Graph tags
- Twitter Card tags
- Canonical URL management
- Multi-domain support (fundraisely.ie, fundraisely.co.uk)
- Domain-specific sitemaps
- Domain-specific robots.txt
- Server-side rendering (SSR) for SEO
- 301 redirects for legacy URLs

---

## 11. API Endpoints

### Quiz API (`/quiz/api`)
- `POST /create-room` - Create authenticated Web2 room (requires JWT)
- `POST /create-web3-room` - Create unauthenticated Web3 room
- `GET /me/entitlements` - Get user's plan entitlements

### Community & Campaign
- `POST /quiz/api/community-registration` - Legacy community registration (deprecated)
- `POST /quiz/api/impactcampaign/pledge` - Submit impact campaign pledge
- `GET /quiz/api/impactcampaign/pledge` - List all pledges (admin)

### The Giving Block (TGB)
- `POST /api/tgb/create-deposit-address` - Generate charity deposit address
- `POST /api/tgb/webhook` - Receive donation webhooks from TGB

### Authentication & User Management
- `POST /api/clubs/register` - Register new club/organization
- `POST /api/clubs/login` - Authenticate club
- `GET /api/clubs/me` - Get current club info

### Utility
- `POST /api/contact` - Contact form submission with email
- `POST /api/auth/reset` - Password reset request
- `GET /api/health` - Health check endpoint
- `GET /debug/rooms` - Debug room states (development)

---

## 12. Security Features

### Security Headers (Helmet.js)
- X-Powered-By removal
- X-Frame-Options (SAMEORIGIN)
- Referrer-Policy (strict-origin-when-cross-origin)
- Cross-Origin-Opener-Policy (same-origin)
- Cross-Origin-Resource-Policy (same-site)
- HSTS (production only, 1 year max-age)
- Content-Security-Policy (Report-Only mode)

### Rate Limiting
- Express rate limiting middleware
- Contact form rate limiting
- Socket connection rate limiting
- Create room rate limiting
- Join room rate limiting

### Input Validation & Sanitization
- Zod schema validation
- HTML escaping for user inputs
- Email format validation
- Password strength validation
- Contact method validation
- Payment method normalization
- Web3 proof validation (contract addresses, tx hashes)

### Authentication & Authorization
- JWT token validation
- bcrypt password hashing (cost factor 12)
- Host-only action verification
- Admin role verification
- Session expiration handling

---

## 13. Developer & Testing Features

### Testing
- Vitest test framework
- Integration tests for quiz gameplay
- Player answer testing
- Test UI with Vitest UI
- Coverage reporting
- Mock mode for TGB API (testing without external calls)

### Debugging & Monitoring
- Socket debug panel
- Wallet debug component
- Console logging throughout (debug flags)
- Room state logging
- Player action tracking
- Transaction hash verification
- Environment variable debugging
- Database connection status

### Scripts
- `check-player-entry.ts` - Verify player on-chain
- `check-room-status.ts` - Check room state
- `check-wallet-balance.ts` - Verify wallet balances
- `find-room.ts` - Locate room by ID
- `list-all-rooms.ts` - List all rooms
- `generateStaticSeoFiles.js` - Pre-generate SEO files

---

## 14. Deployment & Infrastructure

### Build & Deploy
- Vite build system
- Production/development environment detection
- Asset bundling with hash-based filenames
- Static file serving with aggressive caching (1 year for assets)
- HTML no-cache policy for dynamic content
- Bundle analysis (`build:analyze`)
- Concurrent development mode (Vite + Express)

### Environment Configuration
- `.env` file support
- Database configuration (MySQL with SSL)
- Web3 RPC endpoints configuration
- TGB API credentials
- SMTP/email configuration
- JWT secret management
- Webhook encryption keys

### Error Handling
- Global error handlers
- Unhandled rejection logging
- Uncaught exception logging
- Socket error handling
- Database connection failure graceful degradation (demo mode)
- Transaction failure recovery

---

## 15. Impact Campaign (Nov–Jan)

### Campaign-Specific Features
- Pledge form for communities
- Leaderboard tracking
- Community registration
- Ecosystem selection (Stellar, Solana, EVM)
- Contact method collection (Email, Telegram, X/Twitter)
- User metadata tracking
- Source IP logging
- User agent tracking
- Campaign duration management
- Impact metrics display

---

## 16. Analytics & Reporting

### Game Statistics
- Questions answered count
- Correct/incorrect answer ratios
- Average response time
- Points earned per round
- Extras usage statistics
- Player participation metrics
- Round completion rates
- Tiebreaker frequency

### Financial Reporting
- Total funds raised per quiz
- Payment method breakdown
- Entry fee totals
- Extras purchase totals
- Host fee calculation
- Charity donation amount
- Web3 transaction summaries
- Reconciliation exports (CSV, PDF, ZIP)

### Impact Reporting
- Total participants
- Total funds raised
- Charity beneficiaries
- Community engagement metrics
- Campaign progress tracking

---

## 17. UI/UX Features

### Design System
- TailwindCSS styling
- Gradient backgrounds
- Responsive design (mobile-friendly)
- Dark mode support (partial)
- Lucide React icons
- Framer Motion animations
- Loading spinners with messages
- Canvas confetti for celebrations
- Modal dialogs (Headless UI)
- Toast notifications

### Accessibility
- Keyboard navigation support
- Screen reader compatibility (ARIA labels)
- Color contrast compliance
- Focus management
- Error message clarity

---

## 18. Edge Cases & Advanced Features

### Reconnection & Recovery
- Player reconnection with state sync
- Host reconnection
- Admin reconnection
- Socket disconnect handling
- Session cleanup for expired connections
- Room persistence across server restarts (in-memory, no DB persistence)

### Game Flow Edge Cases
- Mid-game player removal
- Host transfer on disconnect
- Room deletion when empty
- Tiebreaker resolution
- Simultaneous answer submissions
- Timer desync prevention
- Freeze state coordination
- Late joiners (blocked after game start)

### Web3 Edge Cases
- Failed transaction recovery
- Network switching mid-game
- Wallet disconnect handling
- Insufficient balance detection
- Gas estimation
- Transaction timeout handling
- Contract deployment verification

---

## Summary Statistics

- **Total Pages:** 35+ routes
- **API Endpoints:** 15+ REST endpoints
- **Socket Events:** 40+ real-time events
- **Blockchain Chains Supported:** 3+ (Stellar, Solana, EVM)
- **Game Types:** 3 (General Trivia, Wipeout, Speed Round)
- **Player Extras:** 6+ types
- **Payment Methods:** 5+ options (cash, card, instant, Web3, unknown)
- **Database Tables:** 5+ tables
- **Smart Contracts:** Custom Solana program + Stellar contracts
- **Third-Party Integrations:** The Giving Block, WalletConnect, Reown, multiple wallet providers

---

## Conclusion

This is a comprehensive fundraising quiz platform with dual Web2/Web3 capabilities, real-time multiplayer gameplay, blockchain-based prize distribution, charity integration, and extensive customization options for hosts. The application is designed for clubs, charities, schools, and communities to raise funds through engaging, gamified quiz experiences.
