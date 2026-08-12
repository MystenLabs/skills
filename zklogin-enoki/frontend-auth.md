# Social Login with Enoki + dApp Kit

Sourced from [docs.enoki.mystenlabs.com/ts-sdk](https://docs.enoki.mystenlabs.com/ts-sdk), `/ts-sdk/register`, and `/ts-sdk/sign-in`. This is the **current** Enoki frontend flow. Do not generate the legacy `EnokiFlow` / `useEnokiFlow` / `useZkLogin` / `EnokiFlowProvider` API — it is absent from current docs.

## Install

```bash
npm install @mysten/enoki
```

This assumes you already have **dApp Kit** set up (`@mysten/dapp-kit`): the app wrapped in `QueryClientProvider` → `SuiClientProvider` → `WalletProvider`. Enoki registers its accounts via the Wallet Standard, so they appear through `useWallets()` like any other wallet.

## Step 1 — Register Enoki wallets into dApp Kit

`registerEnokiWallets` registers a wallet per configured OAuth provider:

```typescript
import { registerEnokiWallets } from '@mysten/enoki';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

const { unregister } = registerEnokiWallets({
  client: suiClient,
  network: 'testnet',
  apiKey: 'YOUR_PUBLIC_ENOKI_API_KEY', // public key — safe for the frontend
  providers: {
    google:   { clientId: 'YOUR_GOOGLE_CLIENT_ID' },
    facebook: { clientId: 'YOUR_FACEBOOK_CLIENT_ID' },
    twitch:   { clientId: 'YOUR_TWITCH_CLIENT_ID' },
  },
});
```

Arguments:
- `client` — a `SuiClient` pointed at the target network's fullnode.
- `network` — `'testnet'` | `'mainnet'` (type `EnokiNetwork`).
- `apiKey` — your **public** Enoki API key. Never the private key.
- `providers` — map keyed by `google` / `facebook` / `twitch`, each `{ clientId, redirectUrl? }`. `clientId` comes from that provider's OAuth console. `redirectUrl` defaults to the current page if omitted.
- Returns `{ unregister }`.

### Re-register on network change

Enoki wallets are bound to one network. Track the active network and re-register when it changes, cleaning up with `unregister`:

```typescript
import { useEffect } from 'react';
import { useSuiClientContext } from '@mysten/dapp-kit';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';

function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();

  useEffect(() => {
    if (!isEnokiNetwork(network)) return;
    const { unregister } = registerEnokiWallets({
      client,
      network,
      apiKey: 'YOUR_PUBLIC_ENOKI_API_KEY',
      providers: {
        google: { clientId: 'YOUR_GOOGLE_CLIENT_ID' },
      },
    });
    return unregister; // cleanup on network change / unmount
  }, [client, network]);

  return null;
}
```

> `isEnokiNetwork` guards against registering on an unsupported network. Verify the exact guard name against the installed SDK types if your linter flags it.

## Step 2 — Render sign-in buttons

Filter the dApp Kit wallet list down to Enoki wallets and key them by provider:

```typescript
import { useConnectWallet, useCurrentAccount, useWallets } from '@mysten/dapp-kit';
import { isEnokiWallet, type EnokiWallet, type AuthProvider } from '@mysten/enoki';

function SignIn() {
  const currentAccount = useCurrentAccount();
  const { connect } = useConnectWallet();

  const wallets = useWallets().filter(isEnokiWallet);
  const walletsByProvider = wallets.reduce(
    (map, wallet) => map.set(wallet.provider, wallet),
    new Map<AuthProvider, EnokiWallet>(),
  );

  const googleWallet = walletsByProvider.get('google');

  if (currentAccount) {
    return <div>Signed in as {currentAccount.address}</div>;
  }

  return (
    <button
      disabled={!googleWallet}
      onClick={() => googleWallet && connect({ wallet: googleWallet })}
    >
      Sign in with Google
    </button>
  );
}
```

- `isEnokiWallet` — type guard to keep only Enoki wallets.
- `AuthProvider` — the provider union **type** (`'google' | 'facebook' | 'twitch' | …`). It is a TypeScript type, **not** a React provider component.
- `EnokiWallet` — wallet type; has a `.provider` field.
- `connect({ wallet })` triggers the OAuth flow. The Enoki SDK **handles the OAuth flow automatically in a pop-up window** — there is no separate callback handler to wire up in the current API.
- After a successful connect, `useCurrentAccount()` returns the account; **`currentAccount.address` is the user's zkLogin Sui address.**

> The current docs document the auto pop-up flow. A redirect-mode (non-popup) callback handler is not documented on the current pages — don't assert a specific handler name for it.

## Step 3 — Enoki Portal configuration

In the **Enoki Portal** (`https://portal.enoki.mystenlabs.com`):
- Create API keys (public for frontend, private for backend).
- Enable each OAuth provider and paste its `clientId`.
- Configure **allowed origins / redirect URLs** to match your app.

In **each OAuth provider's console** (Google Cloud, Meta, Twitch): register the same redirect URLs / authorized origins. Mismatched redirect config is the most common reason the login flow fails silently.

## Gotchas

- **Public vs private key:** only the **public** key goes in `registerEnokiWallets`. The private key is backend-only (see `sponsored-transactions.md`).
- **Network binding:** re-register on network change or the account won't work.
- **Redirect/origin mismatch:** must match in both the Portal and the provider console.
- **Auto-approve signing:** Enoki wallet signing skips the confirmation prompt — add your own confirmation UI before executing transactions.
