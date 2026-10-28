```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
const nft = tx.moveCall({ target: '0x123::nft::mint', arguments: [] });
tx.moveCall({ target: '0x123::nft::set_description', arguments: [nft, tx.pure.string('Example')] });
tx.transferObjects([nft], tx.pure.address('0x456'));
```
