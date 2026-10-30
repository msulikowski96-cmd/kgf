package pl.kgfpremium.callassistant

import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowLooper
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w393dp-h852dp-xxhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class OverlayRenderTest {

    private val ctx = RuntimeEnvironment.getApplication()
    private val shots = File("build/overlay-screens").apply { mkdirs() }

    private fun all(v: View): List<View> =
        if (v is ViewGroup) listOf(v) + (0 until v.childCount).flatMap { all(v.getChildAt(it)) } else listOf(v)

    private fun texts(root: View) = all(root).filterIsInstance<TextView>().map { it.text.toString() }

    private fun click(root: View, label: String) {
        val views = all(root).filterIsInstance<TextView>()
        val target = views.firstOrNull { it.text.toString() == label }
            ?: views.firstOrNull { it.isClickable && it.text.toString().startsWith(label) }
        assertNotNull("No button '$label' in ${texts(root)}", target)
        target!!.performClick()
        ShadowLooper.idleMainLooper()
    }

    private fun type(root: View, index: Int, value: String) {
        all(root).filterIsInstance<EditText>()[index].setText(value)
    }

    private fun shot(root: View, name: String) {
        val w = ctx.resources.displayMetrics.widthPixels
        val h = ctx.resources.displayMetrics.heightPixels
        root.measure(View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.AT_MOST))
        root.layout(0, 0, w, root.measuredHeight)
        val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(0xFF2B3A4A.toInt()) // stand-in for the phone's call screen
        canvas.translate(0f, (28 * ctx.resources.displayMetrics.density))
        root.draw(canvas)
        File(shots, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test
    fun walkThroughTheWholeScript() {
        val prefs = Prefs(ctx).apply { dispatcherName = "Marek" }
        var closed = false
        val overlay = CallOverlay(ctx, prefs, "600700800") { closed = true }
        overlay.show()
        val root = overlay.view
        assertTrue(texts(root).any { it.contains("+48 600 700 800") })
        shot(root, "01-powitanie")

        click(root, "Dalej")
        click(root, "Dalej") // empty address is rejected
        assertTrue(texts(root).contains("Wpisz adres odbioru"))
        shot(root, "02-blad")
        type(root, 0, "Rondo Kaponiera 1")
        click(root, "Dalej")
        type(root, 0, "Lotnisko Ławica")
        click(root, "Dalej")
        click(root, "Jutro")
        type(root, 0, "9:30")
        shot(root, "03-kiedy")
        click(root, "Dalej")
        click(root, "+"); click(root, "+"); click(root, "+"); click(root, "+") // 5 people -> Model X
        click(root, "Dalej")
        assertTrue(texts(root).any { it.contains("Teslę Model X") })
        shot(root, "04-samochod")
        click(root, "Dalej")
        click(root, "Gotówka")
        click(root, "Dalej")
        type(root, 0, "Jan Nowak")
        click(root, "Dalej")
        click(root, "+ Bagaż")
        click(root, "Dalej")
        assertTrue(texts(root).any { it.contains("Tesla Model X, 5 osób") && it.contains("jutro o 9:30") })
        shot(root, "05-potwierdzenie")
        // No server configured: saving copies the summary instead
        click(root, "Zapisz zamówienie")
        assertTrue(texts(root).any { it.contains("skopiowałem podsumowanie") })

        click(root, "Pytania klientów")
        // The whole FAQ tile is clickable, not just its question text
        (all(root).filterIsInstance<TextView>().first { it.text.toString() == "Ile to kosztuje?" }.parent as View)
            .performClick()
        shot(root, "06-pytania")

        click(root, "—")
        shot(root, "07-zwiniety")
        click(root, "☎ KGF")
        overlay.onCallEnded()
        assertTrue(texts(root).any { it.contains("Rozmowa zakończona") })
        click(root, "✕")
        assertTrue(closed)
    }
}
