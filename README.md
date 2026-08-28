# Flow Tools

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Preact](https://img.shields.io/badge/Preact-673AB8?logo=preact&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-MV3-4285F4?logo=googlechrome&logoColor=white)
[![Latest Release](https://img.shields.io/github/v/release/deezhizyu/flow-tools)](https://github.com/deezhizyu/flow-tools/releases/latest)

Collapsible quick-select buttons for Nano Banana, Veo 3.1, and Omni Flash on [Google Flow](https://labs.google/fx/tools/flow), plus a one-click paste-prompt button.

## Features

- [x] Quick-select buttons for Nano Banana, Veo 3.1, and Omni Flash models/settings
- [x] One-click paste-prompt button
- [x] One-click clear-references button
- [x] Draggable, repositionable widget
- [x] Collapsible sections, remembers your picks
- [x] Live scan of Flow's own panel to discover models/durations/resolutions for your account tier
- [x] Limit prompt textarea height to 100px
- [ ] Remove slow loading blur fade for generations
- [ ] Advanced settings page

## How to install

1. Download the latest release: [github.com/deezhizyu/flow-tools/releases/latest](https://github.com/deezhizyu/flow-tools/releases/latest)
2. Unpack the downloaded zip into a folder.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode** (top right).
5. Click **Load unpacked** and select the unpacked folder.

## Development

```bash
pnpm i        # install dependencies
pnpm dev      # start the dev build, watches for changes
pnpm build    # type-check and produce a production build in dist/
```

Load the `dist/` folder as an unpacked extension (see steps above) to try it out. `pnpm dev` rebuilds on save, but Chrome still needs a manual reload of the extension.
