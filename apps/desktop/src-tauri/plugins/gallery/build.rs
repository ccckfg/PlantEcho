const COMMANDS: &[&str] = &["save_image", "request_permissions"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .try_build()
        .expect("failed to build gallery plugin");
}
