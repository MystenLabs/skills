```ts filename=dapp-kit.ts
import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';

export const dAppKit = createDAppKit({
  networks: ['testnet'],
  defaultNetwork: 'testnet',
  createClient: (network) => new SuiGrpcClient({ network, baseUrl: 'http://127.0.0.1:1' }),
});

declare module '@mysten/dapp-kit-react' {
  interface Register { dAppKit: typeof dAppKit; }
}
```

```tsx filename=App.tsx
import { DAppKitProvider, useCurrentAccount, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { dAppKit } from './dapp-kit';

function WalletStatus() {
  const account = useCurrentAccount();
  const network = useCurrentNetwork();
  return <p>{account?.address ?? 'Disconnected'} on {network}</p>;
}

export default function App() {
  return <DAppKitProvider dAppKit={dAppKit}><ConnectButton /><WalletStatus /></DAppKitProvider>;
}
```
