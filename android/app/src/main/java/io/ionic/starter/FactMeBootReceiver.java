package io.ionic.starter;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Re-schedules daily notification alarms after device reboot.
 * Alarms are cleared on reboot; this restores them from persisted settings.
 */
public class FactMeBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(FactMeNotificationPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String scheduleJson = prefs.getString(FactMeNotificationPlugin.KEY_DAILY_SCHEDULE, null);
        if (scheduleJson == null || scheduleJson.isEmpty()) {
            return;
        }

        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) {
            return;
        }

        int flags = PendingIntent.FLAG_CANCEL_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }

        try {
            JSONArray list = new JSONArray(scheduleJson);
            for (int i = 0; i < list.length(); i++) {
                JSONObject o = list.getJSONObject(i);
                int id = o.getInt("id");
                String title = o.optString("title", "");
                String body = o.optString("body", "");
                String largeIconDrawableName = o.optString("largeIconDrawableName", "");
                String largeIconTintColor = o.optString("largeIconTintColor", "");
                int weekday = o.getInt("weekday");
                int hour = o.getInt("hour");
                int minute = o.getInt("minute");

                long trigger = FactMeNotificationPlugin.nextTriggerTime(weekday, hour, minute);

                Intent alarmIntent = new Intent(context, FactMeNotificationReceiver.class);
                alarmIntent.setAction(FactMeNotificationReceiver.ACTION_DAILY);
                alarmIntent.putExtra(FactMeNotificationReceiver.EXTRA_ID, id);
                alarmIntent.putExtra(FactMeNotificationReceiver.EXTRA_TITLE, title);
                alarmIntent.putExtra(FactMeNotificationReceiver.EXTRA_BODY, body);
                alarmIntent.putExtra(FactMeNotificationReceiver.EXTRA_LARGE_ICON_NAME, largeIconDrawableName);
                alarmIntent.putExtra(FactMeNotificationReceiver.EXTRA_LARGE_ICON_TINT, largeIconTintColor);
                alarmIntent.putExtra(FactMeNotificationReceiver.EXTRA_WEEKDAY, weekday);
                alarmIntent.putExtra(FactMeNotificationReceiver.EXTRA_HOUR, hour);
                alarmIntent.putExtra(FactMeNotificationReceiver.EXTRA_MINUTE, minute);

                PendingIntent pending = PendingIntent.getBroadcast(context, id, alarmIntent, flags);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC, trigger, pending);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                    am.set(AlarmManager.RTC, trigger, pending);
                } else {
                    am.setExact(AlarmManager.RTC, trigger, pending);
                }
            }
        } catch (Exception e) {
            android.util.Log.e("FactMeBootReceiver", "Re-schedule after boot failed", e);
        }
    }
}
