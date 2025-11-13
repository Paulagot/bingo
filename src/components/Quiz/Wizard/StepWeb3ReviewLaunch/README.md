# Web3 Review & Launch Step - Modular Architecture

This directory contains the refactored and modularized `StepWeb3ReviewLaunch` component, which was previously a monolithic 1153-line file. The component has been broken down into focused, reusable modules with comprehensive documentation.

## Architecture Overview

The component follows a modular architecture with clear separation of concerns:

```
StepWeb3ReviewLaunch/
├── index.tsx                 # Main orchestrator component
├── types/
│   └── index.ts              # Type definitions and interfaces
├── hooks/
│   ├── useWeb3Launch.ts      # Main launch flow hook
│   ├── useLaunchMessages.ts  # Status message generation
│   ├── useWalletConnection.ts # Wallet connection management
│   └── useSocketListeners.ts # Socket.IO event handling
├── components/
│   ├── LaunchStatusCharacter.tsx # Animated status character
│   ├── RoomIdsBanner.tsx     # Room/Host IDs display
│   └── ReviewSections.tsx    # Review section components
├── utils/
│   ├── formatting.ts         # Formatting utilities
│   └── deployment.ts         # Deployment parameter building
└── README.md                 # This file
```

## Module Descriptions

### Main Component (`index.tsx`)

The main orchestrator component that coordinates all hooks and renders UI components. It manages:

- Hook composition and state coordination
- UI rendering and layout
- Error handling and user feedback
- Navigation and routing

**Key Responsibilities:**
- Orchestrates the launch flow by coordinating hooks
- Renders review sections and launch controls
- Handles Stellar-specific deployment (delegated to StellarLaunchSection)
- Manages navigation and state transitions

### Types (`types/index.ts`)

Comprehensive type definitions for:

- `Web3LaunchState`: Launch state machine states
- `LaunchMessage`: Status message structure
- `DeploymentResult`: Deployment result structure
- `Web3RoomConfig`: Extended room configuration
- Prize and split type definitions

### Hooks

#### `useWeb3Launch.ts`

Main hook that encapsulates the entire Web3 quiz room deployment flow:

- Pre-flight validation (wallet, configuration)
- ID generation (room and host IDs)
- Contract deployment (EVM/Solana)
- Server room creation
- Error handling and recovery
- State machine management

**Features:**
- Automatic retry for duplicate transactions (Solana)
- Comprehensive error handling
- State machine transitions
- Stellar delegation support

#### `useLaunchMessages.ts`

Generates user-friendly status messages based on:

- Current launch state
- Configuration completeness
- Wallet connection status
- Deployment progress

**Message Types:**
- State messages (generating, deploying, creating, success, error)
- Configuration messages (missing fields, incomplete setup)
- Wallet messages (connection required, connection status)
- Ready messages (all set, ready to deploy)

#### `useWalletConnection.ts`

Manages wallet connection and disconnection:

- Unified interface for all blockchains
- Error handling and logging
- Connection state management

#### `useSocketListeners.ts`

Handles Socket.IO events for room creation:

- `quiz_room_created`: Success event handling
- `quiz_error`: Error event handling
- Automatic cleanup on unmount
- Navigation and state updates

### Components

#### `LaunchStatusCharacter.tsx`

Animated character component that displays launch status:

- Visual states (emoji, color, animation)
- Expression-based styling
- Speech bubble UI

**Visual States:**
- `ready`: Green gradient, rocket emoji
- `warning`: Yellow/orange gradient, warning emoji, pulse
- `generating`: Cyan/blue gradient, ID emoji, pulse
- `deploying`: Purple/pink gradient, lightning emoji, bounce
- `creating`: Indigo/purple gradient, refresh emoji, spin
- `success`: Green gradient, celebration emoji, bounce
- `error`: Red/pink gradient, error emoji, pulse
- `wallet`: Indigo gradient, wallet emoji

#### `RoomIdsBanner.tsx`

Displays generated room and host IDs:

- Prominent banner UI
- Contextual information
- Traceability messaging

#### `ReviewSections.tsx`

Review section components:

- `HostEventSection`: Host name, event date/time, template info
- `PaymentPrizeSection`: Payment method, prize distribution, extras
- `QuizStructureSection`: Configured rounds display
- `BlockchainConfigSection`: Blockchain and wallet information

### Utils

#### `formatting.ts`

Formatting utilities:

- `formatEventDateTime`: Formats ISO date/time strings for display
- `isInvalidTx`: Validates transaction hash/signature format

#### `deployment.ts`

Deployment parameter building:

- `buildDeployParams`: Builds deployment parameters from setup config
- `buildWeb3RoomConfig`: Builds server room configuration from deployment result

**Features:**
- Prize mode mapping (split vs assets)
- Charity wallet resolution
- Prize split transformation
- Asset prize formatting

## Launch Flow

The launch process follows a state machine:

```
ready → generating-ids → deploying-contract → creating-room → success
                                              ↓
                                            error
```

### State Transitions

1. **ready**: Initial state, user can review and launch
2. **generating-ids**: Generating unique room and host IDs
3. **deploying-contract**: Deploying smart contract on blockchain
4. **creating-room**: Creating room record on server
5. **success**: Deployment successful, redirecting to dashboard
6. **error**: Deployment failed, user can retry

### Chain-Specific Behavior

- **Stellar**: Delegates deployment to `StellarLaunchSection` component
- **EVM/Solana**: Handles deployment directly via `contractActions.deploy`

## Error Handling

### Error Recovery

- **Duplicate Transaction (Solana)**: Automatically retries with fresh IDs
- **Network Errors**: Provides user-friendly error messages
- **Server Errors**: Parses and displays server error details

### Error States

- Validation errors (missing wallet, incomplete config)
- Deployment errors (transaction failures, network issues)
- Server errors (room creation failures, verification failures)

## Usage

### Basic Usage

```typescript
import StepWeb3ReviewLaunch from './StepWeb3ReviewLaunch';

<StepWeb3ReviewLaunch
  onBack={() => goToPreviousStep()}
  onResetToFirst={() => resetWizard()}
/>
```

### Using Individual Modules

```typescript
// Use launch hook directly
import { useWeb3Launch } from './hooks/useWeb3Launch';

const { handleLaunch, launchState, canLaunch } = useWeb3Launch({
  setupConfig,
  selectedChain,
  // ... other config
});

// Use formatting utilities
import { formatEventDateTime } from './utils/formatting';

const formatted = formatEventDateTime('2024-01-15T14:30:00Z');
// { date: "Monday, January 15, 2024", time: "02:30 PM" }
```

## Documentation

All modules include comprehensive JSDoc documentation covering:

- Purpose and responsibilities
- Usage examples
- Type definitions
- Error handling
- Chain-specific behavior
- State machine transitions

## Migration Notes

The original `StepWeb3ReviewLaunch.tsx` file has been replaced with this modular structure. The component maintains the same external API, so no changes are required in parent components.

## Future Improvements

Potential enhancements:

1. **Extract Stellar Logic**: Move Stellar deployment handling to a dedicated hook
2. **Error Boundary**: Add error boundary for better error handling
3. **Testing**: Add unit tests for hooks and utilities
4. **Accessibility**: Enhance accessibility features
5. **Performance**: Optimize re-renders with React.memo where appropriate

## Related Files

- `../StellarLaunchSection.tsx`: Stellar-specific deployment component
- `../Web3QuizWizard.tsx`: Parent wizard component
- `../../hooks/useQuizSetupStore.ts`: Quiz setup state management
- `@/hooks/useContractActions.ts`: Contract deployment actions

