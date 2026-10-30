package pl.kgfpremium.callassistant

import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class ApiException(message: String) : Exception(message)

data class RecentRide(val pickup: String, val destination: String)

data class Customer(
    val name: String?,
    val hasAccount: Boolean,
    val rideCount: Int,
    val recentRides: List<RecentRide>,
)

/** Talks to the KGF server's dispatcher endpoints, authenticated with ADMIN_API_KEY. */
class Api(private val baseUrl: String, private val key: String) {

    fun lookupCustomer(phone: String): Customer {
        val json = request("GET", "/api/admin/customer?phone=" + URLEncoder.encode(phone, "UTF-8"), null)
        val rides = json.optJSONArray("recentRides")
        val recent = (0 until (rides?.length() ?: 0)).map {
            val r = rides!!.getJSONObject(it)
            RecentRide(r.optString("pickupAddress"), r.optString("destinationAddress"))
        }
        return Customer(
            name = json.optString("name").takeIf { !json.isNull("name") && it.isNotBlank() },
            hasAccount = json.optBoolean("hasAccount"),
            rideCount = json.optInt("rideCount"),
            recentRides = recent,
        )
    }

    fun createRide(order: Order): String =
        request("POST", "/api/admin/rides", order.toJson()).optString("id")

    private fun request(method: String, path: String, body: JSONObject?): JSONObject {
        val conn = try {
            URL(baseUrl + path).openConnection() as HttpURLConnection
        } catch (e: Exception) {
            throw ApiException("Niepoprawny adres serwera")
        }
        try {
            conn.requestMethod = method
            conn.connectTimeout = 8000
            conn.readTimeout = 10000
            conn.setRequestProperty("x-admin-key", key)
            conn.setRequestProperty("Accept", "application/json")
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            val json = try {
                JSONObject(text)
            } catch (e: Exception) {
                throw ApiException("Serwer zwrócił nieoczekiwaną odpowiedź ($code). Sprawdź adres serwera")
            }
            if (code !in 200..299) {
                throw ApiException(json.optString("message").ifBlank { "Błąd serwera ($code)" })
            }
            return json
        } catch (e: IOException) {
            throw ApiException("Brak połączenia z serwerem")
        } finally {
            conn.disconnect()
        }
    }
}

private val mainHandler = Handler(Looper.getMainLooper())

/** Runs [work] on a background thread and delivers the result on the main thread. */
fun <T> background(work: () -> T, done: (Result<T>) -> Unit) {
    Thread {
        val result = runCatching(work)
        mainHandler.post { done(result) }
    }.start()
}
