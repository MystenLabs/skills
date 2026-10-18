```tsx
import { useState } from 'react';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';

export function Send() {
  const dAppKit = useDAppKit();
  const [digest, setDigest] = useState('');
  async function send() {
    const tx = new Transaction();
    tx.transferObjects([coinWithBalance({ balance: 100n })], '0x456');
    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (result.$kind === 'FailedTransaction') throw new Error('Transaction failed');
    setDigest(result.Transaction.digest);
  }
  return <><button onClick={send}>Send</button><p>{digest}</p></>;
}
```
