#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(target_os = "android")]
    let builder = builder.plugin(tauri_plugin_gallery::init());

    builder
        .setup(|_app| Ok(()))
        .invoke_handler(tauri::generate_handler![save_photo_to_gallery])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn save_photo_to_gallery(
    _app: tauri::AppHandle,
    file_name: String,
    mime_type: String,
    data_base64: String,
) -> Result<String, String> {
    let bytes = decode_base64(&data_base64)?;
    let folder = pictures_folder()?.join("PlantEcho");
    std::fs::create_dir_all(&folder).map_err(|error| error.to_string())?;
    let path = unique_path(folder.join(clean_file_name(&file_name, &mime_type)));
    std::fs::write(&path, bytes).map_err(|error| error.to_string())?;
    scan_media_file(&path);
    Ok(path.to_string_lossy().to_string())
}

fn decode_base64(value: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|error| error.to_string())
}

fn clean_file_name(file_name: &str, mime_type: &str) -> String {
    let mut cleaned = file_name
        .chars()
        .map(|char| match char {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            _ => char,
        })
        .collect::<String>();
    if cleaned.trim().is_empty() {
        cleaned = "photo".to_string();
    }
    if !cleaned.contains('.') {
        cleaned.push('.');
        cleaned.push_str(extension_for_mime(mime_type));
    }
    cleaned
}

fn extension_for_mime(mime_type: &str) -> &'static str {
    match mime_type {
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    }
}

fn pictures_folder() -> Result<std::path::PathBuf, String> {
    #[cfg(target_os = "android")]
    {
        return Ok(std::path::PathBuf::from("/sdcard/Pictures"));
    }

    #[cfg(not(target_os = "android"))]
    {
        let home = std::env::var_os("USERPROFILE")
            .or_else(|| std::env::var_os("HOME"))
            .ok_or_else(|| "找不到用户目录".to_string())?;
        Ok(std::path::PathBuf::from(home).join("Pictures"))
    }
}

fn unique_path(path: std::path::PathBuf) -> std::path::PathBuf {
    if !path.exists() {
        return path;
    }
    let parent = path
        .parent()
        .map(std::path::Path::to_path_buf)
        .unwrap_or_default();
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("photo");
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("jpg");
    for index in 1..1000 {
        let candidate = parent.join(format!("{stem}-{index}.{extension}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    path
}

fn scan_media_file(path: &std::path::Path) {
    #[cfg(target_os = "android")]
    {
        let uri = format!("file://{}", path.to_string_lossy());
        let _ = std::process::Command::new("am")
            .args([
                "broadcast",
                "-a",
                "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
                "-d",
                &uri,
            ])
            .status();
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = path;
    }
}
