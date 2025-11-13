/**
 * Web3 Review & Launch Step - Type Definitions
 *
 * This module contains all TypeScript type definitions for the Web3 review and launch step
 * of the quiz wizard. These types define the state machine, configuration structures, and
 * component interfaces used throughout the launch flow.
 *
 * ## Type Categories
 *
 * ### Launch State Machine
 * - `Web3LaunchState`: Represents the current state of the deployment process
 * - Used to control UI rendering, button states, and user feedback
 *
 * ### Message System
 * - `LaunchMessage`: Structure for status messages displayed to users
 * - Includes expression type (emoji/visual state) and message text
 *
 * ### Configuration
 * - `Web3RoomConfig`: Extended configuration sent to server for room creation
 * - Includes all Web3-specific fields and deployment metadata
 *
 * ## Usage
 *
 * ```typescript
 * import type { Web3LaunchState, LaunchMessage } from './types';
 *
 * const [state, setState] = useState<Web3LaunchState>('ready');
 * const message: LaunchMessage = getCurrentMessage(state);
 * ```
 *
 * Used by StepWeb3ReviewLaunch component and related hooks/components.
 */

/**
 * Launch State Machine
 *
 * Represents the different states during the Web3 quiz room deployment process.
 * The state machine follows this flow:
 *
 * 1. `ready` - Initial state, user can review and launch
 * 2. `generating-ids` - Generating unique room and host IDs
 * 3. `deploying-contract` - Deploying smart contract on blockchain
 * 4. `creating-room` - Creating room record on server
 * 5. `success` - Deployment successful, redirecting to dashboard
 * 6. `error` - Deployment failed, user can retry
 *
 * ## State Transitions
 *
 * - `ready` → `generating-ids` → `deploying-contract` → `creating-room` → `success`
 * - Any state → `error` (on failure)
 * - `error` → `ready` (on retry)
 *
 * ## UI Behavior
 *
 * - `ready`: Show review UI, enable launch button
 * - `generating-ids`: Show loading, disable buttons
 * - `deploying-contract`: Show deployment progress, disable buttons
 * - `creating-room`: Show room creation progress, disable buttons
 * - `success`: Show success message, auto-redirect
 * - `error`: Show error message, enable retry
 */
export type Web3LaunchState =
  | 'ready'
  | 'generating-ids'
  | 'deploying-contract'
  | 'creating-room'
  | 'success'
  | 'error';

/**
 * Launch Status Message
 *
 * Structure for displaying status messages to users during the launch process.
 * Each message has an expression type (determines emoji/visual style) and message text.
 *
 * ## Expression Types
 *
 * - `ready`: Green gradient, rocket emoji - Ready to deploy
 * - `warning`: Yellow/orange gradient, warning emoji - Configuration incomplete
 * - `generating`: Cyan/blue gradient, ID emoji - Generating IDs
 * - `deploying`: Purple/pink gradient, lightning emoji - Deploying contract
 * - `creating`: Indigo/purple gradient, refresh emoji - Creating room
 * - `success`: Green gradient, celebration emoji - Success
 * - `error`: Red/pink gradient, error emoji - Error occurred
 * - `wallet`: Indigo gradient, wallet emoji - Wallet connection needed
 *
 * ## Usage
 *
 * ```typescript
 * const message: LaunchMessage = {
 *   expression: 'deploying',
 *   message: 'Deploying quiz contract on Solana…'
 * };
 * ```
 */
export interface LaunchMessage {
  /** Visual expression type (determines emoji and styling) */
  expression: 'ready' | 'warning' | 'generating' | 'deploying' | 'creating' | 'success' | 'error' | 'wallet';
  /** Human-readable message text */
  message: string;
}

/**
 * Formatted Event Date/Time
 *
 * Parsed and formatted event date/time information for display.
 * Separates date and time formatting for better UI presentation.
 *
 * ## Fields
 *
 * - `date`: Formatted date string (e.g., "Monday, January 15, 2024")
 * - `time`: Formatted time string (e.g., "02:30 PM")
 *
 * ## Usage
 *
 * ```typescript
 * const eventDateTime = formatEventDateTime('2024-01-15T14:30:00Z');
 * // { date: "Monday, January 15, 2024", time: "02:30 PM" }
 * ```
 */
export interface FormattedEventDateTime {
  /** Formatted date string */
  date: string;
  /** Formatted time string */
  time: string;
}

/**
 * Deployment Result
 *
 * Result from smart contract deployment operation.
 * Contains all information needed to create the room on the server.
 *
 * ## Fields
 *
 * - `success`: Whether deployment was successful
 * - `contractAddress`: Deployed contract/program address
 * - `txHash`: Transaction hash/signature
 * - `explorerUrl`: Block explorer URL for the transaction
 *
 * ## Chain-Specific Notes
 *
 * - **Solana**: `contractAddress` is program ID, `txHash` is transaction signature
 * - **EVM**: `contractAddress` is contract address, `txHash` is transaction hash
 * - **Stellar**: `contractAddress` is contract ID, `txHash` is transaction hash
 */
export interface DeploymentResult {
  /** Whether deployment succeeded */
  success: boolean;
  /** Deployed contract/program address */
  contractAddress: string;
  /** Transaction hash or signature */
  txHash: string;
  /** Block explorer URL (optional) */
  explorerUrl?: string;
}

/**
 * Web3 Room Configuration
 *
 * Extended configuration object sent to the server for Web3 room creation.
 * Includes all Web3-specific fields, deployment metadata, and prize structure.
 *
 * ## Key Fields
 *
 * - `roomContractAddress`: Canonical field for contract address (preferred)
 * - `web3ContractAddress`: Legacy field (maintained for backward compatibility)
 * - `contractAddress`: Old field (maintained for backward compatibility)
 * - `deploymentTxHash`: Transaction hash proving deployment
 * - `web3Chain`: Selected blockchain (solana, evm, stellar)
 * - `web3PrizeStructure`: Prize distribution percentages
 *
 * ## Charity Wallet Handling
 *
 * The charity wallet is handled in two phases:
 * 1. **Room Creation**: Uses GlobalConfig charity wallet (or provided charityAddress)
 * 2. **Prize Distribution**: Uses TGB dynamic charity address (from web3CharityAddress)
 *
 * This allows room creation to succeed even if TGB address is not available yet.
 *
 * ## Usage
 *
 * ```typescript
 * const web3RoomConfig: Web3RoomConfig = {
 *   ...setupConfig,
 *   roomContractAddress: deployResult.contractAddress,
 *   deploymentTxHash: deployResult.txHash,
 *   web3Chain: 'solana',
 *   // ... other fields
 * };
 * ```
 */
export interface Web3RoomConfig {
  /** All base setup configuration */
  [key: string]: any;
  /** Canonical contract address field (preferred) */
  roomContractAddress: string;
  /** Legacy contract address field */
  web3ContractAddress?: string;
  /** Old contract address field */
  contractAddress?: string;
  /** Deployment transaction hash */
  deploymentTxHash: string;
  /** Selected blockchain */
  web3Chain: string;
  /** EVM network (if applicable) */
  evmNetwork?: string;
  /** Solana cluster (if applicable) */
  solanaCluster?: string;
  /** Prize distribution structure */
  web3PrizeStructure: {
    firstPlace: number;
    secondPlace: number;
    thirdPlace: number;
  };
  /** Payment method (always 'web3' for Web3 rooms) */
  paymentMethod: 'web3';
  /** Web3 room flag */
  isWeb3Room: true;
  /** Confirmed host wallet address */
  hostWalletConfirmed?: string;
  /** Charity organization ID (TGB) */
  web3CharityId?: string;
  /** Charity display name */
  web3CharityName?: string;
  /** Charity wallet address (TGB dynamic address) */
  web3CharityAddress?: string;
}

/**
 * Prize Mode
 *
 * Type of prize distribution model for the quiz room.
 *
 * - `split`: Prize pool from collected entry fees (percentage-based)
 * - `assets`: Pre-deposited prize assets (NFTs, tokens, etc.)
 * - `cash`: Traditional cash prizes (not used in Web3 flow)
 */
export type PrizeMode = 'split' | 'assets' | 'cash';

/**
 * Prize Split Configuration
 *
 * Percentage distribution for prize pool mode.
 * Defines how prize pool is split among winners.
 *
 * ## Structure
 *
 * - Keys are place numbers (1, 2, 3)
 * - Values are percentages (must sum to 100)
 *
 * ## Example
 *
 * ```typescript
 * const prizeSplits: PrizeSplits = {
 *   1: 50,  // 50% to 1st place
 *   2: 30,  // 30% to 2nd place
 *   3: 20   // 20% to 3rd place
 * };
 * ```
 */
export interface PrizeSplits {
  [place: number]: number;
}

/**
 * Web3 Prize Split
 *
 * Overall prize distribution percentages for entry fees.
 * Defines how entry fees are split between charity, host, and prizes.
 *
 * ## Constraints
 *
 * - Platform: Fixed 20%
 * - Host: 0-5% (configurable)
 * - Prizes: 0-35% (max = 40% - host fee)
 * - Charity: Minimum 40% (remainder)
 *
 * ## Example
 *
 * ```typescript
 * const splits: Web3PrizeSplit = {
 *   charity: 60,  // 60% to charity
 *   host: 2,      // 2% to host
 *   prizes: 18    // 18% to prize pool (40% - 2% = 38% max, so 18% is valid)
 * };
 * ```
 */
export interface Web3PrizeSplit {
  /** Charity percentage (minimum 40%) */
  charity: number;
  /** Host fee percentage (0-5%) */
  host: number;
  /** Prize pool percentage (0-35%, max = 40% - host fee) */
  prizes: number;
}

