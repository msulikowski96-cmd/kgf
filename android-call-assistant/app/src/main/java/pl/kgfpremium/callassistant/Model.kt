package pl.kgfpremium.callassistant

import android.content.Context
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

// ---------- Settings ----------

class Prefs(context: Context) {
    private val p = context.getSharedPreferences("kgf_call_assistant", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = p.getBoolean("enabled", true)
        set(v) = p.edit().putBoolean("enabled", v).apply()

    var serverUrl: String
        get() = p.getString("server_url", "") ?: ""
        set(v) = p.edit().putString("server_url", v.trim().trimEnd('/')).apply()

    var adminKey: String
        get() = p.getString("admin_key", "") ?: ""
        set(v) = p.edit().putString("admin_key", v.trim()).apply()

    var dispatcherName: String
        get() = p.getString("dispatcher_name", "") ?: ""
        set(v) = p.edit().putString("dispatcher_name", v.trim()).apply()

    val serverConfigured: Boolean
        get() = serverUrl.isNotBlank() && adminKey.isNotBlank()
}

// ---------- Phone numbers (same rules as shared/phone.ts on the server) ----------

object Phone {
    fun normalize(input: String): String {
        var phone = input.trim().replace(Regex("[\\s\\-().]"), "")
        if (phone.startsWith("00")) phone = "+" + phone.substring(2)
        if (Regex("^\\d{9}$").matches(phone)) phone = "+48$phone"
        return phone
    }

    fun isValid(input: String) = Regex("^\\+[1-9]\\d{7,14}$").matches(normalize(input))

    fun format(input: String): String {
        val phone = normalize(input)
        val m = Regex("^\\+48(\\d{3})(\\d{3})(\\d{3})$").find(phone) ?: return phone
        return "+48 ${m.groupValues[1]} ${m.groupValues[2]} ${m.groupValues[3]}"
    }
}

// ---------- Fleet (keep in sync with shared/fleet.ts) ----------

data class Vehicle(
    val id: String,
    val name: String,
    val description: String,
    val seats: Int,
    val baseFare: Int,
    val perKm: Double,
    val minimumFare: Int,
)

object Fleet {
    val vehicles = listOf(
        Vehicle("model3", "Model 3", "elegancki sedan, idealny do miasta", 4, 15, 4.5, 40),
        Vehicle("modelY", "Model Y", "więcej miejsca na bagaż, dobry na lotnisko", 4, 18, 5.0, 50),
        Vehicle("modelS", "Model S", "flagowa limuzyna dla biznesu", 4, 25, 7.0, 80),
        Vehicle("modelX", "Model X", "dla maksymalnie 6 osób, drzwi Falcon Wing", 6, 30, 8.0, 100),
    )

    fun get(id: String) = vehicles.first { it.id == id }

    fun price(value: Double): String =
        if (value % 1.0 == 0.0) "${value.toInt()} zł" else String.format(java.util.Locale.ROOT, "%.2f zł", value).replace('.', ',')

    fun priceLine(v: Vehicle) =
        "opłata startowa ${v.baseFare} zł plus ${price(v.perKm)} za kilometr, minimum ${v.minimumFare} zł"

    val payments = linkedMapOf("card" to "Karta u kierowcy", "cash" to "Gotówka")
}

// ---------- Order being taken during the call ----------

enum class When(val label: String) { NOW("Teraz"), TODAY("Dziś"), TOMORROW("Jutro") }

class Order {
    var pickup = ""
    var destination = ""
    var whenChoice = When.NOW
    var time = ""
    var passengers = 1
    var vehicleId = "model3"
    var vehicleChosen = false
    var payment = "card"
    var contactName = ""
    var contactPhone = ""
    var notes = ""

    val vehicle get() = Fleet.get(vehicleId)

    val isEmpty get() = pickup.isBlank() && destination.isBlank() && notes.isBlank()

    // Parses "14:30", "14.30" or "14"
    private fun parseTime(): LocalTime? {
        val m = Regex("^(\\d{1,2})(?:[:.](\\d{2}))?$").find(time.trim()) ?: return null
        val h = m.groupValues[1].toInt()
        val min = m.groupValues[2].ifEmpty { "0" }.toInt()
        if (h > 23 || min > 59) return null
        return LocalTime.of(h, min)
    }

    /** Pickup time, or null for "as soon as possible". Throws with a Polish message when invalid. */
    fun scheduledAt(): Instant? {
        if (whenChoice == When.NOW) return null
        val t = parseTime() ?: throw IllegalArgumentException("Wpisz godzinę, np. 14:30")
        val day = if (whenChoice == When.TODAY) LocalDate.now() else LocalDate.now().plusDays(1)
        val instant = day.atTime(t).atZone(ZoneId.systemDefault()).toInstant()
        if (instant.isBefore(Instant.now())) throw IllegalArgumentException("Ta godzina już minęła")
        return instant
    }

    fun whenText(): String = when (whenChoice) {
        When.NOW -> "jak najszybciej"
        When.TODAY -> "dziś o ${time.trim()}"
        When.TOMORROW -> "jutro o ${time.trim()}"
    }

    fun summary(): String {
        val people = when {
            passengers == 1 -> "1 osoba"
            passengers < 5 -> "$passengers osoby"
            else -> "$passengers osób"
        }
        val extra = if (notes.isNotBlank()) " Uwagi: ${notes.trim()}." else ""
        return "Potwierdzam: odbiór ${whenText()} z adresu ${pickup.trim()}, jedziemy do ${destination.trim()}. " +
            "Tesla ${vehicle.name}, $people, płatność: ${Fleet.payments[payment]?.lowercase()}.$extra " +
            "Kierowca zadzwoni przed przyjazdem."
    }

    fun toJson(): JSONObject = JSONObject().apply {
        put("pickupAddress", pickup.trim())
        put("destinationAddress", destination.trim())
        put("scheduledAt", scheduledAt()?.toString() ?: JSONObject.NULL)
        put("vehicleModel", vehicleId)
        put("passengers", passengers)
        put("contactName", contactName.trim())
        put("contactPhone", Phone.normalize(contactPhone))
        if (notes.isNotBlank()) put("notes", notes.trim())
        put("paymentMethod", payment)
    }
}

// ---------- Answers to common customer questions ----------

object Faq {
    fun items(order: Order): List<Pair<String, String>> {
        val v = order.vehicle
        return listOf(
            "Ile to kosztuje?" to
                "Cena zależy od trasy. Tesla ${v.name}: ${Fleet.priceLine(v)}. Dokładną cenę potwierdzimy przy potwierdzeniu przejazdu.",
            "Jakie macie samochody?" to
                "Jeździmy wyłącznie Teslami: Model 3, Model Y, Model S i Model X dla 6 osób.",
            "Jak długo trzeba czekać?" to
                "Zwykle kilkanaście minut na terenie Poznania. Kierowca zadzwoni, gdy będzie w drodze.",
            "Czy mogę zapłacić kartą?" to
                "Tak, kartą u kierowcy albo gotówką.",
            "Czy jeździcie na lotnisko?" to
                "Tak, na Ławicę i dalej. Na lotnisko polecam Model Y – ma największy bagażnik.",
            "Czy można zamówić na później?" to
                "Tak, przejazd można zaplanować nawet 30 dni naprzód.",
            "Czy macie fotelik dla dziecka?" to
                "Proszę powiedzieć, ile lat ma dziecko – zapiszę to w uwagach i potwierdzimy dostępność.",
            "Chcę odwołać przejazd" to
                "Oczywiście. Proszę podać godzinę i adres odbioru – odwołam zamówienie.",
            "Jak zamówić następnym razem?" to
                "Przez naszą aplikację KGF Premium albo pod tym numerem, 24 godziny na dobę.",
        )
    }
}
