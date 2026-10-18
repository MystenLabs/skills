```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// This fixture is compiled only. No signer or client is executed by the harness.
const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'http://127.0.0.1:1' });
const signer = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(1));
const tx = new Transaction();
tx.transferObjects([coinWithBalance({ balance: 100_000_000n })], '0x456');
const result = await client.signAndExecuteTransaction({ transaction: tx, signer });
if (result.$kind === 'FailedTransaction') throw new Error('Transaction failed');
console.log(result.Transaction.digest);
```
