# DJConnect VibeCast Receiver development extension

`djconnect-vibecast-receiver` owns central bootstrap source, static receiver distribution and browser-facing validation. Core owns shared renderer source; API owns any separately qualified rendezvous service. DJConnect remains the product-authority for cross-component architecture and roadmap.

Use `README.md`, `REPOSITORY_STATUS.md`, `package.json`, `tests/receiver.test.mjs`, and the existing receiver CI for local development and validation.

Bootstrap validation: `npm ci`, `npm test`, `npm run check:bootstrap`.
Keep bootstrap output separate from pinned `wwwroot`; see `docs/WEB_BOOTSTRAP.md`.
