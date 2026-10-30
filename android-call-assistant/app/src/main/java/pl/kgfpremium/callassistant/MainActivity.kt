package pl.kgfpremium.callassistant

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView

/** Settings screen: permissions, server connection, preview of the call panel. */
class MainActivity : Activity() {

    private lateinit var ui: Ui
    private lateinit var prefs: Prefs
    private lateinit var content: LinearLayout
    private var connectionStatus: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ui = Ui(this)
        prefs = Prefs(this)
        content = ui.column().apply { setPadding(ui.dp(20), ui.dp(28), ui.dp(20), ui.dp(40)) }
        setContentView(ScrollView(this).apply {
            setBackgroundColor(C.BG)
            isFillViewport = true
            addView(content)
        })
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun granted(permission: String) =
        checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

    private val phoneGranted
        get() = granted(Manifest.permission.READ_PHONE_STATE) && granted(Manifest.permission.READ_CALL_LOG)

    private val notificationsGranted
        get() = Build.VERSION.SDK_INT < 33 || granted(Manifest.permission.POST_NOTIFICATIONS)

    private fun card() = ui.column().apply {
        background = ui.rounded(C.SURFACE, 16, C.BORDER)
        setPadding(ui.dp(16), ui.dp(14), ui.dp(16), ui.dp(16))
    }

    private fun section(title: String) {
        content.addView(ui.label(title).apply { setPadding(0, ui.dp(24), 0, ui.dp(8)) })
    }

    private fun render() {
        content.removeAllViews()

        val brand = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(ui.text("KGF", 26f, bold = true).apply { letterSpacing = 0.25f })
            addView(android.view.View(this@MainActivity).apply { setBackgroundColor(C.ACCENT) },
                LinearLayout.LayoutParams(ui.dp(2), ui.dp(20)).apply { setMargins(ui.dp(12), 0, ui.dp(12), 0) })
            addView(ui.text("ASYSTENT ROZMÓW", 13f, C.MUTED, bold = true).apply { letterSpacing = 0.2f })
        }
        content.addView(brand)
        content.addView(ui.text(
            "Gdy odbierzesz połączenie, nad ekranem rozmowy pojawi się skrypt: co powiedzieć klientowi, " +
                "pola na jego odpowiedzi i gotowe odpowiedzi na częste pytania. Na końcu zapiszesz zamówienie w systemie KGF.",
            14f, C.MUTED,
        ).apply { setPadding(0, ui.dp(12), 0, 0) })

        // Status
        val ready = phoneGranted && Settings.canDrawOverlays(this)
        section("Status")
        content.addView(card().apply {
            val row = LinearLayout(this@MainActivity).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
            row.addView(ui.column().apply {
                addView(ui.text(if (prefs.enabled && ready) "Asystent działa" else "Asystent wyłączony", 17f, bold = true))
                addView(ui.text(
                    when {
                        !ready -> "Nadaj uprawnienia poniżej"
                        prefs.enabled -> "Pokaże się przy każdym odebranym połączeniu przychodzącym"
                        else -> "Włącz, aby widzieć skrypt podczas rozmów"
                    }, 13f, C.MUTED,
                ))
            }, LinearLayout.LayoutParams(0, -2, 1f))
            row.addView(Switch(this@MainActivity).apply {
                isChecked = prefs.enabled
                setOnCheckedChangeListener { _, checked -> prefs.enabled = checked; render() }
            })
            addView(row)
        })

        // Permissions
        section("Uprawnienia")
        content.addView(card().apply {
            addView(permissionRow(
                "Telefon i rejestr połączeń", "Żeby wiedzieć, że odebrałeś rozmowę i kto dzwoni", phoneGranted,
            ) {
                requestPermissions(arrayOf(Manifest.permission.READ_PHONE_STATE, Manifest.permission.READ_CALL_LOG), 1)
            })
            addView(ui.spacer(12))
            addView(permissionRow(
                "Wyświetlanie nad innymi aplikacjami", "Żeby skrypt był widoczny na ekranie rozmowy", Settings.canDrawOverlays(this@MainActivity),
            ) {
                startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            })
            if (Build.VERSION.SDK_INT >= 33) {
                addView(ui.spacer(12))
                addView(permissionRow("Powiadomienia", "Opcjonalnie: ikona asystenta podczas rozmowy", notificationsGranted) {
                    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 2)
                })
            }
        })

        // Server
        section("Połączenie z systemem KGF")
        content.addView(card().apply {
            addView(ui.text(
                "Adres serwera KGF i klucz dyspozytora (ADMIN_API_KEY). Dzięki temu asystent rozpozna klienta po numerze i zapisze zamówienie.",
                13f, C.MUTED,
            ))
            addView(ui.spacer(10))
            addView(ui.field("https://twoj-serwer.pl", prefs.serverUrl, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI) {
                prefs.serverUrl = it
            })
            addView(ui.spacer(8))
            addView(ui.field("Klucz dyspozytora", prefs.adminKey, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD) {
                prefs.adminKey = it
            })
            addView(ui.spacer(8))
            addView(ui.field("Twoje imię (do powitania, opcjonalnie)", prefs.dispatcherName, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_WORDS) {
                prefs.dispatcherName = it
            })
            addView(ui.spacer(10))
            addView(ui.button("Sprawdź połączenie", Btn.SECONDARY) { testConnection() })
            connectionStatus = ui.text("", 14f, C.MUTED).apply { setPadding(0, ui.dp(8), 0, 0) }
            addView(connectionStatus)
        })

        // Preview
        section("Wypróbuj")
        content.addView(ui.button("Pokaż podgląd skryptu", Btn.PRIMARY) {
            if (!Settings.canDrawOverlays(this)) {
                connectionStatus?.text = "Najpierw zezwól na wyświetlanie nad innymi aplikacjami"
                startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            } else {
                CallOverlayService.show(this, "+48600700800")
                moveTaskToBack(true)
            }
        })
        content.addView(ui.text(
            "Wskazówka: podczas rozmowy używaj głośnika lub słuchawek, żeby widzieć ekran. Panel możesz przesunąć, " +
                "przeciągając nagłówek, albo zwinąć przyciskiem „—”. Na telefonach Xiaomi, Huawei i Oppo zezwól też " +
                "aplikacji na autostart i działanie w tle.",
            13f, C.FAINT,
        ).apply { setPadding(0, ui.dp(12), 0, 0) })
    }

    private fun permissionRow(title: String, description: String, ok: Boolean, request: () -> Unit) =
        LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(ui.column().apply {
                addView(ui.text((if (ok) "✓ " else "• ") + title, 15f, if (ok) C.OK else C.TEXT, bold = true))
                addView(ui.text(description, 13f, C.MUTED))
            }, LinearLayout.LayoutParams(0, -2, 1f))
            if (!ok) addView(ui.button("Nadaj", Btn.PRIMARY) { request() },
                LinearLayout.LayoutParams(-2, -2).apply { marginStart = ui.dp(10) })
        }

    private fun testConnection() {
        val status = connectionStatus ?: return
        if (!prefs.serverConfigured) {
            status.setTextColor(C.WARN)
            status.text = "Wpisz adres serwera i klucz dyspozytora"
            return
        }
        status.setTextColor(C.MUTED)
        status.text = "Łączę…"
        background({ Api(prefs.serverUrl, prefs.adminKey).lookupCustomer("+48500000000") }) { result ->
            result.onSuccess {
                status.setTextColor(C.OK)
                status.text = "Połączono z serwerem ✓"
            }.onFailure {
                status.setTextColor(C.ACCENT)
                status.text = it.message ?: "Nie udało się połączyć"
            }
        }
    }

    @Deprecated("Activity API")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        render()
    }
}
