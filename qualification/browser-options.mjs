// Keep the same pinned Chromium executable in the Playwright and HTTP suites.
// The separate headless shell can stall on loopback navigation on macOS.
export function browserLaunchOptions(name) {
 return name === 'chromium' && process.platform === 'darwin' ? { channel: 'chromium' } : {};
}
