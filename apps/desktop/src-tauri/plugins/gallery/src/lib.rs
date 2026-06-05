#![cfg(target_os = "android")]

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

const PLUGIN_IDENTIFIER: &str = "app.dyn.gallery";

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("gallery")
        .setup(|_app, api| {
            api.register_android_plugin(PLUGIN_IDENTIFIER, "GalleryPlugin")?;
            Ok(())
        })
        .build()
}
