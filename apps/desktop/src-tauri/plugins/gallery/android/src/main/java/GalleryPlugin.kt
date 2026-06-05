package app.dyn.gallery

import android.Manifest
import android.app.Activity
import android.content.ContentValues
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import app.tauri.PermissionState
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

private const val LEGACY_STORAGE_PERMISSION = "legacyStorage"

@InvokeArg
class SaveImageArgs {
    lateinit var fileName: String
    lateinit var mimeType: String
    lateinit var dataBase64: String
}

@TauriPlugin(
    permissions = [
        Permission(
            strings = [Manifest.permission.WRITE_EXTERNAL_STORAGE],
            alias = LEGACY_STORAGE_PERMISSION
        )
    ]
)
class GalleryPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    override fun requestPermissions(invoke: Invoke) {
        if (
            Build.VERSION.SDK_INT > Build.VERSION_CODES.P ||
            getPermissionState(LEGACY_STORAGE_PERMISSION) == PermissionState.GRANTED
        ) {
            invoke.resolve()
            return
        }
        requestPermissionForAlias(
            LEGACY_STORAGE_PERMISSION,
            invoke,
            "legacyStoragePermissionCallback"
        )
    }

    @PermissionCallback
    fun legacyStoragePermissionCallback(invoke: Invoke) {
        if (getPermissionState(LEGACY_STORAGE_PERMISSION) == PermissionState.GRANTED) {
            invoke.resolve()
        } else {
            invoke.reject("没有相册写入权限")
        }
    }

    @Command
    fun saveImage(invoke: Invoke) {
        try {
            if (
                Build.VERSION.SDK_INT <= Build.VERSION_CODES.P &&
                getPermissionState(LEGACY_STORAGE_PERMISSION) != PermissionState.GRANTED
            ) {
                invoke.reject("请先允许 PlantEcho 写入相册")
                return
            }

            val args = invoke.parseArgs(SaveImageArgs::class.java)
            val bytes = Base64.decode(args.dataBase64, Base64.DEFAULT)
            val displayName = cleanFileName(args.fileName)
            val uri = saveWithMediaStore(displayName, args.mimeType, bytes)
            val result = JSObject()
            result.put("uri", uri.toString())
            result.put("displayName", displayName)
            invoke.resolve(result)
        } catch (error: Exception) {
            invoke.reject(error.message ?: "保存到相册失败")
        }
    }

    private fun saveWithMediaStore(
        displayName: String,
        mimeType: String,
        bytes: ByteArray
    ): android.net.Uri {
        val resolver = activity.contentResolver
        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        } else {
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        }
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, displayName)
            put(MediaStore.Images.Media.MIME_TYPE, mimeType)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/PlantEcho")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        }
        val uri = resolver.insert(collection, values)
            ?: throw IllegalStateException("系统没有创建相册文件")

        try {
            resolver.openOutputStream(uri, "w")?.use { output ->
                output.write(bytes)
            } ?: throw IllegalStateException("系统没有打开相册文件")

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.Images.Media.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            }
            return uri
        } catch (error: Exception) {
            resolver.delete(uri, null, null)
            throw error
        }
    }

    private fun cleanFileName(value: String): String {
        val cleaned = value.replace(Regex("""[\\/:*?"<>|]"""), "-").trim()
        return cleaned.ifEmpty { "PlantEcho-photo.jpg" }
    }
}
