export type Aqueduct = {
  "version": "0.1.0",
  "name": "aqueduct",
  "instructions": [
    {
      "name": "addPoolConfig",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "poolConfig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "userCreate",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mangoGroup",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoV3",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "userSettings",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "isPaused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "userDelete",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "positionOpen",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "position",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "positionMint",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "positionTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintA",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintB",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "positionBump",
          "type": "u8"
        },
        {
          "name": "tickLowerIndex",
          "type": "i32"
        },
        {
          "name": "tickUpperIndex",
          "type": "i32"
        }
      ]
    },
    {
      "name": "positionSwap",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArray0",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArray1",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArray2",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "aToB",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "positionFund",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "position",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "positionTokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "positionMint",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenOwnerAccountA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArrayLower",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArrayUpper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tickLowerIndex",
          "type": "i32"
        },
        {
          "name": "tickUpperIndex",
          "type": "i32"
        },
        {
          "name": "minimumAAmount",
          "type": "u64"
        },
        {
          "name": "minimumBAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initAta",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "positionClose",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "position",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "positionTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "positionMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAqueductA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAqueductB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArrayLower",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArrayUpper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "fundsDeposit",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "fundsWithdraw",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "poolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "task",
            "type": "publicKey"
          },
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "approved",
            "type": "bool"
          },
          {
            "name": "rejected",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "user",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "whirlpool",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "OutOfRange"
    },
    {
      "code": 6001,
      "name": "TooMuchAmount"
    },
    {
      "code": 6002,
      "name": "WhirlpoolNumberDownCastError"
    },
    {
      "code": 6003,
      "name": "LiquidityZero"
    }
  ]
};

export const IDL: Aqueduct = {
  "version": "0.1.0",
  "name": "aqueduct",
  "instructions": [
    {
      "name": "addPoolConfig",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "poolConfig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "userCreate",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mangoGroup",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoV3",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "userSettings",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "isPaused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "userDelete",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "positionOpen",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "position",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "positionMint",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "positionTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintA",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintB",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "positionBump",
          "type": "u8"
        },
        {
          "name": "tickLowerIndex",
          "type": "i32"
        },
        {
          "name": "tickUpperIndex",
          "type": "i32"
        }
      ]
    },
    {
      "name": "positionSwap",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArray0",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArray1",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArray2",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "aToB",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "positionFund",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "position",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "positionTokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "positionMint",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenOwnerAccountA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArrayLower",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArrayUpper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tickLowerIndex",
          "type": "i32"
        },
        {
          "name": "tickUpperIndex",
          "type": "i32"
        },
        {
          "name": "minimumAAmount",
          "type": "u64"
        },
        {
          "name": "minimumBAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initAta",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "positionClose",
      "accounts": [
        {
          "name": "auth",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "whirlpoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "whirlpool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "position",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "positionTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "positionMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAqueductA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenOwnerAccountB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenVaultB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAqueductB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArrayLower",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tickArrayUpper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "fundsDeposit",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "fundsWithdraw",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userPda",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "poolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "task",
            "type": "publicKey"
          },
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "approved",
            "type": "bool"
          },
          {
            "name": "rejected",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "user",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "whirlpool",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "OutOfRange"
    },
    {
      "code": 6001,
      "name": "TooMuchAmount"
    },
    {
      "code": 6002,
      "name": "WhirlpoolNumberDownCastError"
    },
    {
      "code": 6003,
      "name": "LiquidityZero"
    }
  ]
};
