package pl.kgfpremium.callassistant

import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

object C {
    const val BG = 0xFF0A0A0B.toInt()
    const val SURFACE = 0xFF141416.toInt()
    const val SURFACE2 = 0xFF1C1C1F.toInt()
    const val SURFACE3 = 0xFF26262A.toInt()
    const val BORDER = 0xFF2A2A2E.toInt()
    const val BORDER_STRONG = 0xFF3A3A3F.toInt()
    const val TEXT = 0xFFF5F5F7.toInt()
    const val MUTED = 0xFF9A9AA0.toInt()
    const val FAINT = 0xFF6C6C72.toInt()
    const val ACCENT = 0xFFE82127.toInt()
    const val OK = 0xFF30D158.toInt()
    const val WARN = 0xFFFFD60A.toInt()
}

enum class Btn { PRIMARY, SECONDARY, GHOST, DANGER }

/** Small helpers for building the dark KGF interface in code. */
class Ui(val ctx: Context) {
    fun dp(v: Int) = (v * ctx.resources.displayMetrics.density).toInt()

    fun rounded(color: Int, radiusDp: Int = 12, stroke: Int? = null) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(radiusDp).toFloat()
        if (stroke != null) setStroke(dp(1), stroke)
    }

    fun text(value: String, size: Float = 15f, color: Int = C.TEXT, bold: Boolean = false) =
        TextView(ctx).apply {
            text = value
            setTextColor(color)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
            if (bold) typeface = Typeface.DEFAULT_BOLD
            setLineSpacing(0f, 1.15f)
        }

    fun label(value: String, color: Int = C.FAINT) = text(value.uppercase(), 11f, color, bold = true).apply {
        letterSpacing = 0.12f
    }

    fun button(title: String, style: Btn = Btn.PRIMARY, onClick: () -> Unit) = TextView(ctx).apply {
        text = title
        gravity = Gravity.CENTER
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        typeface = Typeface.DEFAULT_BOLD
        minHeight = dp(46)
        setPadding(dp(14), dp(10), dp(14), dp(10))
        val (bg, fg, border) = when (style) {
            Btn.PRIMARY -> Triple(C.TEXT, C.BG, C.TEXT)
            Btn.SECONDARY -> Triple(C.SURFACE3, C.TEXT, C.BORDER)
            Btn.GHOST -> Triple(0x00000000, C.TEXT, C.BORDER_STRONG)
            Btn.DANGER -> Triple(0x00000000, C.ACCENT, C.ACCENT)
        }
        setTextColor(fg)
        background = rounded(bg, 10, border)
        isClickable = true
        setOnClickListener { onClick() }
    }

    /** Selectable option; the selected one is white with dark text. */
    fun chip(title: String, selected: Boolean, enabled: Boolean = true, onClick: () -> Unit) =
        button(title, if (selected) Btn.PRIMARY else Btn.SECONDARY, onClick).apply {
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            minHeight = dp(42)
            isEnabled = enabled
            alpha = if (enabled) 1f else 0.35f
        }

    fun field(
        hint: String,
        value: String,
        inputType: Int = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES,
        multiline: Boolean = false,
        onChange: (String) -> Unit,
    ) = EditText(ctx).apply {
        setText(value)
        this.hint = hint
        setHintTextColor(C.FAINT)
        setTextColor(C.TEXT)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
        background = rounded(C.SURFACE2, 10, C.BORDER_STRONG)
        setPadding(dp(14), dp(12), dp(14), dp(12))
        this.inputType = if (multiline) inputType or InputType.TYPE_TEXT_FLAG_MULTI_LINE else inputType
        if (multiline) {
            minLines = 2
            gravity = Gravity.TOP or Gravity.START
        } else {
            isSingleLine = true
        }
        addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) = onChange(s?.toString() ?: "")
        })
    }

    fun column(spacingDp: Int = 0) = LinearLayout(ctx).apply {
        orientation = LinearLayout.VERTICAL
        if (spacingDp > 0) {
            showDividers = LinearLayout.SHOW_DIVIDER_MIDDLE
            dividerDrawable = GradientDrawable().apply { setSize(1, dp(spacingDp)) }
        }
    }

    /** Horizontal row where every child gets an equal share of the width. */
    fun row(vararg views: View, gapDp: Int = 8) = LinearLayout(ctx).apply {
        orientation = LinearLayout.HORIZONTAL
        views.forEachIndexed { i, v ->
            addView(v, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                if (i > 0) marginStart = dp(gapDp)
            })
        }
    }

    fun spacer(heightDp: Int) = View(ctx).apply {
        layoutParams = LinearLayout.LayoutParams(1, dp(heightDp))
    }
}
