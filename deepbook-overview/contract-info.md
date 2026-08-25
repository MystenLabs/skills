# Contract Addresses, Coins, and Pools

All addresses are for Sui Mainnet.

> **Version drift warning:** The package IDs below are sourced from [docs.sui.io](https://docs.sui.io/onchain-finance/deepbook/deepbookv3/contract-information). On-chain versions may be ahead of what the docs list — the protocol upgrades frequently. Always check the on-chain `Published.toml` or query the registry's `allowed_versions` for the current active version before integrating. Calls through a disabled package version abort with `EPackageVersionDisabled`.

## Package versions

The table below lists versions documented on docs.sui.io. The on-chain active version may be higher.

| Version | Package ID | Date | Notes |
|---------|-----------|------|-------|
| v6 (docs) | `0x337f4f4f6567fcd778d5454f27c16c70e2f274cc6377ea6249ddf491482ef497` | Jan 7, 2026 | Final preparation for margin launch |
| v5 | `0x2d93777cc8b67c064b495e8606f2f8f5fd578450347bbe7b36e0bc03963c1c40` | Dec 18, 2025 | |
| v4 | `0x00c1a56ec8c4c623a848b2ed2f03d23a25d17570b670c22106f336eb933785cc` | Dec 9, 2025 | |
| v3 | `0xb29d83c26cdd2a64959263abbcfc4a6937f0c9fccaf98580ca56faded65be244` | Jun 11, 2025 | |
| v2 | `0xcaf6ba059d539a97646d47f0b9ddf843e138d215e2a12ca1f4585d386f7aec3a` | Apr 16, 2025 | |
| v1 | `0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809` | Oct 10, 2024 | |

**Registry ID:** `0xaf16199a2dff736e9f07a845f23c5da6df6f756eddb631aed9d24a93efc4549d`

## Supported tokens

| Token | Type address | Decimals |
|-------|-------------|----------|
| DEEP | `0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP` | 6 |
| SUI | `0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI` | 9 |
| USDC (native) | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` | 6 |
| BETH | `0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH` | 8 |
| WUSDT | `0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN` | 6 |
| WUSDC | `0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN` | 6 |
| NS | `0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS` | 6 |
| TYPUS | `0xf82dc05634970553615eef6112a1ac4fb7bf10272bf6cbe0f80ef44a6c489385::typus::TYPUS` | 9 |
| AUSD | `0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD` | 6 |
| DRF | `0x294de7579d55c110a00a7c4946e09a1b5cbeca2592fbb83fd7bfacba3cfeaf0e::drf::DRF` | 6 |
| SEND | `0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND` | 6 |
| xBTC | `0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC` | 8 |
| WAL | `0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL` | 9 |
| IKA | `0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA` | 9 |
| ALKIMI | `0x1a8f4bc33f8ef7fbc851f156857aa65d397a6a6fd27a7ac2ca717b51f2fd9489::alkimi::ALKIMI` | 9 |
| LZWBTC | `0x0041f9f9344cac094454cd574e333c4fdb132d7bcc9379bcd4aab485b2a63942::wbtc::WBTC` | 8 |
| SUIUSDE | `0x41d587e5336f1c86cad50d38a7136db99333bb9bda91cea4ba69115defeb1402::sui_usde::SUI_USDE` | 6 |
| USDSUI | `0x44f838219cf67b058f3b37907b655f226153c18e33dfcd0da559a844fea9b1c1::usdsui::USDSUI` | 6 |

## Trading pools

| Pair | Pool ID | Tick size | Lot size | Taker fee | Maker fee |
|------|---------|-----------|----------|-----------|-----------|
| DEEP/SUI | `0xb663828d6217467c8a1838a03793da896cbe745b150ebd57d82f814ca579fc22` | 0.00001 | 1 | 0 bps | 0 bps |
| DEEP/USDC | `0xf948981b806057580f91622417534f491da5f61aeaf33d0ed8e69fd5691c95ce` | 0.00001 | 1 | 0 bps | 0 bps |
| SUI/USDC | `0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407` | 0.00001 | 0.1 | 1 bps | 0 bps |
| BETH/USDC | `0x1109352b9112717bd2a7c3eb9a416fff1ba6951760f5bdd5424cf5e4e5b3e65c` | 0.001 | 0.0001 | 10 bps | 5 bps |
| WUSDC/USDC | `0xa0b9ebefb38c963fd115f52d71fa64501b79d1adcb5270563f92ce0442376545` | 0.00001 | 0.1 | 0 bps | 0 bps |
| WUSDT/USDC | `0x4e2ca3988246e1d50b9bf209abb9c1cbfec65bd95afdacc620a36c67bdb8452f` | 0.00001 | 0.1 | 1 bps | 0.5 bps |
| NS/SUI | `0x27c4fdb3b846aa3ae4a65ef5127a309aa3c1f466671471a806d8912a18b253e8` | 0.00001 | 0.1 | 10 bps | 5 bps |
| NS/USDC | `0x0c0fdd4008740d81a8a7d4281322aee71a1b62c449eb5b142656753d89ebc060` | 0.00001 | 0.1 | 10 bps | 5 bps |
| TYPUS/SUI | `0xe8e56f377ab5a261449b92ac42c8ddaacd5671e9fec2179d7933dd1a91200eec` | 0.00001 | 0.1 | 10 bps | 5 bps |
| SUI/AUSD | `0x183df694ebc852a5f90a959f0f563b82ac9691e42357e9a9fe961d71a1b809c8` | 0.0001 | 0.1 | 10 bps | 5 bps |
| AUSD/USDC | `0x5661fc7f88fbeb8cb881150a810758cf13700bb4e1f31274a244581b37c303c3` | 0.00001 | 0.1 | 1 bps | 0.5 bps |
| DRF/SUI | `0x126865a0197d6ab44bfd15fd052da6db92fd2eb831ff9663451bbfa1219e2af2` | 0.000001 | 1 | 10 bps | 5 bps |
| SEND/USDC | `0x1fe7b99c28ded39774f37327b509d58e2be7fff94899c06d22b407496a6fa990` | 0.000001 | 0.1 | 10 bps | 5 bps |
| WAL/USDC | `0x56a1c985c1f1123181d6b881714793689321ba24301b3585eec427436eb1c76d` | 0.000001 | 0.1 | 10 bps | 5 bps |
| WAL/SUI | `0x81f5339934c83ea19dd6bcc75c52e83509629a5f71d3257428c2ce47cc94d08b` | 0.000001 | 0.1 | 10 bps | 5 bps |
| xBTC/USDC | `0x20b9a3ec7a02d4f344aa1ebc5774b7b0ccafa9a5d76230662fdc0300bb215307` | 1 | 0.00001 | 10 bps | 5 bps |
| IKA/USDC | `0xfa732993af2b60d04d7049511f801e79426b2b6a5103e22769c0cead982b0f47` | 0.000001 | 10 | 10 bps | 5 bps |
| ALKIMI/SUI | `0x84752993c6dc6fce70e25ddeb4daddb6592d6b9b0912a0a91c07cfff5a721d89` | 0.00001 | 0.1 | 10 bps | 5 bps |
| LZWBTC/USDC | `0xf5142aafa24866107df628bf92d0358c7da6acc46c2f10951690fd2b8570f117` | 1 | 0.00001 | 10 bps | 5 bps |
| SUIUSDE/USDC | `0x0fac1cebf35bde899cd9ecdd4371e0e33f44ba83b8a2902d69186646afa3a94b` | 0.000001 | 0.1 | 1 bps | 0.5 bps |
| SUI/SUIUSDE | `0x034f3a42e7348de2084406db7a725f9d9d132a56c68324713e6e623601fb4fd7` | 0.0001 | 0.1 | 10 bps | 5 bps |
| USDSUI/USDC | `0xa374264d43e6baa5aa8b35ff18ff24fdba7443b4bcb884cb4c2f568d32cdac36` | 0.000001 | 0.1 | 1 bps | 0.5 bps |
| SUI/USDSUI | `0x826eeacb2799726334aa580396338891205a41cf9344655e526aae6ddd5dc03f` | 0.0001 | 0.1 | 10 bps | 5 bps |
