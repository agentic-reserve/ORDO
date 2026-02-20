import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

export type AgentRegistry = {
  version: '0.1.0';
  name: 'agent_registry';
  instructions: [
    {
      name: 'registerAgent';
      accounts: [
        {
          name: 'agentAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'authority';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: 'name';
          type: 'string';
        },
        {
          name: 'description';
          type: 'string';
        },
        {
          name: 'agentUri';
          type: 'string';
        },
        {
          name: 'services';
          type: {
            vec: 'string';
          };
        },
        {
          name: 'x402Support';
          type: 'bool';
        },
        {
          name: 'generation';
          type: 'u32';
        }
      ];
    },
    {
      name: 'updateReputation';
      accounts: [
        {
          name: 'agentAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'reputationRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'rater';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: 'score';
          type: 'i64';
        },
        {
          name: 'comment';
          type: 'string';
        }
      ];
    }
  ];
  accounts: [
    {
      name: 'agentAccount';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'authority';
            type: 'publicKey';
          },
          {
            name: 'name';
            type: 'string';
          },
          {
            name: 'description';
            type: 'string';
          },
          {
            name: 'agentUri';
            type: 'string';
          },
          {
            name: 'services';
            type: {
              vec: 'string';
            };
          },
          {
            name: 'x402Support';
            type: 'bool';
          },
          {
            name: 'active';
            type: 'bool';
          },
          {
            name: 'parentAgent';
            type: {
              option: 'publicKey';
            };
          },
          {
            name: 'registeredAt';
            type: 'i64';
          },
          {
            name: 'reputationScore';
            type: 'i64';
          },
          {
            name: 'generation';
            type: 'u32';
          },
          {
            name: 'bump';
            type: 'u8';
          }
        ];
      };
    },
    {
      name: 'reputationRecord';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'agent';
            type: 'publicKey';
          },
          {
            name: 'rater';
            type: 'publicKey';
          },
          {
            name: 'score';
            type: 'i64';
          },
          {
            name: 'comment';
            type: 'string';
          },
          {
            name: 'timestamp';
            type: 'i64';
          },
          {
            name: 'bump';
            type: 'u8';
          }
        ];
      };
    }
  ];
  events: [
    {
      name: 'AgentRegisteredEvent';
      fields: [
        {
          name: 'agent';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'authority';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'name';
          type: 'string';
          index: false;
        },
        {
          name: 'generation';
          type: 'u32';
          index: false;
        },
        {
          name: 'timestamp';
          type: 'i64';
          index: false;
        }
      ];
    },
    {
      name: 'ReputationUpdatedEvent';
      fields: [
        {
          name: 'agent';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'rater';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'score';
          type: 'i64';
          index: false;
        },
        {
          name: 'newTotalScore';
          type: 'i64';
          index: false;
        },
        {
          name: 'timestamp';
          type: 'i64';
          index: false;
        }
      ];
    }
  ];
  errors: [
    {
      code: 6000;
      name: 'NameTooLong';
      msg: 'Agent name is too long (max 50 characters)';
    },
    {
      code: 6001;
      name: 'DescriptionTooLong';
      msg: 'Agent description is too long (max 200 characters)';
    },
    {
      code: 6002;
      name: 'UriTooLong';
      msg: 'Agent URI is too long (max 200 characters)';
    },
    {
      code: 6003;
      name: 'TooManyServices';
      msg: 'Too many services (max 10)';
    },
    {
      code: 6004;
      name: 'ServiceNameTooLong';
      msg: 'Service name is too long (max 50 characters)';
    },
    {
      code: 6005;
      name: 'CommentTooLong';
      msg: 'Reputation comment is too long (max 500 characters)';
    },
    {
      code: 6006;
      name: 'InvalidReputationScore';
      msg: 'Reputation score must be between -100 and +100';
    },
    {
      code: 6007;
      name: 'CannotRateSelf';
      msg: 'Cannot rate yourself';
    }
  ];
};

export interface AgentAccountData {
  authority: PublicKey;
  name: string;
  description: string;
  agentUri: string;
  services: string[];
  x402Support: boolean;
  active: boolean;
  parentAgent: PublicKey | null;
  registeredAt: BN;
  reputationScore: BN;
  generation: number;
  bump: number;
}

export interface ReputationRecordData {
  agent: PublicKey;
  rater: PublicKey;
  score: BN;
  comment: string;
  timestamp: BN;
  bump: number;
}
