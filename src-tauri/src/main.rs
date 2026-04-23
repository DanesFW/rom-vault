// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::Path;
use serde::{Deserialize, Serialize};
use tauri::{Manager, Emitter};

#[derive(Debug, Serialize, Deserialize)]
pub struct ScannedFile {
    pub filename: String,
    pub filepath: String,
    pub file_size: u64,
    pub extension: String,
}

/// Recursively scan a directory for ROM files.
/// Returns a flat list of { filename, filepath, file_size, extension }.
#[tauri::command]
async fn scan_folder(path: String) -> Result<Vec<ScannedFile>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let mut results = Vec::new();
    scan_recursive(root, &mut results).map_err(|e| e.to_string())?;
    Ok(results)
}

fn scan_recursive(dir: &Path, out: &mut Vec<ScannedFile>) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path  = entry.path();

        if path.is_dir() {
            scan_recursive(&path, out)?;
        } else if let Some(ext) = path.extension() {
            let ext_str = format!(".{}", ext.to_string_lossy().to_lowercase());

            if ext_str == ".zip" {
                // Peek inside zip for the inner ROM extension.
                // Fall back to .zip so folder-name detection can still identify the console.
                let meta = std::fs::metadata(&path)?;
                let inner_ext = peek_zip_extension(&path)
                    .unwrap_or_else(|| ".zip".to_string());
                out.push(ScannedFile {
                    filename: path.file_name().unwrap_or_default().to_string_lossy().into_owned(),
                    filepath: path.to_string_lossy().into_owned(),
                    file_size: meta.len(),
                    extension: inner_ext,
                });
            } else if ext_str == ".7z" {
                let meta = std::fs::metadata(&path)?;
                let inner_ext = peek_7z_extension(&path)
                    .unwrap_or_else(|| ".7z".to_string());
                out.push(ScannedFile {
                    filename: path.file_name().unwrap_or_default().to_string_lossy().into_owned(),
                    filepath: path.to_string_lossy().into_owned(),
                    file_size: meta.len(),
                    extension: inner_ext,
                });
            } else if is_rom_ext(&ext_str) {
                let meta = std::fs::metadata(&path)?;
                out.push(ScannedFile {
                    filename: path.file_name().unwrap_or_default().to_string_lossy().into_owned(),
                    filepath: path.to_string_lossy().into_owned(),
                    file_size: meta.len(),
                    extension: ext_str,
                });
            }
        }
    }
    Ok(())
}

/// Open a zip archive and return the extension of the first ROM file found inside.
fn peek_zip_extension(path: &Path) -> Option<String> {
    let file = std::fs::File::open(path).ok()?;
    let mut archive = zip::ZipArchive::new(file).ok()?;
    for i in 0..archive.len() {
        if let Ok(entry) = archive.by_index(i) {
            let name = entry.name().to_lowercase();
            if let Some(dot) = name.rfind('.') {
                let ext = format!(".{}", &name[dot + 1..]);
                if is_rom_ext(&ext) {
                    return Some(ext);
                }
            }
        }
    }
    None
}

/// Open a 7z archive and return the extension of the first ROM file found inside.
/// Uses sevenz_rust2::ArchiveReader which reads metadata only — no decompression.
fn peek_7z_extension(path: &Path) -> Option<String> {
    let reader = sevenz_rust2::SevenZReader::open(path, sevenz_rust2::Password::empty()).ok()?;
    let archive = reader.archive();
    for entry in &archive.files {
        let name = entry.name().to_lowercase();
        if let Some(dot) = name.rfind('.') {
            let ext = format!(".{}", &name[dot + 1..]);
            if is_rom_ext(&ext) {
                return Some(ext);
            }
        }
    }
    None
}

fn is_rom_ext(ext: &str) -> bool {
    matches!(ext,
        ".nes" | ".unf" | ".unif" |
        ".sfc" | ".smc" | ".fig" | ".swc" |
        ".z64" | ".n64" | ".v64" |
        ".gcm" | ".rvz" | ".wbfs" | ".wia" |
        ".wud" | ".wux" | ".rpx" | ".wua" |
        ".xci" | ".nsp" | ".nca" |
        ".gb"  | ".gbc" | ".gba" |
        ".nds" | ".dsi" |
        ".3ds" | ".cia" | ".cxi" |
        ".cue" | ".bin" | ".raw" | ".chd" | ".pbp" | ".ecm" |
        ".iso" | ".cso" | ".zso" |
        ".pkg" | ".rap" |
        ".xiso" | ".xbe" |
        ".md"  | ".gen" | ".smd" |
        ".gg"  |
        ".gdi" | ".cdi" |
        ".32x"
    )
}

/// Debug version of scan_folder — returns info on ALL files including skipped ones.
/// Use this to diagnose why files aren't being picked up.
#[tauri::command]
async fn debug_scan(path: String) -> Result<Vec<String>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let mut log = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&root) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                let ext = p.extension()
                    .map(|e| format!(".{}", e.to_string_lossy().to_lowercase()))
                    .unwrap_or_default();
                if ext == ".zip" {
                    let inner = peek_zip_extension(&p).unwrap_or_else(|| "NO_ROM_INSIDE".to_string());
                    log.push(format!("ZIP: {} → inner ext: {}", p.file_name().unwrap_or_default().to_string_lossy(), inner));
                } else {
                    let known = is_rom_ext(&ext);
                    log.push(format!("{}: {} (known={})", ext, p.file_name().unwrap_or_default().to_string_lossy(), known));
                }
            }
        }
    }
    if log.is_empty() {
        log.push("No files found in directory".to_string());
    }
    Ok(log)
}
/// Keeps (USA), (Europe), (Japan), (Rev X) as structured data.
#[tauri::command]
fn clean_rom_title(filename: String) -> CleanedTitle {
    use regex::Regex;

    // Strip extension(s) -- handles double extensions like .xiso.iso
    // Guard: only treat something as an extension if it's <=10 chars with no spaces.
    // This prevents "Marvel vs. Capcom 2 (USA)" from losing "Capcom 2 (USA)" because
    // of the dot in "vs." -- Rust's Path sees "Capcom 2 (USA)" as the extension.
    let mut name = filename.clone();
    loop {
        let p = std::path::Path::new(&name);
        if let Some(ext) = p.extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            // Anything with spaces or too long is title text, not a real extension
            if ext_str.len() > 10 || ext_str.contains(' ') {
                break;
            }
            // Known ROM/archive extensions -- keep stripping while we see them
            if ["iso", "xiso", "bin", "cue", "gdi", "chd", "zip", "7z",
                "nes", "sfc", "smc", "n64", "z64", "v64", "gb", "gbc", "gba",
                "nds", "3ds", "cia", "xbe", "elf", "pbp", "cso",
                "wua", "wux", "rpx", "gcz", "rvz", "nsp", "xci",
                "32x", "md", "smd", "gen", "img", "mdf", "m3u"].contains(&ext_str.as_str()) {
                name = p.file_stem().unwrap_or_default().to_string_lossy().into_owned();
            } else {
                // Unknown but plausible extension -- strip once and stop
                name = p.file_stem().unwrap_or_default().to_string_lossy().into_owned();
                break;
            }
        } else {
            break;
        }
    }

    // Extract region — grab first recognised region keyword only
    let region_re = Regex::new(r"\((USA|Europe|Japan|World|En|Fr|De|Es|It|Pt|JPN|EUR|NTSC|PAL)[^)]*\)").unwrap();
    let region = region_re.find(&name).map(|m| {
        // From "(USA, Europe)" extract just "USA" — take up to first comma or close paren
        let inner = m.as_str().trim_matches(|c| c == '(' || c == ')');
        inner.split(',').next().unwrap_or(inner).trim().to_string()
    });

    // Extract revision
    let rev_re = Regex::new(r"\((Rev\s*[A-Z0-9]+|v[\d.]+)\)").unwrap();
    let revision = rev_re.find(&name).map(|m| m.as_str().trim_matches(|c| c == '(' || c == ')').to_string());

    // Extract disc number BEFORE stripping
    let disc_re = Regex::new(r"\((Dis[ck]\s*(\d+)|CD\s*(\d+)|Side\s*([AB]))\)").unwrap();
    let disc = disc_re.captures(&name).and_then(|caps| {
        if let Some(n) = caps.get(2).or(caps.get(3)) {
            n.as_str().parse::<u32>().ok()
        } else if let Some(side) = caps.get(4) {
            Some(if side.as_str().eq_ignore_ascii_case("b") { 2 } else { 1 })
        } else {
            None
        }
    });

    // Strip all parenthetical and square bracket tags
    let junk_re = Regex::new(r"\s*[\[\(][^\]\)]*[\]\)]").unwrap();
    let title = junk_re.replace_all(&name, "").trim().to_string();

    CleanedTitle { title, region, revision, disc }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CleanedTitle {
    pub title: String,
    pub region: Option<String>,
    pub revision: Option<String>,
    pub disc: Option<u32>,
}

/// Returns the app data directory path for cover art storage

/// Deletes all cover art files for a given console (files starting with "{consoleId}__")
#[tauri::command]
fn delete_cover_art_for_console(app: tauri::AppHandle, console_id: String) -> Result<u32, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    if !covers_dir.exists() { return Ok(0); }

    let prefix = format!("{}__", console_id.replace(['<', '>', ':', '"', '/', '\\', '|', '?', '*'], "_"));
    let mut deleted = 0u32;

    let entries = std::fs::read_dir(&covers_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        if let Some(name) = entry.file_name().to_str() {
            if name.starts_with(&prefix) {
                if std::fs::remove_file(entry.path()).is_ok() {
                    deleted += 1;
                }
            }
        }
    }
    Ok(deleted)
}

#[tauri::command]
fn get_cover_art_dir(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    std::fs::create_dir_all(&covers_dir)
        .map_err(|e| e.to_string())?;
    Ok(covers_dir.to_string_lossy().into_owned())
}

/// Saves PNG data (base64-encoded) to a file in the covers directory.
/// Returns the full file path that was written.
#[tauri::command]
fn save_cover_art(app: tauri::AppHandle, filename: String, data_base64: String) -> Result<String, String> {
    let data = base64_decode(&data_base64)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    let data_dir = app.path().app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    std::fs::create_dir_all(&covers_dir)
        .map_err(|e| e.to_string())?;
    let path = covers_dir.join(&filename);
    std::fs::write(&path, data)
        .map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

/// Minimal base64 decoder (avoids adding a dependency)
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut table = [0xffu8; 256];
    for (i, &c) in CHARS.iter().enumerate() { table[c as usize] = i as u8; }

    let input = input.trim().trim_end_matches('=');
    let mut out = Vec::with_capacity(input.len() * 3 / 4);
    let bytes = input.as_bytes();
    let mut i = 0;
    while i + 3 < bytes.len() {
        let (a, b, c, d) = (
            table[bytes[i] as usize],
            table[bytes[i+1] as usize],
            table[bytes[i+2] as usize],
            table[bytes[i+3] as usize],
        );
        if a == 0xff || b == 0xff { return Err("invalid base64".into()); }
        out.push((a << 2) | (b >> 4));
        if c != 0xff { out.push((b << 4) | (c >> 2)); }
        if d != 0xff { out.push((c << 6) | d); }
        i += 4;
    }
    Ok(out)
}

/// Reads a cover art file from disk and returns it as a base64 string.
#[tauri::command]
fn load_cover_art(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    // Encode to base64
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        out.push(CHARS[b0 >> 2] as char);
        out.push(CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char);
        if chunk.len() > 1 { out.push(CHARS[((b1 & 15) << 2) | (b2 >> 6)] as char); } else { out.push('='); }
        if chunk.len() > 2 { out.push(CHARS[b2 & 63] as char); } else { out.push('='); }
    }
    Ok(out)
}

/// Reveals a specific file in the system file explorer (selected).
#[tauri::command]
fn reveal_cover_art(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        // Best-effort: open containing folder
        if let Some(parent) = std::path::Path::new(&path).parent() {
            std::process::Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}


#[tauri::command]
fn open_cover_art_dir(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    std::fs::create_dir_all(&covers_dir)
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(covers_dir.to_string_lossy().as_ref())
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(covers_dir.to_string_lossy().as_ref())
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(covers_dir.to_string_lossy().as_ref())
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Returns total count and size in bytes of all cached cover art files.
#[tauri::command]
fn get_cover_art_stats(app: tauri::AppHandle) -> Result<(u64, u64), String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    if !covers_dir.exists() { return Ok((0, 0)); }
    let mut count = 0u64;
    let mut total_bytes = 0u64;
    if let Ok(entries) = std::fs::read_dir(&covers_dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    count += 1;
                    total_bytes += meta.len();
                }
            }
        }
    }
    Ok((count, total_bytes))
}

/// Copies all cover art files to a user-chosen backup directory.

/// Returns per-console art counts by parsing filenames on disk.
/// Files are named {consoleId}__{title}__{artType}.png
#[tauri::command]
fn get_cover_art_stats_by_console(app: tauri::AppHandle) -> Result<Vec<(String, u64)>, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    if !covers_dir.exists() { return Ok(vec![]); }

    let mut counts: std::collections::HashMap<String, u64> = std::collections::HashMap::new();

    if let Ok(entries) = std::fs::read_dir(&covers_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                // Extract console_id — everything before the first "__"
                if let Some(idx) = name.find("__") {
                    let console_id = &name[..idx];
                    if !console_id.is_empty() {
                        *counts.entry(console_id.to_string()).or_insert(0) += 1;
                    }
                }
            }
        }
    }

    let mut result: Vec<(String, u64)> = counts.into_iter().collect();
    result.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(result)
}


/// Deletes ALL cover art files from the covers directory.
#[tauri::command]
fn delete_all_cover_art(app: tauri::AppHandle) -> Result<u32, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    if !covers_dir.exists() { return Ok(0); }
    let mut deleted = 0u32;
    if let Ok(entries) = std::fs::read_dir(&covers_dir) {
        for entry in entries.flatten() {
            if entry.path().is_file() {
                if std::fs::remove_file(entry.path()).is_ok() {
                    deleted += 1;
                }
            }
        }
    }
    Ok(deleted)
}


/// Downloads and parses a GameTDB XML database (wiitdb.zip etc.)
/// Returns a list of (game_id, english_title) pairs.
/// The ZIP contains a single XML file with entries like:
///   <game id="SMNE01"><locale lang="EN"><title>New Super Mario Bros. Wii</title></locale></game>

/// Proxy for SteamGridDB API calls — routes through Rust/reqwest to avoid
/// Tauri webview network restrictions on direct fetch() calls.
#[tauri::command]
async fn sgdb_get(url: String, api_key: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| e.to_string())?;

    if status == 200 {
        Ok(body)
    } else {
        Err(format!("HTTP {}: {}", status, body))
    }
}

#[tauri::command]
async fn download_game_db(url: String) -> Result<Vec<(String, String)>, String> {
    // Download ZIP bytes
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    // Extract XML from ZIP
    let cursor = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| e.to_string())?;

    // Find the first .xml file in the archive
    let xml_content = (0..archive.len())
        .find_map(|i| {
            let mut file = archive.by_index(i).ok()?;
            if file.name().ends_with(".xml") {
                let mut content = String::new();
                use std::io::Read;
                file.read_to_string(&mut content).ok()?;
                Some(content)
            } else {
                None
            }
        })
        .ok_or_else(|| "No XML file found in archive".to_string())?;

    // Parse game entries — simple line-by-line approach, no XML crate needed
    // We look for lines containing game id="..." and <title>...</title>
    let mut results: Vec<(String, String)> = Vec::new();
    let mut current_id: Option<String> = None;
    let mut in_english = false;

    let quote = '"';
    // WiiTDB XML has two formats:
    //   Format A (attribute): <game id="SMNE01"> ... </game>
    //   Format B (child):     <game name="..."> <id>SMNE01</id> ... </game>
    // We handle both by checking for <id> child elements too.

    for line in xml_content.lines() {
        let trimmed = line.trim();

        // Format A: <game id="SMNE01"> — id as attribute
        if trimmed.contains("<game ") && trimmed.contains("id=") {
            if let Some(id_part) = trimmed.split("id=").nth(1) {
                let id_val: String = id_part.chars()
                    .skip(1)
                    .take_while(|c| *c != quote)
                    .collect();
                if !id_val.is_empty() && !id_val.contains(' ') {
                    current_id = Some(id_val);
                }
            }
            in_english = false;
        } else if trimmed.starts_with("<game ") || trimmed == "<game>" {
            // Format B opening tag — id will come as child element
            current_id = None;
            in_english = false;
        }

        // Format B: <id>SMNE01</id> — id as child element
        if current_id.is_none() && trimmed.starts_with("<id>") && trimmed.contains("</id>") {
            if let (Some(s), Some(e)) = (trimmed.find("<id>"), trimmed.find("</id>")) {
                let id_val = trimmed[s + 4..e].trim().to_string();
                // Game IDs are 4-6 alphanumeric chars
                if id_val.len() >= 4 && id_val.len() <= 8
                    && id_val.chars().all(|c| c.is_ascii_alphanumeric())
                {
                    current_id = Some(id_val);
                }
            }
        }

        // <locale lang="EN">
        if trimmed.contains("<locale ") && trimmed.contains("lang=") {
            let lang_val: String = trimmed.split("lang=")
                .nth(1)
                .unwrap_or("")
                .chars()
                .skip(1)
                .take_while(|c| *c != quote)
                .collect();
            if lang_val == "EN" {
                in_english = true;
            }
        }

        // </locale>
        if trimmed == "</locale>" {
            in_english = false;
        }

        // <title>...</title>
        if in_english && trimmed.contains("<title>") {
            if let (Some(start), Some(end)) = (trimmed.find("<title>"), trimmed.find("</title>")) {
                let title = &trimmed[start + 7..end];
                if let Some(id) = &current_id {
                    if !title.is_empty() {
                        results.push((id.clone(), title.to_string()));
                    }
                }
                in_english = false;
            }
        }

        // </game>
        if trimmed == "</game>" {
            current_id = None;
            in_english = false;
        }
    }
    Ok(results)
}

#[tauri::command]
fn backup_cover_art(app: tauri::AppHandle, dest_dir: String) -> Result<u64, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    if !covers_dir.exists() { return Ok(0); }
    let dest = Path::new(&dest_dir);
    std::fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    let mut copied = 0u64;
    if let Ok(entries) = std::fs::read_dir(&covers_dir) {
        for entry in entries.flatten() {
            let src = entry.path();
            if src.is_file() {
                let name = src.file_name().unwrap_or_default();
                std::fs::copy(&src, dest.join(name)).map_err(|e| e.to_string())?;
                copied += 1;
            }
        }
    }
    Ok(copied)
}

/// Fetches cover art from a URL and saves it to the covers directory.
/// Returns the saved file path, or an error string.
/// Runs entirely in Rust — no CORS restrictions.
#[tauri::command]
async fn fetch_and_save_cover_art(
    app: tauri::AppHandle,
    url: String,
    filename: String,
) -> Result<String, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    std::fs::create_dir_all(&covers_dir).map_err(|e| e.to_string())?;
    let path = covers_dir.join(&filename);

    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

/// Copies a user-chosen image file into the covers directory with the given filename.
/// Accepts PNG or JPG. Returns the saved path.
#[tauri::command]
fn import_custom_cover_art(
    app: tauri::AppHandle,
    source_path: String,
    filename: String,
) -> Result<String, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;
    let covers_dir = data_dir.join("covers");
    std::fs::create_dir_all(&covers_dir).map_err(|e| e.to_string())?;
    let dest = covers_dir.join(&filename);
    std::fs::copy(&source_path, &dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().into_owned())
}

/// Fetches a URL and returns the raw response text.
/// Used for fetching HTML directory listings and parsing them in TypeScript.
#[tauri::command]
async fn fetch_thumbnail_index(url: String) -> Result<String, String> {
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }
    Ok(response.text().await.map_err(|e| e.to_string())?)
}

/// Payload emitted to the frontend when a launched emulator process exits.
#[derive(Clone, Serialize)]
struct SessionEndedPayload {
    session_id: i64,
    duration_seconds: u64,
}

/// Launch a ROM in an emulator.
///
/// `exe_path`    — absolute path to the emulator executable
/// `args`        — launch argument template; `{rom}` → `rom_path`, `{core}` → `core_path`
/// `rom_path`    — absolute path to the ROM file
/// `core_path`   — optional RetroArch core path
/// `session_id`  — DB session row ID; when the process exits, a `session-ended` event
///                 is emitted to the frontend with the elapsed duration in seconds.
#[tauri::command]
async fn launch_rom(
    app: tauri::AppHandle,
    exe_path: String,
    args: String,
    rom_path: String,
    core_path: Option<String>,
    session_id: i64,
) -> Result<(), String> {
    let resolved = args
        .replace("{rom}", &rom_path)
        .replace("{core}", core_path.as_deref().unwrap_or(""));

    let argv = shell_words(&resolved);

    // Set working directory to the emulator's own folder so it can find
    // its config, shaders, and user data regardless of where Rom Vault lives.
    let exe_dir = std::path::Path::new(&exe_path)
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let child = std::process::Command::new(&exe_path)
        .args(&argv)
        .current_dir(&exe_dir)
        .spawn()
        .map_err(|e| format!("Failed to launch emulator: {e}"))?;

    let start = std::time::Instant::now();

    // Watch the process in a background OS thread; emit when it exits.
    std::thread::spawn(move || {
        let mut c = child;
        let _ = c.wait();
        let duration_seconds = start.elapsed().as_secs();
        let _ = app.emit("session-ended", SessionEndedPayload { session_id, duration_seconds });
    });

    Ok(())
}

/// Very small shell-word splitter — handles double-quoted tokens with spaces.
/// Good enough for emulator arg strings; not a full POSIX parser.
fn shell_words(s: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    for ch in s.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            ' ' | '\t' if !in_quotes => {
                if !current.is_empty() {
                    words.push(current.clone());
                    current.clear();
                }
            }
            _ => current.push(ch),
        }
    }
    if !current.is_empty() {
        words.push(current);
    }
    words
}

#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HasheousMatch {
    pub title:    String,
    pub platform: String,
    pub region:   String,
    pub source:   String,
}

/// Temporary debug command — tries several Hasheous URL patterns and reports results.
#[tauri::command]
async fn hasheous_raw(sha1: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let candidates = vec![
        format!("https://hasheous.org/api/v1/Lookup/ByHash/sha1/{}", sha1),
        format!("https://hasheous.org/api/v1/Lookup/SHA1?SHA1Hash={}", sha1),
        format!("https://hasheous.org/api/v1/Lookup/SHA1/{}", sha1),
        format!("https://hasheous.org/api/v1/Lookup/byhash/sha1/{}", sha1),
        format!("https://hasheous.org/api/v1/HashLookup/{}", sha1),
    ];

    let mut out = String::new();
    for url in &candidates {
        match client.get(url)
            .header("Accept", "application/json")
            .header("User-Agent", "RomVault/1.0")
            .send().await
        {
            Err(e) => out.push_str(&format!("{url}\n  ERROR: {e}\n\n")),
            Ok(resp) => {
                let status = resp.status().as_u16();
                let body = resp.text().await.unwrap_or_default();
                out.push_str(&format!("{url}\n  HTTP {status}: {}\n\n",
                    if body.len() > 300 { &body[..300] } else { &body }));
            }
        }
    }
    Ok(out)
}

#[tauri::command]
async fn hasheous_lookup(sha1: String) -> Result<Option<HasheousMatch>, String> {
    // Correct endpoint: ByHash/sha1/{sha1}
    let url = format!(
        "https://hasheous.org/api/v1/Lookup/ByHash/sha1/{}",
        sha1
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&url)
        .header("Accept", "application/json")
        .header("User-Agent", "RomVault/1.0")
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }

    if !resp.status().is_success() {
        return Err(format!("Hasheous returned HTTP {}", resp.status()));
    }

    let body: serde_json::Value = resp.json::<serde_json::Value>().await
        .map_err(|e| format!("Parse error: {e}"))?;

    // Response is a single object: { "name": "...", "platform": { "name": "..." }, ... }
    let title = body.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let platform = body.get("platform")
        .and_then(|p| p.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Region may appear in the signatures array
    let region = body.get("signatures")
        .and_then(|s| s.as_array())
        .and_then(|arr| arr.first())
        .and_then(|sig| sig.get("region").and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();

    // Source comes from the signature source name
    let source = body.get("signatures")
        .and_then(|s| s.as_array())
        .and_then(|arr| arr.first())
        .and_then(|sig| {
            sig.get("signatureSource")
                .or_else(|| sig.get("source"))
                .and_then(|v| v.get("name").or(Some(v)))
                .and_then(|v| v.as_str())
        })
        .unwrap_or("")
        .to_string();

    if title.is_empty() {
        return Ok(None);
    }

    Ok(Some(HasheousMatch { title, platform, region, source }))
}

#[derive(Serialize)]
struct RomHashes {
    crc32: String,
    md5:   String,
    sha1:  String,
}

#[tauri::command]
async fn hash_rom(path: String) -> Result<RomHashes, String> {
    use std::io::{BufReader, Cursor, Read};
    use digest::Digest;
    use md5::Md5;
    use sha1::Sha1;

    fn hash_reader<R: Read>(mut reader: R) -> Result<RomHashes, String> {
        let mut crc  = crc32fast::Hasher::new();
        let mut md5  = Md5::new();
        let mut sha1 = Sha1::new();
        let mut buf = vec![0u8; 1024 * 1024];
        loop {
            let n = reader.read(&mut buf).map_err(|e| format!("Read error: {e}"))?;
            if n == 0 { break; }
            crc.update(&buf[..n]);
            md5.update(&buf[..n]);
            sha1.update(&buf[..n]);
        }
        Ok(RomHashes {
            crc32: format!("{:08X}", crc.finalize()),
            md5:   format!("{:x}", md5.finalize()),
            sha1:  format!("{:x}", sha1.finalize()),
        })
    }

    let lower = path.to_lowercase();

    if lower.ends_with(".zip") {
        // Hash the first ROM file inside the ZIP, not the ZIP itself
        let file = std::fs::File::open(&path)
            .map_err(|e| format!("Cannot open ZIP: {e}"))?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|e| format!("Invalid ZIP: {e}"))?;

        // Find the largest file (most likely the ROM)
        let best_idx = (0..archive.len())
            .filter_map(|i| archive.by_index(i).ok().map(|f| (i, f.size())))
            .max_by_key(|(_, size)| *size)
            .map(|(i, _)| i)
            .ok_or_else(|| "ZIP is empty".to_string())?;

        let mut entry = archive.by_index(best_idx)
            .map_err(|e| format!("ZIP read error: {e}"))?;
        let mut data = Vec::with_capacity(entry.size() as usize);
        entry.read_to_end(&mut data).map_err(|e| format!("ZIP extract error: {e}"))?;
        return hash_reader(Cursor::new(data));
    }

    if lower.ends_with(".7z") {
        // Extract the largest entry from the 7z archive and hash its bytes
        let file = std::fs::File::open(&path)
            .map_err(|e| format!("Cannot open 7z: {e}"))?;

        // First pass: find the largest entry by size
        let reader = sevenz_rust2::SevenZReader::open(&path, sevenz_rust2::Password::empty())
            .map_err(|e| format!("7z open error: {e}"))?;
        let archive = reader.archive();
        let best_name = archive.files.iter()
            .filter(|f| !f.is_directory())
            .max_by_key(|f| f.size())
            .map(|f| f.name().to_string());
        let target_name = best_name.ok_or_else(|| "7z is empty".to_string())?;

        // Second pass: extract that entry's bytes
        let mut extracted: Vec<u8> = Vec::new();
        let target_clone = target_name.clone();
        sevenz_rust2::decompress_with_extract_fn(
            file,
            std::path::Path::new("."),
            |entry, reader, _dest| {
                if entry.name() == target_clone {
                    reader.read_to_end(&mut extracted)?;
                }
                Ok(false) // don't write to disk
            },
        ).map_err(|e| format!("7z extract error: {e}"))?;

        if extracted.is_empty() {
            return Err(format!("Could not extract {} from 7z", target_name));
        }
        return hash_reader(Cursor::new(extracted));
    }

    // Plain file
    let file = std::fs::File::open(&path)
        .map_err(|e| format!("Cannot open file: {e}"))?;
    hash_reader(BufReader::new(file))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:romvault.db", vec![
                tauri_plugin_sql::Migration {
                    version: 1,
                    description: "initial schema",
                    sql: include_str!("../migrations/001_init.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 2,
                    description: "publisher and list tracking",
                    sql: include_str!("../migrations/002_publisher_list.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 3,
                    description: "multi-disc support",
                    sql: include_str!("../migrations/003_discs.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 4,
                    description: "game title lookup",
                    sql: include_str!("../migrations/004_game_title_lookup.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 5,
                    description: "tags and smart lists",
                    sql: include_str!("../migrations/005_tags.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 6,
                    description: "playlists",
                    sql: include_str!("../migrations/006_playlists.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 7,
                    description: "emulators",
                    sql: include_str!("../migrations/007_emulators.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 8,
                    description: "play_tracking",
                    sql: include_str!("../migrations/008_play_tracking.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 9,
                    description: "play_sessions",
                    sql: include_str!("../migrations/009_play_sessions.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 10,
                    description: "rom_hashes",
                    sql: include_str!("../migrations/010_rom_hashes.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 11,
                    description: "hasheous",
                    sql: include_str!("../migrations/011_hasheous.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
            ])
            .build()
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            launch_rom,
            scan_folder,
            clean_rom_title,
            debug_scan,
            get_cover_art_dir,
            delete_cover_art_for_console,
            save_cover_art,
            load_cover_art,
            open_cover_art_dir,
            reveal_cover_art,
            get_cover_art_stats,
            get_cover_art_stats_by_console,
            delete_all_cover_art,
            download_game_db,
            sgdb_get,
            backup_cover_art,
            fetch_and_save_cover_art,
            import_custom_cover_art,
            fetch_thumbnail_index,
            hash_rom,
            open_url,
            hasheous_lookup,
            hasheous_raw,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ROM Vault");
}
