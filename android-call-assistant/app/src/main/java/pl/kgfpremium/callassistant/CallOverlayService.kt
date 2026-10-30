package pl.kgfpremium.callassistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log

/** Keeps the script panel on screen while a call is being handled. */
class CallOverlayService : Service() {

    companion object {
        private const val TAG = "KgfCallAssistant"
        private const val CHANNEL_ID = "call_assistant"
        private const val NOTIFICATION_ID = 7
        private const val ACTION_SHOW = "show"
        private const val ACTION_NUMBER = "number"
        private const val ACTION_ENDED = "ended"
        private const val ACTION_STOP = "stop"
        private const val EXTRA_NUMBER = "number"

        @Volatile
        var running = false
            private set

        fun show(context: Context, number: String?) =
            send(context, ACTION_SHOW, number, foreground = true)

        fun updateNumber(context: Context, number: String) {
            if (running) send(context, ACTION_NUMBER, number, foreground = false)
        }

        fun callEnded(context: Context) {
            if (running) send(context, ACTION_ENDED, null, foreground = false)
        }

        private fun send(context: Context, action: String, number: String?, foreground: Boolean) {
            val intent = Intent(context, CallOverlayService::class.java)
                .setAction(action)
                .putExtra(EXTRA_NUMBER, number)
            try {
                if (foreground) context.startForegroundService(intent) else context.startService(intent)
            } catch (e: Exception) {
                // Usually means the overlay permission is missing; the main screen shows that
                Log.w(TAG, "Could not start the call panel", e)
            }
        }
    }

    private var overlay: CallOverlay? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        running = true
        startInForeground()
        val number = intent?.getStringExtra(EXTRA_NUMBER)

        when (intent?.action) {
            ACTION_SHOW -> {
                if (!Settings.canDrawOverlays(this)) {
                    stopSelf()
                    return START_NOT_STICKY
                }
                val current = overlay
                if (current == null) {
                    overlay = CallOverlay(this, Prefs(this), number) { stopSelf() }.also { it.show() }
                } else {
                    current.onNewCall(number)
                }
            }
            ACTION_NUMBER -> if (number != null) overlay?.onNumber(number)
            ACTION_ENDED -> overlay?.onCallEnded()
            ACTION_STOP -> stopSelf()
        }
        if (overlay == null) stopSelf()
        return START_NOT_STICKY
    }

    private fun startInForeground() {
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Asystent rozmów", NotificationManager.IMPORTANCE_LOW),
            )
        }
        val stop = PendingIntent.getService(
            this, 1,
            Intent(this, CallOverlayService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_call)
            .setContentTitle("Asystent rozmów KGF")
            .setContentText("Skrypt rozmowy jest wyświetlany na ekranie")
            .setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Zamknij", stop).build())
            .build()

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onDestroy() {
        overlay?.remove()
        overlay = null
        running = false
        super.onDestroy()
    }
}
