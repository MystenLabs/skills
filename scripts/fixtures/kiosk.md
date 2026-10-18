```ts
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
const [kiosk, cap] = tx.moveCall({ target: '0x2::kiosk::new' });
const itemType = '0x123::nft::NFT';
tx.moveCall({ target: '0x2::kiosk::place', typeArguments: [itemType], arguments: [kiosk, cap, tx.object('0x456')] });
tx.moveCall({ target: '0x2::kiosk::list', typeArguments: [itemType], arguments: [kiosk, cap, tx.pure.id('0x456'), tx.pure.u64(100n)] });
tx.moveCall({ target: '0x2::transfer::public_share_object', typeArguments: ['0x2::kiosk::Kiosk'], arguments: [kiosk] });
tx.transferObjects([cap], tx.pure.address('0x789'));
```
