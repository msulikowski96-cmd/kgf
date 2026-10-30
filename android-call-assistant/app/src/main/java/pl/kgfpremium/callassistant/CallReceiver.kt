package pl.kgfpremium.callassistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

/**
 * Watches the phone state. When an incoming call is answered (RINGING -> OFFHOOK),
 * it opens the script panel. Outgoing calls are ignored.
 */
class CallReceiver : BroadcastReceiver() {

    companion object {
        private var lastState = TelephonyManager.EXTRA_STATE_IDLE
        private var ringingNumber: String? = null
    }

    @Suppress("DEPRECATION") // EXTRA_INCOMING_NUMBER is still delivered to apps with READ_CALL_LOG
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

        // Android sends each state twice (with and without the number), so act on changes only
        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                if (!number.isNullOrBlank()) ringingNumber = number
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                if (!number.isNullOrBlank() && ringingNumber == null) ringingNumber = number
                if (lastState == TelephonyManager.EXTRA_STATE_RINGING && Prefs(context).enabled) {
                    CallOverlayService.show(context, ringingNumber)
                } else if (!number.isNullOrBlank()) {
                    CallOverlayService.updateNumber(context, number)
                }
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                if (lastState != TelephonyManager.EXTRA_STATE_IDLE) CallOverlayService.callEnded(context)
                ringingNumber = null
            }
        }
        lastState = state
    }
}
