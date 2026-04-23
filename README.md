# ROM Vault

A local-first desktop application for managing a physical and digital ROM collection. Track your backlog, organize by console, manage cover art, and monitor collection completeness across platforms.

Built with Tauri 2, React 18, and SQLite. Everything runs on your machine -- no accounts necessary, no internet requirement, no telemetry, nothing sent to me.

---

## Screenshots

### Library
![Library — compact list view](public/screenshots/Main%20library%20density1.png)
*Compact list view with per-ROM backlog status, file size, region, and format tags*

![Library — medium density with cover art](public/screenshots/Main%20library%20density%202%20with%20items%20selected.png)
*Medium density view with cover art thumbnails and multi-select*

![Library — large card view](public/screenshots/Main%20library%20density%203%20.png)
*Large card view showing full cover art for PlayStation 2*

![Library — large card view, light mode](public/screenshots/Main%20library%20density%203%20light%20mode%20.png)
*Same view in light mode*

![Game detail](public/screenshots/Library%20game%20clicked.png)
*Game detail panel with cover art, backlog tracking, file info, notes, and launch button*

### Exclusives Tracker
![Exclusives page](public/screenshots/Exclusives%20page.png)
*Browse and track must-play exclusives per console with AI-assisted list import*

### Stats
![Stats — Nintendo group](public/screenshots/Stats%20page%20grouped.png)
*Collection stats grouped by company with activity heatmap and playtime tracking*

![Stats — multi-company](public/screenshots/Stats%20page%20grouped%202.png)
*Stats across Xbox, Sega, Atari and more with per-console ROM counts*

### Emulation Guide
![Guide — company overview](public/screenshots/Guide%20main.png)
*Emulation guide landing page — browse by company*

![Guide — console detail](public/screenshots/Guide%20with%20console%20selected.png)
*Per-console guide with recommended emulators and supported formats*

### Shelf
![Shelf view](public/screenshots/Shelf%20View.png)
*3D shelf view with per-console spine art, box art, and configurable camera settings*

### Timeline
![Timeline](public/screenshots/Timeline%20main.png)
*Console release timeline with owned-game highlighting and On This Day panel*

### Settings
![Settings](public/screenshots/Settings.png)
*Settings panel with theme, display, library, emulator mapping, and data management*

---

## Features

**Library**
- Scan local directories for ROM files across any console
- Automatic format detection (ZIP, 7z, BIN, ISO, and more)
- Multi-disc ROM grouping
- Per-ROM backlog tracking: Unplayed, In Progress, Beaten, Completed
- Personal notes and custom tags per game
- Rename ROMs without touching the file
- Playlist support for curated collections
- Four density levels from compact list to large card view

**Cover Art**
- Automatic cover art lookup via the Libretro Thumbnails database
- Custom art upload or online search per game
- Lazy-loaded thumbnails with skeleton placeholders

**Exclusives Tracker**
- Import curated lists of console exclusives
- Mark owned titles and track collection gaps
- Filter and sort by genre, ownership, or alphabetically

**Hashing and Verification**
- CRC32, MD5, and SHA-1 hashing per ROM
- Extracts and hashes inner content from ZIP and 7z archives
- Hash verification via Hasheous.org database
- Batch hashing across selected ROMs

**Stats**
- Collection overview by company and generation
- Playtime and session tracking per game
- Beaten and completion rates

**Export**
- Export collection as a self-contained HTML page
- Export as Markdown tables (Reddit, GitHub, forums)
- Full JSON backup and restore

---

## Requirements

- [Node.js](https://nodejs.org/) 18 or later
- [Rust](https://rustup.rs/) (stable toolchain)
- [Tauri CLI v2](https://tauri.app/start/prerequisites/)

On Windows, Rust's MSVC toolchain and the Visual Studio C++ build tools are required. The Tauri prerequisites page covers this in detail.

---

## Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/rom-vault.git
cd rom-vault
npm install
```

Run in development mode:

```bash
npm run tauri dev
```

Build a release binary:

```bash
npm run tauri build
```

The compiled application will be in `src-tauri/target/release/`.

---

## Project Structure

```
rom-vault/
  src/                  React frontend
    components/         UI components (sidebar, rows, modals, settings)
    tabs/               Top-level tab views (Library, Exclusives, Stats, etc.)
    hooks/              State and data hooks
    data/               Static data (console list, platform logos, cover images)
  src-tauri/
    src/                Rust backend
      main.rs           Tauri commands (scanning, hashing, file ops, API calls)
  index.html
  vite.config.ts
```

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Shell     | Tauri 2                           |
| Frontend  | React 18, TypeScript, Vite        |
| Database  | SQLite via tauri-plugin-sql       |
| Styling   | Inline styles with CSS variables  |
| Hashing   | crc32fast, md-5, sha1 (Rust)      |
| Archives  | zip, sevenz-rust2 (Rust)          |
| HTTP      | reqwest with rustls (Rust)        |

---

## Data and Privacy

ROM Vault stores all data in a local SQLite database. No data is sent anywhere except for optional outbound requests you initiate:

- Cover art lookups contact the Libretro Thumbnails server and GameTDB
- Hash verification contacts Hasheous.org
- Both are opt-in actions triggered manually per game

---

## Acknowledgements

ROM Vault would not be possible without the following projects and communities.

**Cover Art**

[Libretro Thumbnails](https://github.com/libretro-thumbnails/libretro-thumbnails) -- the primary source for boxart images, served from thumbnails.libretro.com. A community-maintained archive of cover art for thousands of games across every major platform.

[GameTDB](https://www.gametdb.com) -- disc ID to canonical title database used to resolve Wii, GameCube, DS, and 3DS filenames to their correct artwork names.

**Hash Verification**

[Hasheous](https://hasheous.org) -- an open database of ROM hashes mapped to verified game entries. Used to identify and verify ROMs by their SHA-1 checksum against No-Intro, Redump, TOSEC, and MAME dat files.

**ROM Naming Standards**

[No-Intro](https://www.no-intro.org) and [Redump](http://redump.org) -- the dat file standards whose naming conventions ROM Vault follows when matching filenames to cover art and database entries.

**Platform Logos and Hardware Images**

Console logos, company logos, and hardware silhouette images used throughout the interface were sourced from the community. All trademarks and product images belong to their respective owners and are used for identification purposes only.

---

## License

MIT -- see [LICENSE](LICENSE) for the full text.

The source code is MIT licensed. Third-party assets (console logos, hardware images, cover art) are the property of their respective owners and are not covered by this license.
