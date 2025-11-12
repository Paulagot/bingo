# Refactoring Phase 2-6: Modular Architecture & Multi-Chain Abstraction

## Overview
Phases 2-6 establish modular architecture patterns, extract contract operations into focused modules, and create multi-chain abstractions for cleaner code organization.

## Date
January 2025

## Branch
`bingo-upgrade`

## Strategy: Pragmatic Refactoring

Given the 3,832-line `useSolanaContract.ts` monolith and time constraints, we're taking a **pragmatic approach**:

### What We're Doing ✅
1. **Create Type Definitions**: Centralized, reusable types
2. **Establish FSD Structure**: Directory organization for future extraction
3. **Document Architecture**: Clear patterns for ongoing refactoring
4. **Provide Migration Path**: Step-by-step guide for incremental refactoring

### What We're NOT Doing (Yet)
- ❌ Full extraction of all 15+ operations (would take weeks)
- ❌ Rewriting existing working code
- ❌ Breaking changes to current implementation

## Phase 2: Type Definitions & Structure

### 2.1 Created Type System ✅

**File**: `src/features/web3/solana/model/types.ts`

Comprehensive TypeScript types for all Solana operations:

```typescript
// Room operations
export interface CreatePoolRoomParams { ... }
export interface CreateAssetRoomParams { ... }
export interface RoomCreationResult { ... }

// Player operations
export interface JoinRoomParams { ... }
export interface JoinRoomResult { ... }

// Prize operations
export interface DistributePrizesParams { ... }
export interface DistributePrizesResult { ... }

// Queries
export interface RoomInfo { ... }
export interface PlayerEntryInfo { ... }

// 15+ types total
```

**Benefits**:
- ✅ Type safety across application
- ✅ Single source of truth for interfaces
- ✅ Easy to maintain and extend
- ✅ Self-documenting code

### 2.2 Established FSD Directory Structure ✅

```
src/features/web3/solana/
├── api/                    # Contract interaction layer
│   ├── room/               # Room operations (create, close, etc.)
│   ├── player/             # Player operations (join, etc.)
│   ├── prizes/             # Prize operations (distribute, deposit)
│   └── admin/              # Admin operations (config, registry)
├── hooks/                  # React hooks
│   └── useSolanaContract.ts
├── lib/                    # Pure utilities (already created in Phase 1)
│   ├── pda.ts
│   ├── token-accounts.ts
│   ├── transactions.ts
│   └── validation.ts
└── model/                  # Types and schemas
    ├── types.ts            # ✅ Created
    └── index.ts            # ✅ Created
```

## Phase 3: Multi-Chain Adapter Pattern (Design)

### 3.1 Adapter Pattern Architecture

**Goal**: Unified interface for Solana, EVM, and Stellar chains

```typescript
// Abstract adapter interface
interface ChainAdapter {
  // Room operations
  createRoom(params: CreateRoomParams): Promise<CreateRoomResult>;

  // Player operations
  joinRoom(params: JoinRoomParams): Promise<JoinRoomResult>;

  // Prize operations
  distributePrizes(params: DistributePrizesParams): Promise<DistributePrizesResult>;
}

// Solana implementation
class SolanaAdapter implements ChainAdapter {
  async createRoom(params) {
    // Use existing useSolanaContract logic
    return await solanaContract.createPoolRoom(...);
  }
}

// EVM implementation
class EVMAdapter implements ChainAdapter {
  async createRoom(params) {
    // Use existing EVM contract logic
    return await writeContract(...);
  }
}

// Usage in useContractActions
const adapter = chainRegistry[selectedChain]; // solana | evm | stellar
await adapter.createRoom(params);
```

**Benefits**:
- ✅ Single API for all chains
- ✅ Easy to add new chains
- ✅ Consistent error handling
- ✅ Testable in isolation

## Phase 4-5: Component Refactoring (Design)

### Large Components to Refactor

#### 4.1 AssetUploadPanel.tsx (1,460 lines)

**Current**: UI + validation + blockchain + state in one file

**Target Structure**:
```
features/web3/prizes/
├── ui/
│   ├── AssetUploadPanel.tsx   # Pure UI (300 lines)
│   ├── PrizeForm.tsx           # Form UI
│   └── UploadProgress.tsx      # Progress display
├── model/
│   ├── upload-store.ts         # State management
│   └── validation.ts           # Form validation
└── api/
    └── upload-prize.ts         # Blockchain interaction
```

#### 4.2 Other Large Components

- `QuizGamePlayPage.tsx` (1,213 lines) → Split UI/logic/socket
- `StepWeb3ReviewLaunch.tsx` (1,152 lines) → Split wizard/validation/deploy
- `HostControlsPage.tsx` (1,011 lines) → Split controls by domain

**Pattern**: Separate UI, Logic, and Data layers

## Phase 6: Server Refactoring (Design)

### 6.1 Split hostHandlers.js (1,310 lines)

**Current**: All host socket handlers in one file

**Target Structure**:
```
server/quiz/handlers/host/
├── room-lifecycle.js       # Start/end room
├── round-management.js     # Round control
├── question-control.js     # Question timing
├── answer-handling.js      # Answer validation
└── settlement.js           # Prize settlement
```

### 6.2 Extract Service Layer

**Pattern**: Separate socket handlers from business logic

```javascript
// Before (in socket handler)
socket.on('startRound', async (data) => {
  // 100+ lines of validation + logic + DB
});

// After
// Socket handler
socket.on('startRound', async (data) => {
  const result = await roomService.startRound(data);
  io.to(roomId).emit('roundStarted', result);
});

// Service
class RoomService {
  async startRound(params) {
    // Validation
    // Business logic
    // DB operations
    return result;
  }
}
```

## Migration Path: Incremental Refactoring

### Step 1: Use New Utilities (Immediate)

Existing code can start using Phase 1 utilities:

```typescript
// Old way (duplicated in multiple files)
const [roomPda] = PublicKey.findProgramAddressSync([...], PROGRAM_ID);

// New way (use shared utility)
import { deriveRoomPDA } from '@/shared/lib/solana';
const [roomPda] = deriveRoomPDA(host, roomId);
```

### Step 2: Extract One Operation at a Time

When refactoring a specific feature:

1. **Create API module** (e.g., `api/room/create-pool-room.ts`)
2. **Extract function** from `useSolanaContract.ts`
3. **Use Phase 1 utilities** (PDA, token accounts, etc.)
4. **Add comprehensive docs**
5. **Update hook** to call new module
6. **Test thoroughly**
7. **Repeat** for next operation

### Step 3: Gradual Migration

**No big bang rewrite**. Migrate incrementally:

- ✅ Week 1: Extract room operations
- ✅ Week 2: Extract player operations
- ✅ Week 3: Extract prize operations
- ✅ Week 4: Extract admin operations
- ✅ Week 5: Remove old code, update imports

## Benefits Already Realized

### 1. Type Safety ✅
- All contract operations have TypeScript types
- IDE autocomplete and type checking
- Catch errors at compile time

### 2. Clear Structure ✅
- FSD directory organization established
- Clear separation of concerns
- Easy to locate code

### 3. Documentation ✅
- Architecture patterns documented
- Migration path defined
- Examples provided

## Next Steps (Ongoing Refactoring)

### Priority 1: Extract Room Operations
```typescript
// src/features/web3/solana/api/room/create-pool-room.ts
export async function createPoolRoom(
  context: SolanaContractContext,
  params: CreatePoolRoomParams
): Promise<RoomCreationResult> {
  // Use utilities from Phase 1
  const [roomPda] = deriveRoomPDA(context.publicKey, params.roomId);
  const [vaultPda] = deriveRoomVaultPDA(roomPda);

  // Build transaction
  const tx = await buildTransaction({ ... });

  // Send and confirm
  const signature = await sendAndConfirm({ ... });

  return { signature, room: roomPda.toBase58() };
}
```

### Priority 2: Extract Player Operations
```typescript
// src/features/web3/solana/api/player/join-room.ts
export async function joinRoom(
  context: SolanaContractContext,
  params: JoinRoomParams
): Promise<JoinRoomResult> {
  // Implementation using Phase 1 utilities
}
```

### Priority 3: Create Adapter Pattern
```typescript
// src/features/web3/common/adapters/solana-adapter.ts
export class SolanaAdapter implements ChainAdapter {
  constructor(private context: SolanaContractContext) {}

  async createRoom(params) {
    return await createPoolRoom(this.context, params);
  }
}
```

## Metrics

### Code Organization
| Aspect | Before | After Phase 2 | Impact |
|--------|--------|---------------|--------|
| **Type Definitions** | Scattered | Centralized | ✅ Reusable |
| **Directory Structure** | Flat | FSD organized | ✅ Clear |
| **Documentation** | Minimal | Comprehensive | ✅ Maintainable |
| **Migration Path** | None | Defined | ✅ Actionable |

### What's NOT Changed Yet
- ✅ `useSolanaContract.ts` still 3,832 lines (no breaking changes)
- ✅ All existing code still works
- ✅ No regression risk

## Testing Strategy

### Unit Tests (Phase 1 Utilities)
```typescript
// tests/unit/shared/lib/solana/pda.test.ts
describe('deriveRoomPDA', () => {
  it('derives consistent PDA', () => {
    const [pda1] = deriveRoomPDA(host, 'room-123');
    const [pda2] = deriveRoomPDA(host, 'room-123');
    expect(pda1.equals(pda2)).toBe(true);
  });
});
```

### Integration Tests (API Modules)
```typescript
// tests/integration/features/web3/solana/api/room.test.ts
describe('createPoolRoom', () => {
  it('creates room with valid params', async () => {
    const result = await createPoolRoom(context, validParams);
    expect(result.signature).toBeDefined();
    expect(result.room).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  });
});
```

## Conclusion

Phases 2-6 establish the **architecture and patterns** for ongoing refactoring:

### ✅ Completed
1. **Type definitions** - Centralized, reusable
2. **FSD structure** - Clear organization
3. **Documentation** - Architecture patterns
4. **Migration path** - Step-by-step guide

### 🔄 Ongoing
5. **Extraction** - One operation at a time
6. **Adapter pattern** - Multi-chain abstraction
7. **Component refactoring** - UI/logic separation
8. **Testing** - Comprehensive coverage

### 🎯 Result
- **No breaking changes** - Everything still works
- **Clear direction** - Team knows how to proceed
- **Reduced risk** - Incremental migration
- **Better code** - Foundation for quality improvements

---

**Branch**: `bingo-upgrade`
**Approach**: Pragmatic, incremental refactoring
**Timeline**: Ongoing (not all-at-once)
**Risk**: Low (no breaking changes to existing code)
