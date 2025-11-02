# Multiplayer Fundraising Quiz App 🎲  

A real-time multiplayer quiz game built with React, TypeScript, and Socket.io, along with smart contracts. featuring responsive design, and dynamic room management.  Smart Contract to managed payment and winner prizes.

## Features  

- **Multiplayer realtime**: Play with friends in real-time.
- **Dynamic Room Management**: Create or join rooms with unique room IDs.  
- **Responsive Design**: Fully optimized for mobile and desktop devices.  
- **Real-Time Updates**: Instant updates for all players in a room.  
---

## Prerequisites (not ready yet)

- **testnet tokens to mint and play with**: inlcuding mint button for testnet USD Glo
- **requires testnet ETH/SOL/AVAX to launch smart contract and game**: host requies testnet ETH/SOL/AVAX to launch a game.
Ensure you have the following installed:  
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)  

---

## Getting Started  

### 1. Clone the Repository

```bash  
git clone https://github.com/your-username/bingo-game.git  
cd bingo-game
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

---

## Running the App

### Option 1: Local Development (Traditional)

```bash
npm run dev
```

By default, the app will run at `http://localhost:5173`.

### Option 2: Docker Development (Recommended)

Docker ensures consistent environments across all systems and includes a local MySQL database.

#### Prerequisites
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

#### Quick Start with Docker

```bash
# Start all services (app + database)
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
- **No Setup Required**: Includes MySQL database automatically
- **Faster Onboarding**: New developers can start with just `docker-compose up`
- **Production Parity**: Development environment matches production deployment

---

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

### Linting
- `npm run lint`: Run ESLint on the codebase  

---

## Tech Stack  

- **Frontend**: React, TypeScript, CSS Modules  
- **Backend**: Node.js, Express, Socket.io  
- **Styling**: Tailwind CSS  
- **Blockchain**: Solana, Base, Avalalche


---

## Roadmap  

## License  

This project is licensed under the [MIT License](LICENSE).  

---

## Contributing  

Contributions are welcome! Please open an issue or create a pull request for any suggestions or improvements.

---

## Contact
