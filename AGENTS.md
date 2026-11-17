# DJConnect VibeCast Receiver

This repository owns the central vibecast.tv bootstrap frontend and static Google Cast
Custom Web Receiver distribution. Core owns the one shared renderer source.
Read `BOOTSTRAP_CODEX_SESSION.md` before significant work.

The receiver is stateless: no API, analytics, pairing credentials, storage,
proxy or relay. It receives one runtime-scoped handoff and connects directly to
the user's Home Assistant Broadcast WebSocket. Canonical contracts live in
`djconnect-music-dj/djconnect/SYNC_PROMPTS.md` and `docs/product/VIBECAST_ARCHITECTURE.md`.

Bootstrap scope: `bootstrap/` → `dist/bootstrap`, separate from the immutable
Cast `wwwroot` import. No rendezvous service or invented production protocol.
See `docs/WEB_BOOTSTRAP.md` for exact design pin, contracts and effect gates.
