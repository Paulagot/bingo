/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/fundraisely.json`.
 */
export type Fundraisely = {
  "address": "DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq",
  "metadata": {
    "name": "fundraisely",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Solana fundraising platform with quiz rooms and prize distribution"
  },
  "docs": [
    "Fundraisely Program",
    "",
    "All instruction handlers are implemented in the instructions module.",
    "This keeps lib.rs clean and follows Anchor's recommended project structure."
  ],
  "instructions": [
    {
      "name": "addApprovedToken",
      "docs": [
        "Add a token to the approved list"
      ],
      "discriminator": [
        243,
        15,
        9,
        190,
        211,
        61,
        218,
        73
      ],
      "accounts": [
        {
          "name": "tokenRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  45,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "tokenMint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "addPrizeAsset",
      "docs": [
        "Add prize asset to asset-based room"
      ],
      "discriminator": [
        73,
        174,
        200,
        110,
        91,
        241,
        141,
        104
      ],
      "accounts": [
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "room.host",
                "account": "room"
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "prizeVault",
          "writable": true
        },
        {
          "name": "hostTokenAccount",
          "writable": true
        },
        {
          "name": "host",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "string"
        },
        {
          "name": "prizeIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "declareWinners",
      "docs": [
        "Declare winners for a room (must be called before end_room)"
      ],
      "discriminator": [
        42,
        228,
        213,
        39,
        88,
        35,
        143,
        71
      ],
      "accounts": [
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "room.host",
                "account": "room"
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "host",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "string"
        },
        {
          "name": "winners",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "endRoom",
      "docs": [
        "End room and distribute prizes to winners"
      ],
      "discriminator": [
        102,
        106,
        181,
        155,
        61,
        17,
        40,
        78
      ],
      "accounts": [
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "host"
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "roomVault",
          "writable": true
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "platformTokenAccount",
          "writable": true
        },
        {
          "name": "charityTokenAccount",
          "writable": true
        },
        {
          "name": "hostTokenAccount",
          "writable": true
        },
        {
          "name": "host",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "string"
        },
        {
          "name": "winners",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "initAssetRoom",
      "docs": [
        "Initialize asset-based room"
      ],
      "discriminator": [
        130,
        35,
        252,
        232,
        247,
        146,
        31,
        171
      ],
      "accounts": [
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "host"
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "roomVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "room"
              }
            ]
          }
        },
        {
          "name": "feeTokenMint"
        },
        {
          "name": "tokenRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  45,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "host",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "string"
        },
        {
          "name": "charityWallet",
          "type": "pubkey"
        },
        {
          "name": "entryFee",
          "type": "u64"
        },
        {
          "name": "maxPlayers",
          "type": "u32"
        },
        {
          "name": "hostFeeBps",
          "type": "u16"
        },
        {
          "name": "charityMemo",
          "type": "string"
        },
        {
          "name": "expirationSlots",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "prize1Mint",
          "type": "pubkey"
        },
        {
          "name": "prize1Amount",
          "type": "u64"
        },
        {
          "name": "prize2Mint",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "prize2Amount",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "prize3Mint",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "prize3Amount",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "initPoolRoom",
      "docs": [
        "Create a pool-based room where prizes come from entry fee pool"
      ],
      "discriminator": [
        51,
        17,
        194,
        102,
        72,
        127,
        188,
        37
      ],
      "accounts": [
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "host"
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "roomVault",
          "docs": [
            "SECURITY: Handler validates this is a proper TokenAccount with correct mint/authority.",
            "Using AccountInfo to avoid initialization order issues (room must exist before vault can use it as authority).",
            "The handler performs manual deserialization and validation of TokenAccount structure.",
            "Mutability is not enforced by constraint since this is AccountInfo - writable via account list order."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "room"
              }
            ]
          }
        },
        {
          "name": "feeTokenMint"
        },
        {
          "name": "tokenRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  45,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "host",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "string"
        },
        {
          "name": "charityWallet",
          "type": "pubkey"
        },
        {
          "name": "entryFee",
          "type": "u64"
        },
        {
          "name": "maxPlayers",
          "type": "u32"
        },
        {
          "name": "hostFeeBps",
          "type": "u16"
        },
        {
          "name": "prizePoolBps",
          "type": "u16"
        },
        {
          "name": "firstPlacePct",
          "type": "u16"
        },
        {
          "name": "secondPlacePct",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "thirdPlacePct",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "charityMemo",
          "type": "string"
        },
        {
          "name": "expirationSlots",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "Initialize the global configuration (one-time setup)"
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "platformWallet",
          "type": "pubkey"
        },
        {
          "name": "charityWallet",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializeTokenRegistry",
      "docs": [
        "Initialize the token registry (one-time setup)"
      ],
      "discriminator": [
        206,
        94,
        91,
        162,
        242,
        92,
        51,
        192
      ],
      "accounts": [
        {
          "name": "tokenRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  45,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "joinRoom",
      "docs": [
        "Join a room by paying entry fee"
      ],
      "discriminator": [
        95,
        232,
        188,
        81,
        124,
        130,
        78,
        139
      ],
      "accounts": [
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "room.host",
                "account": "room"
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "playerEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "room"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "roomVault",
          "docs": [
            "Room vault token account - receives player's entry fee tokens.",
            "SECURITY: Properly typed as TokenAccount to ensure correct account validation."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "room"
              }
            ]
          }
        },
        {
          "name": "playerTokenAccount",
          "writable": true
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "string"
        },
        {
          "name": "extrasAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "recoverRoom",
      "docs": [
        "Recover abandoned room (admin only)"
      ],
      "discriminator": [
        23,
        246,
        194,
        40,
        13,
        163,
        9,
        214
      ],
      "accounts": [
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "room.host",
                "account": "room"
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "roomVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "room"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "platformTokenAccount",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "string"
        }
      ]
    },
    {
      "name": "removeApprovedToken",
      "docs": [
        "Remove a token from the approved list"
      ],
      "discriminator": [
        210,
        154,
        53,
        36,
        34,
        32,
        178,
        5
      ],
      "accounts": [
        {
          "name": "tokenRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  45,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "tokenMint",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "globalConfig",
      "discriminator": [
        149,
        8,
        156,
        202,
        160,
        252,
        176,
        217
      ]
    },
    {
      "name": "playerEntry",
      "discriminator": [
        158,
        6,
        39,
        104,
        234,
        4,
        153,
        255
      ]
    },
    {
      "name": "room",
      "discriminator": [
        156,
        199,
        67,
        27,
        222,
        23,
        185,
        94
      ]
    },
    {
      "name": "tokenRegistry",
      "discriminator": [
        227,
        255,
        152,
        118,
        84,
        200,
        145,
        120
      ]
    }
  ],
  "events": [
    {
      "name": "playerJoined",
      "discriminator": [
        39,
        144,
        49,
        106,
        108,
        210,
        183,
        38
      ]
    },
    {
      "name": "roomCreated",
      "discriminator": [
        9,
        177,
        128,
        166,
        26,
        19,
        14,
        243
      ]
    },
    {
      "name": "roomEnded",
      "discriminator": [
        204,
        239,
        146,
        218,
        190,
        21,
        193,
        184
      ]
    },
    {
      "name": "winnersDeclared",
      "discriminator": [
        60,
        25,
        114,
        88,
        126,
        49,
        88,
        136
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6001,
      "name": "roomAlreadyExists",
      "msg": "Room already exists"
    },
    {
      "code": 6002,
      "name": "roomNotFound",
      "msg": "Room not found"
    },
    {
      "code": 6003,
      "name": "roomNotReady",
      "msg": "Room not ready for players"
    },
    {
      "code": 6004,
      "name": "invalidRoomStatus",
      "msg": "Invalid room status"
    },
    {
      "code": 6005,
      "name": "roomAlreadyEnded",
      "msg": "Room already ended"
    },
    {
      "code": 6006,
      "name": "roomExpired",
      "msg": "Room has expired"
    },
    {
      "code": 6007,
      "name": "playerAlreadyJoined",
      "msg": "Player already joined"
    },
    {
      "code": 6008,
      "name": "hostCannotBeWinner",
      "msg": "Host cannot be a winner"
    },
    {
      "code": 6009,
      "name": "invalidWinners",
      "msg": "Invalid winners list"
    },
    {
      "code": 6010,
      "name": "tokenNotApproved",
      "msg": "Token not approved"
    },
    {
      "code": 6011,
      "name": "tokenAlreadyApproved",
      "msg": "Token is already in the approved registry"
    },
    {
      "code": 6012,
      "name": "tokenRegistryFull",
      "msg": "Token registry is full (max 50 tokens)"
    },
    {
      "code": 6013,
      "name": "invalidEntryFee",
      "msg": "Invalid entry fee"
    },
    {
      "code": 6014,
      "name": "hostFeeTooHigh",
      "msg": "Host fee exceeds maximum (5%)"
    },
    {
      "code": 6015,
      "name": "prizePoolTooHigh",
      "msg": "Prize pool exceeds maximum (35%)"
    },
    {
      "code": 6016,
      "name": "charityBelowMinimum",
      "msg": "Charity allocation below minimum (40%)"
    },
    {
      "code": 6017,
      "name": "totalAllocationTooHigh",
      "msg": "Total allocation exceeds maximum"
    },
    {
      "code": 6018,
      "name": "invalidPrizeDistribution",
      "msg": "Prize distribution must sum to 100"
    },
    {
      "code": 6019,
      "name": "insufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6020,
      "name": "emergencyPause",
      "msg": "Contract is paused"
    },
    {
      "code": 6021,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6022,
      "name": "arithmeticUnderflow",
      "msg": "Arithmetic underflow"
    },
    {
      "code": 6023,
      "name": "invalidRoomId",
      "msg": "Invalid room ID (max 32 characters)"
    },
    {
      "code": 6024,
      "name": "invalidMemo",
      "msg": "Invalid memo (max 28 characters)"
    },
    {
      "code": 6025,
      "name": "maxPlayersReached",
      "msg": "Room has reached maximum players"
    },
    {
      "code": 6026,
      "name": "invalidMaxPlayers",
      "msg": "Invalid max_players (must be between 1 and 1000)"
    },
    {
      "code": 6027,
      "name": "invalidTokenMint",
      "msg": "Token account mint does not match room token mint"
    },
    {
      "code": 6028,
      "name": "invalidTokenOwner",
      "msg": "Token account owner does not match expected winner"
    },
    {
      "code": 6029,
      "name": "winnersAlreadyDeclared",
      "msg": "Winners have already been declared for this room"
    },
    {
      "code": 6030,
      "name": "invalidPrizeAmount",
      "msg": "Invalid prize amount (must be > 0)"
    },
    {
      "code": 6031,
      "name": "prizeAlreadyDeposited",
      "msg": "Prize already deposited"
    },
    {
      "code": 6032,
      "name": "prizeNotDeposited",
      "msg": "Prize not deposited yet"
    },
    {
      "code": 6033,
      "name": "prizesNotFullyFunded",
      "msg": "All prizes must be deposited before players can join"
    },
    {
      "code": 6034,
      "name": "roomNotAbandoned",
      "msg": "Room cannot be recovered yet (not abandoned)"
    },
    {
      "code": 6035,
      "name": "invalidPlayerEntry",
      "msg": "Invalid player entry (winner did not join the room)"
    },
    {
      "code": 6036,
      "name": "invalidVaultAccount",
      "msg": "Invalid vault account (must be a valid TokenAccount)"
    },
    {
      "code": 6037,
      "name": "invalidVaultAuthority",
      "msg": "Invalid vault authority (vault must be owned by room PDA)"
    }
  ],
  "types": [
    {
      "name": "globalConfig",
      "docs": [
        "Platform-wide configuration and economic parameters",
        "",
        "This singleton PDA defines the economic constraints and wallet routing",
        "for all fundraising rooms. Created once during program initialization."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Admin public key (can update config)"
            ],
            "type": "pubkey"
          },
          {
            "name": "platformWallet",
            "docs": [
              "Platform wallet (receives platform fees)"
            ],
            "type": "pubkey"
          },
          {
            "name": "charityWallet",
            "docs": [
              "Charity wallet (receives charity donations)"
            ],
            "type": "pubkey"
          },
          {
            "name": "platformFeeBps",
            "docs": [
              "Platform fee in basis points (2000 = 20%)"
            ],
            "type": "u16"
          },
          {
            "name": "maxHostFeeBps",
            "docs": [
              "Maximum host fee in basis points (500 = 5%)"
            ],
            "type": "u16"
          },
          {
            "name": "maxPrizePoolBps",
            "docs": [
              "Maximum prize pool in basis points (3500 = 35%)"
            ],
            "type": "u16"
          },
          {
            "name": "minCharityBps",
            "docs": [
              "Minimum charity allocation in basis points (4000 = 40%)"
            ],
            "type": "u16"
          },
          {
            "name": "emergencyPause",
            "docs": [
              "Emergency pause flag"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "playerEntry",
      "docs": [
        "Individual player participation record",
        "",
        "Immutable receipt of a player joining a specific room, tracking exact",
        "payment amounts and timing. One per player per room."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "docs": [
              "Player's public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "room",
            "docs": [
              "Room public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "entryPaid",
            "docs": [
              "Entry fee paid"
            ],
            "type": "u64"
          },
          {
            "name": "extrasPaid",
            "docs": [
              "Extra amount paid"
            ],
            "type": "u64"
          },
          {
            "name": "totalPaid",
            "docs": [
              "Total amount paid (entry + extras)"
            ],
            "type": "u64"
          },
          {
            "name": "joinSlot",
            "docs": [
              "Slot when player joined"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "playerJoined",
      "docs": [
        "Emitted when a player joins a room",
        "",
        "Enables real-time player count updates and participation tracking."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "docs": [
              "Room PDA that was joined"
            ],
            "type": "pubkey"
          },
          {
            "name": "player",
            "docs": [
              "Player's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "amountPaid",
            "docs": [
              "Total amount paid (entry fee + extras)"
            ],
            "type": "u64"
          },
          {
            "name": "extrasPaid",
            "docs": [
              "Voluntary extra donation amount"
            ],
            "type": "u64"
          },
          {
            "name": "playerCount",
            "docs": [
              "Current number of players in room after this join"
            ],
            "type": "u32"
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp of join"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "prizeAsset",
      "docs": [
        "Asset prize information for asset-based rooms"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "docs": [
              "Token mint for this prize"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Amount of tokens for this prize"
            ],
            "type": "u64"
          },
          {
            "name": "deposited",
            "docs": [
              "Whether this prize has been deposited/escrowed"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "prizeMode",
      "docs": [
        "Prize distribution mode"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "poolSplit"
          },
          {
            "name": "assetBased"
          }
        ]
      }
    },
    {
      "name": "room",
      "docs": [
        "Individual game room state and configuration",
        "",
        "Tracks all financial and state information for a single fundraising game.",
        "Created by hosts via init_pool_room, becomes immutable after ending."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "docs": [
              "Unique room identifier (max 32 bytes)"
            ],
            "type": "string"
          },
          {
            "name": "host",
            "docs": [
              "Host's public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "charityWallet",
            "docs": [
              "Charity wallet address (per-room, from The Giving Block or custom)",
              "Receives the charity portion of entry fees + 100% of extras"
            ],
            "type": "pubkey"
          },
          {
            "name": "feeTokenMint",
            "docs": [
              "Token mint for entry fees"
            ],
            "type": "pubkey"
          },
          {
            "name": "entryFee",
            "docs": [
              "Entry fee amount in token base units"
            ],
            "type": "u64"
          },
          {
            "name": "hostFeeBps",
            "docs": [
              "Host fee in basis points (0-500 = 0-5%)"
            ],
            "type": "u16"
          },
          {
            "name": "prizePoolBps",
            "docs": [
              "Prize pool in basis points (0-4000 = 0-40%)"
            ],
            "type": "u16"
          },
          {
            "name": "charityBps",
            "docs": [
              "Charity percentage in basis points (calculated)"
            ],
            "type": "u16"
          },
          {
            "name": "prizeMode",
            "docs": [
              "Prize distribution mode"
            ],
            "type": {
              "defined": {
                "name": "prizeMode"
              }
            }
          },
          {
            "name": "prizeDistribution",
            "docs": [
              "Prize distribution percentages [1st, 2nd, 3rd]"
            ],
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "status",
            "docs": [
              "Room status"
            ],
            "type": {
              "defined": {
                "name": "roomStatus"
              }
            }
          },
          {
            "name": "playerCount",
            "docs": [
              "Number of players joined"
            ],
            "type": "u32"
          },
          {
            "name": "maxPlayers",
            "docs": [
              "Maximum number of players allowed"
            ],
            "type": "u32"
          },
          {
            "name": "totalCollected",
            "docs": [
              "Total amount collected from all players"
            ],
            "type": "u64"
          },
          {
            "name": "totalEntryFees",
            "docs": [
              "Total from entry fees only"
            ],
            "type": "u64"
          },
          {
            "name": "totalExtrasFees",
            "docs": [
              "Total from extras payments"
            ],
            "type": "u64"
          },
          {
            "name": "ended",
            "docs": [
              "Game ended flag"
            ],
            "type": "bool"
          },
          {
            "name": "creationSlot",
            "docs": [
              "Slot when room was created"
            ],
            "type": "u64"
          },
          {
            "name": "expirationSlot",
            "docs": [
              "Slot when room expires (0 = no expiration)"
            ],
            "type": "u64"
          },
          {
            "name": "charityMemo",
            "docs": [
              "Charity memo for transfers"
            ],
            "type": "string"
          },
          {
            "name": "winners",
            "docs": [
              "Declared winners (up to 3, set by declare_winners instruction)",
              "None values indicate no winner declared for that position"
            ],
            "type": {
              "array": [
                {
                  "option": "pubkey"
                },
                3
              ]
            }
          },
          {
            "name": "prizeAssets",
            "docs": [
              "Prize assets for asset-based rooms (None for pool-based rooms)",
              "[1st place, 2nd place, 3rd place]"
            ],
            "type": {
              "array": [
                {
                  "option": {
                    "defined": {
                      "name": "prizeAsset"
                    }
                  }
                },
                3
              ]
            }
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "roomCreated",
      "docs": [
        "Emitted when a new fundraising room is created",
        "",
        "Allows frontends to display new rooms immediately and indexers to track all rooms."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "docs": [
              "PDA address of the created room"
            ],
            "type": "pubkey"
          },
          {
            "name": "roomId",
            "docs": [
              "Human-readable room identifier (max 32 chars)"
            ],
            "type": "string"
          },
          {
            "name": "host",
            "docs": [
              "Host's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "entryFee",
            "docs": [
              "Entry fee amount in token's base units"
            ],
            "type": "u64"
          },
          {
            "name": "maxPlayers",
            "docs": [
              "Maximum number of players allowed"
            ],
            "type": "u32"
          },
          {
            "name": "expirationSlot",
            "docs": [
              "Slot number when room expires (0 = no expiration)"
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp of room creation"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roomEnded",
      "docs": [
        "Emitted when a room ends and funds are distributed",
        "",
        "Critical for verifying transparent fund distribution and charitable impact."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "docs": [
              "Room PDA that ended"
            ],
            "type": "pubkey"
          },
          {
            "name": "winners",
            "docs": [
              "List of winner wallet addresses (1-3 winners)"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "platformAmount",
            "docs": [
              "Amount sent to platform wallet"
            ],
            "type": "u64"
          },
          {
            "name": "hostAmount",
            "docs": [
              "Amount sent to host wallet"
            ],
            "type": "u64"
          },
          {
            "name": "charityAmount",
            "docs": [
              "Amount sent to charity (includes all extras)"
            ],
            "type": "u64"
          },
          {
            "name": "prizeAmount",
            "docs": [
              "Total prize pool distributed to winners"
            ],
            "type": "u64"
          },
          {
            "name": "totalPlayers",
            "docs": [
              "Total number of players who participated"
            ],
            "type": "u32"
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp of room end"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roomStatus",
      "docs": [
        "Room lifecycle state"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "awaitingFunding"
          },
          {
            "name": "partiallyFunded"
          },
          {
            "name": "ready"
          },
          {
            "name": "active"
          },
          {
            "name": "ended"
          }
        ]
      }
    },
    {
      "name": "tokenRegistry",
      "docs": [
        "Token registry containing allowlist of approved SPL tokens"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Admin who can modify the registry"
            ],
            "type": "pubkey"
          },
          {
            "name": "approvedTokens",
            "docs": [
              "List of approved token mints"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "winnersDeclared",
      "docs": [
        "Emitted when winners are declared for a room",
        "",
        "Separates winner declaration from fund distribution for transparency.",
        "Must be called before end_room."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "docs": [
              "Room PDA for which winners were declared"
            ],
            "type": "pubkey"
          },
          {
            "name": "winners",
            "docs": [
              "List of declared winners (Some = winner declared, None = position unfilled)",
              "Array always has 3 elements, but trailing elements may be None"
            ],
            "type": {
              "array": [
                {
                  "option": "pubkey"
                },
                3
              ]
            }
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp of winner declaration"
            ],
            "type": "i64"
          }
        ]
      }
    }
  ]
};
