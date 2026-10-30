package pl.kgfpremium.callassistant

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.File
import java.time.LocalTime

class OrderTest {

    @Test
    fun phoneNumbersAreNormalisedLikeOnTheServer() {
        assertEquals("+48600700800", Phone.normalize("600 700 800"))
        assertEquals("+48600700800", Phone.normalize("0048-600-700-800"))
        assertEquals("+48 600 700 800", Phone.format("600700800"))
        assertTrue(Phone.isValid("+44 20 7946 0958"))
        assertFalse(Phone.isValid("12345"))
    }

    private fun filledOrder() = Order().apply {
        pickup = "Rondo Kaponiera"
        destination = "Lotnisko Ławica"
        passengers = 2
        vehicleId = "modelY"
        payment = "cash"
        contactName = "Ola Lis"
        contactPhone = "600 700 800"
        notes = "Duży bagaż"
    }

    @Test
    fun nowOrderHasNoScheduledTime() {
        val json = filledOrder().toJson()
        assertTrue(json.isNull("scheduledAt"))
        assertEquals("+48600700800", json.getString("contactPhone"))
        assertEquals("modelY", json.getString("vehicleModel"))
    }

    @Test
    fun scheduledOrderNeedsAValidFutureTime() {
        val order = filledOrder().apply { whenChoice = When.TOMORROW; time = "" }
        try {
            order.scheduledAt(); fail("expected error")
        } catch (e: IllegalArgumentException) {
            assertEquals("Wpisz godzinę, np. 14:30", e.message)
        }
        order.time = "25:00"
        try {
            order.scheduledAt(); fail("expected error")
        } catch (e: IllegalArgumentException) {
        }
        order.time = "8.15"
        val at = order.scheduledAt()!!
        assertTrue(at.isAfter(java.time.Instant.now()))
        assertTrue(at.toString().endsWith("Z"))
    }

    @Test
    fun todayInThePastIsRejected() {
        if (LocalTime.now().hour == 0 && LocalTime.now().minute < 1) return
        val order = filledOrder().apply { whenChoice = When.TODAY; time = "00:00" }
        try {
            order.scheduledAt(); fail("expected error")
        } catch (e: IllegalArgumentException) {
            assertEquals("Ta godzina już minęła", e.message)
        }
    }

    @Test
    fun summaryReadsBackTheOrder() {
        val s = filledOrder().summary()
        assertTrue(s, s.contains("z adresu Rondo Kaponiera"))
        assertTrue(s, s.contains("do Lotnisko Ławica"))
        assertTrue(s, s.contains("Tesla Model Y, 2 osoby"))
        assertTrue(s, s.contains("płatność: gotówka"))
    }

    @Test
    fun emptyOrderIsDetected() {
        assertTrue(Order().isEmpty)
        assertFalse(filledOrder().isEmpty)
        assertNull(Order().scheduledAt())
    }

    // Writes sample request bodies so the server contract can be checked against the real API
    @Test
    fun writeSampleRequests() {
        val dir = File("build/sample-requests").apply { mkdirs() }
        File(dir, "now.json").writeText(filledOrder().toJson().toString())
        File(dir, "tomorrow.json").writeText(
            filledOrder().apply { whenChoice = When.TOMORROW; time = "09:30"; notes = "" }.toJson().toString(),
        )
    }
}
