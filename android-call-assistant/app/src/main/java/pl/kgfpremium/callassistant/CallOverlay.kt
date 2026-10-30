package pl.kgfpremium.callassistant

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.PixelFormat
import android.text.InputType
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView

/**
 * The panel shown on top of the call screen: a step-by-step script of what to say,
 * fields for the customer's answers, answers to common questions, and saving the order.
 */
class CallOverlay(
    private val ctx: Context,
    private val prefs: Prefs,
    number: String?,
    private val onClose: () -> Unit,
) {
    private enum class Tab { SCRIPT, FAQ }

    private class Step(
        val title: String,
        val say: () -> String,
        val hint: String? = null,
        val content: (LinearLayout) -> Unit = {},
        val validate: () -> String? = { null },
    )

    private val ui = Ui(ctx)
    private val wm = ctx.getSystemService(WindowManager::class.java)

    private var callerNumber: String? = number?.takeIf { it.isNotBlank() }?.let(Phone::normalize)
    private var customer: Customer? = null
    private var lookupState: String? = null
    private var order = Order()
    private var stepIndex = 0
    private var tab = Tab.SCRIPT
    private var minimized = false
    private var callActive = true
    private var saving = false
    private var saved = false
    private var message: Pair<String, Int>? = null

    private val root = FrameLayout(ctx)

    /** The panel's view, for tests. */
    internal val view: View get() = root
    private val header = ui.column()
    private val body = ui.column()
    private val steps = buildSteps()

    private val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
        PixelFormat.TRANSLUCENT,
    ).apply {
        gravity = Gravity.TOP
        y = ui.dp(28)
        softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
    }

    init {
        resetContact()
    }

    // ---------- Lifecycle ----------

    fun show() {
        render()
        wm.addView(root, params)
        lookupCaller()
    }

    fun remove() {
        try {
            wm.removeView(root)
        } catch (_: Exception) {
        }
    }

    fun onNewCall(number: String?) {
        callActive = true
        // Keep an order that is being taken; start fresh otherwise
        if (saved || order.isEmpty) {
            callerNumber = number?.takeIf { it.isNotBlank() }?.let(Phone::normalize)
            customer = null
            order = Order()
            resetContact()
            stepIndex = 0
            saved = false
            message = null
            lookupCaller()
        }
        minimized = false
        render()
    }

    fun onNumber(number: String) {
        if (callerNumber != null) return
        callerNumber = Phone.normalize(number)
        resetContact()
        lookupCaller()
        render()
    }

    fun onCallEnded() {
        callActive = false
        render()
    }

    private fun close() {
        remove()
        onClose()
    }

    private fun resetContact() {
        order.contactPhone = callerNumber?.let(Phone::format) ?: ""
        order.contactName = customer?.name ?: ""
    }

    private fun lookupCaller() {
        val phone = callerNumber ?: return
        if (!prefs.serverConfigured || !Phone.isValid(phone)) return
        lookupState = "Sprawdzam numer…"
        background({ Api(prefs.serverUrl, prefs.adminKey).lookupCustomer(phone) }) { result ->
            result.onSuccess {
                customer = it
                lookupState = null
                if (order.contactName.isBlank()) order.contactName = it.name ?: ""
            }.onFailure {
                lookupState = "Nie udało się sprawdzić numeru: ${it.message}"
            }
            renderHeader()
            if (stepIndex == 0) renderBody()
        }
    }

    // ---------- Rendering ----------

    @SuppressLint("ClickableViewAccessibility")
    private fun render() {
        root.removeAllViews()
        if (minimized) {
            root.addView(minimizedView())
            setFocusable(false)
        } else {
            val card = ui.column().apply {
                background = ui.rounded(C.SURFACE, 18, C.BORDER_STRONG)
                setPadding(ui.dp(14), ui.dp(12), ui.dp(14), ui.dp(14))
                elevation = ui.dp(12).toFloat()
            }
            // header and body are reused, so detach them from the previous card first
            (header.parent as? ViewGroup)?.removeView(header)
            (body.parent as? ViewGroup)?.removeView(body)
            card.addView(header)
            val scroll = MaxHeightScrollView(ctx, (ctx.resources.displayMetrics.heightPixels * 0.62).toInt())
            scroll.addView(body)
            card.addView(scroll)
            root.addView(card, FrameLayout.LayoutParams(-1, -2).apply {
                setMargins(ui.dp(8), 0, ui.dp(8), 0)
            })
            renderHeader()
            renderBody()
            setFocusable(true)
        }
        if (root.isAttachedToWindow) wm.updateViewLayout(root, params)
    }

    private fun setFocusable(focusable: Boolean) {
        params.flags = if (focusable) {
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
        } else {
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun makeDraggable(handle: View) {
        var startY = 0
        var touchY = 0f
        var moved = false
        handle.setOnTouchListener { v, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> {
                    startY = params.y; touchY = e.rawY; moved = false; true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dy = (e.rawY - touchY).toInt()
                    if (kotlin.math.abs(dy) > ui.dp(6)) moved = true
                    params.y = (startY + dy).coerceIn(0, ctx.resources.displayMetrics.heightPixels - ui.dp(80))
                    wm.updateViewLayout(root, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!moved) v.performClick()
                    true
                }
                else -> false
            }
        }
    }

    private fun minimizedView(): View {
        val step = steps[stepIndex]
        val pill = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = ui.rounded(C.SURFACE, 24, C.BORDER_STRONG)
            setPadding(ui.dp(16), ui.dp(8), ui.dp(8), ui.dp(8))
            elevation = ui.dp(10).toFloat()
        }
        val label = ui.text("☎ KGF · ${stepIndex + 1}/${steps.size} · ${step.title}", 14f, bold = true).apply {
            setOnClickListener { minimized = false; render() }
        }
        makeDraggable(label)
        pill.addView(label, LinearLayout.LayoutParams(0, -2, 1f))
        pill.addView(ui.button("✕", Btn.GHOST) { close() }.apply { minWidth = ui.dp(46) })
        return FrameLayout(ctx).apply {
            addView(pill, FrameLayout.LayoutParams(-1, -2).apply { setMargins(ui.dp(40), 0, ui.dp(40), 0) })
        }
    }

    private fun renderHeader() {
        header.removeAllViews()
        val top = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val titleBox = ui.column().apply {
            addView(ui.label("KGF Premium · rozmowa", C.ACCENT))
            val number = callerNumber?.let(Phone::format) ?: "Numer ukryty"
            val who = when {
                customer?.name != null -> " · ${customer!!.name}"
                customer != null -> " · nowy klient"
                else -> ""
            }
            addView(ui.text(number + who, 16f, bold = true))
        }
        makeDraggable(titleBox)
        top.addView(titleBox, LinearLayout.LayoutParams(0, -2, 1f))
        top.addView(ui.button("—", Btn.GHOST) { minimized = true; render() }.apply { minWidth = ui.dp(46) })
        top.addView(ui.button("✕", Btn.GHOST) { close() }.apply { minWidth = ui.dp(46) },
            LinearLayout.LayoutParams(-2, -2).apply { marginStart = ui.dp(6) })
        header.addView(top)

        val c = customer
        val info = when {
            lookupState != null -> lookupState
            c != null && c.hasAccount -> "Ma konto w aplikacji · przejazdów: ${c.rideCount}"
            c != null && c.rideCount > 0 -> "Dzwonił wcześniej · przejazdów: ${c.rideCount}"
            !prefs.serverConfigured -> "Serwer nieustawiony – zamówienia możesz tylko skopiować"
            else -> null
        }
        if (info != null) header.addView(ui.text(info, 13f, C.MUTED).apply { setPadding(0, ui.dp(2), 0, 0) })

        c?.recentRides?.firstOrNull()?.let { last ->
            val row = LinearLayout(ctx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, ui.dp(6), 0, 0)
            }
            row.addView(ui.text("Ostatnio: ${last.pickup} → ${last.destination}", 13f, C.MUTED),
                LinearLayout.LayoutParams(0, -2, 1f))
            row.addView(ui.button("Ta sama trasa", Btn.SECONDARY) {
                order.pickup = last.pickup
                order.destination = last.destination
                message = "Wpisano trasę z ostatniego przejazdu" to C.OK
                renderBody()
            }.apply { minHeight = ui.dp(36); setPadding(ui.dp(10), 0, ui.dp(10), 0) })
            header.addView(row)
        }

        if (!callActive) {
            header.addView(ui.text("Rozmowa zakończona – możesz dokończyć zamówienie", 13f, C.WARN).apply {
                setPadding(0, ui.dp(4), 0, 0)
            })
        }

        val tabs = ui.row(
            ui.chip("Skrypt", tab == Tab.SCRIPT) { tab = Tab.SCRIPT; renderBody(); renderHeader() },
            ui.chip("Pytania klientów", tab == Tab.FAQ) { tab = Tab.FAQ; renderBody(); renderHeader() },
        )
        header.addView(tabs, LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = ui.dp(10); bottomMargin = ui.dp(10)
        })
    }

    private fun renderBody() {
        body.removeAllViews()
        if (tab == Tab.FAQ) renderFaq() else renderStep()
    }

    private fun sayBox(text: String) = LinearLayout(ctx).apply {
        orientation = LinearLayout.HORIZONTAL
        background = ui.rounded(C.SURFACE2, 12)
        addView(View(ctx).apply { setBackgroundColor(C.ACCENT) }, LinearLayout.LayoutParams(ui.dp(3), -1))
        addView(ui.column().apply {
            setPadding(ui.dp(12), ui.dp(10), ui.dp(12), ui.dp(12))
            addView(ui.label("Powiedz", C.ACCENT))
            addView(ui.text(text, 19f, bold = true).apply { setPadding(0, ui.dp(4), 0, 0) })
        }, LinearLayout.LayoutParams(0, -2, 1f))
    }

    private fun renderStep() {
        val step = steps[stepIndex]
        body.addView(ui.label("Krok ${stepIndex + 1} z ${steps.size} · ${step.title}"))
        body.addView(ui.spacer(6))
        body.addView(sayBox(step.say()))
        step.hint?.let { body.addView(ui.text("💡 $it", 13f, C.MUTED).apply { setPadding(0, ui.dp(8), 0, 0) }) }

        val content = ui.column(8)
        step.content(content)
        if (content.childCount > 0) {
            body.addView(ui.spacer(10))
            body.addView(content)
        }

        message?.let { (text, color) ->
            body.addView(ui.text(text, 14f, color).apply { setPadding(0, ui.dp(10), 0, 0) })
        }

        body.addView(ui.spacer(12))
        val isConfirm = stepIndex == steps.size - 2
        val isLast = stepIndex == steps.size - 1
        val back = ui.button("◀ Wstecz", Btn.GHOST) { go(-1) }
        val next = when {
            isLast -> ui.button("Zamknij panel", Btn.PRIMARY) { close() }
            isConfirm && saved -> ui.button("Dalej ▶", Btn.PRIMARY) { go(1) }
            isConfirm -> ui.button(if (saving) "Zapisuję…" else "Zapisz zamówienie", Btn.PRIMARY) { save() }
            else -> ui.button("Dalej ▶", Btn.PRIMARY) { go(1) }
        }
        body.addView(if (stepIndex > 0) ui.row(back, next) else next)

        if (isConfirm) {
            body.addView(ui.spacer(8))
            body.addView(ui.button("Kopiuj podsumowanie", Btn.SECONDARY) { copySummary() })
        }
        if (isLast) {
            body.addView(ui.spacer(8))
            body.addView(ui.button("Nowe zamówienie od tego klienta", Btn.SECONDARY) {
                order = Order()
                resetContact()
                saved = false
                message = null
                stepIndex = 1
                renderBody()
            })
        }
    }

    private fun renderFaq() {
        body.addView(ui.text("Dotknij pytania, które zadał klient:", 13f, C.MUTED))
        Faq.items(order).forEach { (question, answer) ->
            body.addView(ui.spacer(8))
            val item = ui.column().apply {
                background = ui.rounded(C.SURFACE2, 12)
                setPadding(ui.dp(12), ui.dp(10), ui.dp(12), ui.dp(10))
            }
            item.addView(ui.text(question, 15f, bold = true))
            val answerView = ui.text(answer, 17f, C.TEXT).apply {
                visibility = View.GONE
                setPadding(0, ui.dp(6), 0, 0)
            }
            item.addView(answerView)
            item.setOnClickListener {
                answerView.visibility = if (answerView.visibility == View.GONE) View.VISIBLE else View.GONE
            }
            body.addView(item)
        }
    }

    private fun go(delta: Int) {
        if (delta > 0) {
            val error = steps[stepIndex].validate()
            if (error != null) {
                message = error to C.ACCENT
                renderBody()
                return
            }
        }
        message = null
        stepIndex = (stepIndex + delta).coerceIn(0, steps.size - 1)
        renderBody()
    }

    // ---------- Saving ----------

    private fun save() {
        if (saving) return
        if (!prefs.serverConfigured) {
            copySummary()
            message = "Serwer nie jest ustawiony, więc skopiowałem podsumowanie. Ustaw serwer w aplikacji KGF Asystent." to C.WARN
            renderBody()
            return
        }
        val error = runCatching { order.toJson() }.exceptionOrNull()
        if (error != null) {
            message = (error.message ?: "Sprawdź dane zamówienia") to C.ACCENT
            renderBody()
            return
        }
        saving = true
        message = null
        renderBody()
        background({ Api(prefs.serverUrl, prefs.adminKey).createRide(order) }) { result ->
            saving = false
            result.onSuccess {
                saved = true
                message = "Zamówienie zapisane ✓ Jest już w panelu dyspozytora." to C.OK
                stepIndex = steps.size - 1
            }.onFailure {
                message = "Nie zapisano: ${it.message}" to C.ACCENT
            }
            renderBody()
        }
    }

    private fun copySummary() {
        val text = "${order.summary()}\nKontakt: ${order.contactName}, ${Phone.format(order.contactPhone)}"
        ctx.getSystemService(ClipboardManager::class.java)
            .setPrimaryClip(ClipData.newPlainText("Zamówienie KGF", text))
        message = "Skopiowano podsumowanie" to C.OK
        renderBody()
    }

    // ---------- Script ----------

    private fun field(container: LinearLayout, hint: String, value: String, type: Int, onChange: (String) -> Unit) {
        container.addView(ui.field(hint, value, type) {
            onChange(it)
            message = null
        })
    }

    private fun buildSteps(): List<Step> {
        val text = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
        return listOf(
            Step(
                title = "Powitanie",
                say = {
                    val me = prefs.dispatcherName.takeIf { it.isNotBlank() }?.let { " Mówi $it." } ?: ""
                    val name = customer?.name
                    if (name != null) "KGF Premium, dzień dobry!$me Czy rozmawiam z: $name?"
                    else "KGF Premium, dzień dobry!$me W czym mogę pomóc?"
                },
                hint = "Klient chce zamówić przejazd? Przejdź dalej. Ma pytanie? Zajrzyj do „Pytania klientów”.",
            ),
            Step(
                title = "Odbiór",
                say = { "Skąd mamy Panią lub Pana odebrać?" },
                hint = "Dopytaj o numer budynku, wejście albo charakterystyczne miejsce.",
                content = { c -> field(c, "Adres odbioru", order.pickup, text) { order.pickup = it } },
                validate = { if (order.pickup.trim().length < 3) "Wpisz adres odbioru" else null },
            ),
            Step(
                title = "Cel",
                say = { "Dokąd jedziemy?" },
                content = { c -> field(c, "Cel podróży", order.destination, text) { order.destination = it } },
                validate = { if (order.destination.trim().length < 3) "Wpisz cel podróży" else null },
            ),
            Step(
                title = "Kiedy",
                say = { "Na kiedy zamawiamy – teraz, czy na konkretną godzinę?" },
                content = { c ->
                    c.addView(ui.row(*When.values().map { w ->
                        ui.chip(w.label, order.whenChoice == w) { order.whenChoice = w; message = null; renderBody() }
                    }.toTypedArray()))
                    if (order.whenChoice != When.NOW) {
                        field(c, "Godzina, np. 14:30", order.time, InputType.TYPE_CLASS_DATETIME or InputType.TYPE_DATETIME_VARIATION_TIME) {
                            order.time = it
                        }
                    }
                },
                validate = { runCatching { order.scheduledAt() }.exceptionOrNull()?.message },
            ),
            Step(
                title = "Pasażerowie",
                say = { "Ile osób pojedzie? Czy będzie duży bagaż?" },
                hint = "Lotnisko albo dużo bagażu → zaproponuj Model Y. Więcej niż 4 osoby → Model X.",
                content = { c ->
                    val minus = ui.button("−", Btn.SECONDARY) {
                        order.passengers = (order.passengers - 1).coerceAtLeast(1); renderBody()
                    }
                    val count = ui.text("${order.passengers}", 24f, bold = true).apply { gravity = Gravity.CENTER }
                    val plus = ui.button("+", Btn.SECONDARY) {
                        order.passengers = (order.passengers + 1).coerceAtMost(6)
                        if (order.passengers > order.vehicle.seats) order.vehicleId = "modelX"
                        renderBody()
                    }
                    c.addView(ui.row(minus, count, plus))
                },
            ),
            Step(
                title = "Samochód",
                say = {
                    val v = if (order.vehicleChosen) order.vehicle else suggestedVehicle()
                    "Proponuję Teslę ${v.name} – ${v.description}. Cena: ${Fleet.priceLine(v)}. Może być?"
                },
                content = { c ->
                    if (!order.vehicleChosen) order.vehicleId = suggestedVehicle().id
                    val chips = Fleet.vehicles.map { v ->
                        ui.chip("${v.name}\nod ${v.minimumFare} zł", order.vehicleId == v.id, v.seats >= order.passengers) {
                            order.vehicleId = v.id; order.vehicleChosen = true; renderBody()
                        }
                    }
                    c.addView(ui.row(chips[0], chips[1]))
                    c.addView(ui.row(chips[2], chips[3]))
                },
            ),
            Step(
                title = "Płatność",
                say = { "Płaci Pani lub Pan kartą u kierowcy czy gotówką?" },
                content = { c ->
                    c.addView(ui.row(*Fleet.payments.map { (id, label) ->
                        ui.chip(label, order.payment == id) { order.payment = id; renderBody() }
                    }.toTypedArray()))
                },
            ),
            Step(
                title = "Kontakt",
                say = {
                    if (order.contactPhone.isNotBlank())
                        "Na jakie imię zapisać zamówienie? Kierowca zadzwoni na numer ${Phone.format(order.contactPhone)} – czy jest aktualny?"
                    else "Na jakie imię zapisać zamówienie i pod jaki numer może zadzwonić kierowca?"
                },
                content = { c ->
                    field(c, "Imię i nazwisko", order.contactName, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_WORDS) {
                        order.contactName = it
                    }
                    field(c, "Telefon kontaktowy", order.contactPhone, InputType.TYPE_CLASS_PHONE) { order.contactPhone = it }
                },
                validate = {
                    when {
                        order.contactName.trim().length < 2 -> "Wpisz imię klienta"
                        !Phone.isValid(order.contactPhone) -> "Wpisz poprawny numer telefonu"
                        else -> null
                    }
                },
            ),
            Step(
                title = "Uwagi",
                say = { "Czy coś jeszcze? Na przykład fotelik dla dziecka albo numer lotu?" },
                content = { c ->
                    c.addView(ui.field("Uwagi dla kierowcy (opcjonalnie)", order.notes, multiline = true) { order.notes = it })
                    c.addView(ui.row(
                        ui.chip("+ Fotelik", false) { appendNote("Fotelik dla dziecka") },
                        ui.chip("+ Bagaż", false) { appendNote("Duży bagaż") },
                        ui.chip("+ Lot", false) { appendNote("Numer lotu: ") },
                    ))
                },
            ),
            Step(
                title = "Potwierdzenie",
                say = { order.summary() },
                hint = "Przeczytaj klientowi podsumowanie i zapisz zamówienie.",
            ),
            Step(
                title = "Pożegnanie",
                say = { "Dziękuję, zamówienie przyjęte. Kierowca zadzwoni przed przyjazdem. Do usłyszenia!" },
            ),
        )
    }

    private fun suggestedVehicle(): Vehicle =
        if (order.passengers > 4) Fleet.get("modelX") else order.vehicle

    private fun appendNote(note: String) {
        order.notes = listOf(order.notes.trim(), note).filter { it.isNotBlank() }.joinToString(", ")
        renderBody()
    }
}

/** ScrollView that never grows taller than [maxHeight] pixels. */
private class MaxHeightScrollView(context: Context, private val maxHeight: Int) : ScrollView(context) {
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        super.onMeasure(widthMeasureSpec, MeasureSpec.makeMeasureSpec(maxHeight, MeasureSpec.AT_MOST))
    }
}
