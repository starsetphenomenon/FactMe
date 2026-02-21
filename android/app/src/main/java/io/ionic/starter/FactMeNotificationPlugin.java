package io.ionic.starter;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.drawable.Drawable;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.drawable.DrawableCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.Calendar;
import android.util.Log;

@CapacitorPlugin(name = "FactMeNotification")
public class FactMeNotificationPlugin extends Plugin {

    private static final String TAG = "FactMeNotification";
    private static final String CHANNEL_ID = "daily_fact";
    private static final int TEST_NOTIFICATION_ID = 999;
    static final String PREFS_NAME = "FactMeNotification";
    private static final String KEY_FACTS_BY_DATE = "factsByDate";
    static final String KEY_DAILY_SCHEDULE = "dailySchedule";
    static final String KEY_SOUND_ENABLED = "soundEnabled";
    private static final String APP_SOUND_RAW_NAME = "notification_sound";

    private Context getContextSafe() {
        try {
            return getContext() != null ? getContext().getApplicationContext() : null;
        } catch (Throwable t) {
            Log.e(TAG, "getContext failed", t);
            return null;
        }
    }

    @PluginMethod
    public void showTestNotification(PluginCall call) {
        Context context = getContextSafe();
        if (context == null) {
            call.reject("Context not available");
            return;
        }
        try {
            String title = call.getString("title");
            String body = call.getString("body");
            String largeIconDrawableName = call.getString("largeIconDrawableName");
            String largeIconTintColor = call.getString("largeIconTintColor");
            if (title == null) title = "";
            if (body == null) body = "";
            ensureChannel(getContextSafe());

            int smallIconId = context.getResources().getIdentifier("ic_notification_app", "drawable", context.getPackageName());
            if (smallIconId == 0) {
                smallIconId = context.getResources().getIdentifier("ic_notification_small", "drawable", context.getPackageName());
            }
            if (smallIconId == 0) {
                smallIconId = context.getResources().getIdentifier("ic_launcher_small", "drawable", context.getPackageName());
            }
            if (smallIconId == 0) {
                smallIconId = context.getApplicationInfo().icon;
            }

            Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            }
            PendingIntent contentIntent = null;
            if (launch != null) {
                int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    piFlags |= PendingIntent.FLAG_MUTABLE;
                }
                contentIntent = PendingIntent.getActivity(context, 0, launch, piFlags);
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setSmallIcon(smallIconId)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT);
            applySoundToBuilder(context, builder);
            if (contentIntent != null) {
                builder.setContentIntent(contentIntent);
            }

            if (largeIconDrawableName != null && !largeIconDrawableName.isEmpty()) {
                int largeResId = context.getResources().getIdentifier(
                        largeIconDrawableName, "drawable", context.getPackageName());
                if (largeResId == 0) {
                    largeResId = context.getResources().getIdentifier(
                            largeIconDrawableName, "drawable", "io.ionic.starter");
                }
                if (largeResId != 0) {
                    Drawable drawable = ContextCompat.getDrawable(context, largeResId);
                    if (drawable != null) {
                        if (largeIconTintColor != null && !largeIconTintColor.isEmpty()) {
                            try {
                                int tintColor = Color.parseColor(largeIconTintColor);
                                drawable = drawable.mutate();
                                DrawableCompat.setTint(drawable, tintColor);
                                DrawableCompat.setTintMode(drawable, PorterDuff.Mode.SRC_IN);
                            } catch (Exception ignored) {
                            }
                        }
                        Bitmap largeBitmap = drawableToBitmap(drawable);
                        if (largeBitmap != null) {
                            builder.setLargeIcon(largeBitmap);
                        }
                    }
                }
            }

            NotificationManagerCompat.from(context).notify(TEST_NOTIFICATION_ID, builder.build());
            call.resolve(new JSObject().put("shown", true));
        } catch (Throwable t) {
            Log.e(TAG, "showTestNotification failed", t);
            call.reject(t.getMessage());
        }
    }

    @PluginMethod
    public void scheduleDailyNotifications(PluginCall call) {
        Context context = getContextSafe();
        if (context == null) {
            call.reject("Context not available");
            return;
        }
        JSONArray list = call.getArray("notifications");
        if (list == null) {
            call.resolve();
            return;
        }
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) {
            call.resolve();
            return;
        }
        int flags = PendingIntent.FLAG_CANCEL_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        try {
            JSONArray scheduleJson = new JSONArray();
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

                long trigger = nextTriggerTime(weekday, hour, minute);

                Intent intent = new Intent(context, FactMeNotificationReceiver.class);
                intent.setAction(FactMeNotificationReceiver.ACTION_DAILY);
                intent.putExtra(FactMeNotificationReceiver.EXTRA_ID, id);
                intent.putExtra(FactMeNotificationReceiver.EXTRA_TITLE, title);
                intent.putExtra(FactMeNotificationReceiver.EXTRA_BODY, body);
                intent.putExtra(FactMeNotificationReceiver.EXTRA_LARGE_ICON_NAME, largeIconDrawableName);
                intent.putExtra(FactMeNotificationReceiver.EXTRA_LARGE_ICON_TINT, largeIconTintColor);
                intent.putExtra(FactMeNotificationReceiver.EXTRA_WEEKDAY, weekday);
                intent.putExtra(FactMeNotificationReceiver.EXTRA_HOUR, hour);
                intent.putExtra(FactMeNotificationReceiver.EXTRA_MINUTE, minute);

                PendingIntent pending = PendingIntent.getBroadcast(context, id, intent, flags);
                scheduleAlarm(am, trigger, pending);

                scheduleJson.put(o);
            }
            prefs.edit().putString(KEY_DAILY_SCHEDULE, scheduleJson.toString()).apply();
        } catch (Throwable e) {
            Log.e(TAG, "scheduleDailyNotifications failed", e);
            call.reject(e.getMessage());
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void setNotificationFacts(PluginCall call) {
        Context context = getContextSafe();
        if (context == null) {
            call.reject("Context not available");
            return;
        }
        try {
            JSObject factsObj = call.getObject("facts");
            if (factsObj == null) {
                call.resolve();
                return;
            }
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_FACTS_BY_DATE, factsObj.toString()).apply();
            call.resolve();
        } catch (Throwable t) {
            Log.e(TAG, "setNotificationFacts failed", t);
            call.reject(t.getMessage());
        }
    }

    @PluginMethod
    public void clearDisplayedNotifications(PluginCall call) {
        Context context = getContextSafe();
        if (context == null) {
            call.reject("Context not available");
            return;
        }
        try {
            NotificationManagerCompat nm = NotificationManagerCompat.from(context);
            for (int id : new int[] { 1, 2, 3, 4, 5, 6, 7, TEST_NOTIFICATION_ID }) {
                nm.cancel(id);
            }
            call.resolve();
        } catch (Throwable t) {
            Log.e(TAG, "clearDisplayedNotifications failed", t);
            call.reject(t.getMessage());
        }
    }

    @PluginMethod
    public void setNotificationSoundOptions(PluginCall call) {
        Context context = getContextSafe();
        if (context == null) {
            call.reject("Context not available");
            return;
        }
        try {
            Boolean soundEnabled = call.getBoolean("soundEnabled", true);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putBoolean(KEY_SOUND_ENABLED, soundEnabled != null && soundEnabled).apply();
            call.resolve();
        } catch (Throwable t) {
            Log.e(TAG, "setNotificationSoundOptions failed", t);
            call.reject(t.getMessage());
        }
    }

    static Uri getNotificationSoundUri(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean soundEnabled = prefs.getBoolean(KEY_SOUND_ENABLED, true);
        if (!soundEnabled) {
            return null;
        }
        Uri appSoundUri = getAppNotificationSoundUri(context);
        return appSoundUri != null ? appSoundUri : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
    }

    static void applySoundToBuilder(Context context, NotificationCompat.Builder builder) {
        Uri soundUri = getNotificationSoundUri(context);
        builder.setSound(soundUri);
    }

    /** Returns URI for app-provided sound (res/raw/notification_sound), or null to use phone default. */
    private static Uri getAppNotificationSoundUri(Context context) {
        try {
            int resId = context.getResources().getIdentifier(APP_SOUND_RAW_NAME, "raw", context.getPackageName());
            if (resId != 0) {
                return Uri.parse("android.resource://" + context.getPackageName() + "/" + resId);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @PluginMethod
    public void cancelDailyNotifications(PluginCall call) {
        Context context = getContextSafe();
        if (context == null) {
            call.reject("Context not available");
            return;
        }
        JSONArray ids = call.getArray("ids");
        if (ids == null) {
            call.resolve();
            return;
        }
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                for (int i = 0; i < ids.length(); i++) {
                    int id = ids.getInt(i);
                    Intent intent = new Intent(context, FactMeNotificationReceiver.class);
                    intent.setAction(FactMeNotificationReceiver.ACTION_DAILY);
                    PendingIntent pending = PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_NO_CREATE);
                    if (pending != null) {
                        am.cancel(pending);
                        pending.cancel();
                    }
                }
            }
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .edit().remove(KEY_DAILY_SCHEDULE).apply();
            call.resolve();
        } catch (Throwable t) {
            Log.e(TAG, "cancelDailyNotifications failed", t);
            call.reject(t.getMessage());
        }
    }

    private static void scheduleAlarm(AlarmManager am, long triggerAt, PendingIntent pending) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC, triggerAt, pending);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            am.set(AlarmManager.RTC, triggerAt, pending);
        } else {
            am.setExact(AlarmManager.RTC, triggerAt, pending);
        }
    }

    static long nextTriggerTime(int weekday, int hour, int minute) {
        Calendar now = Calendar.getInstance();
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, minute);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        next.set(Calendar.DAY_OF_WEEK, weekday);
        if (next.getTimeInMillis() <= now.getTimeInMillis()) {
            next.add(Calendar.DAY_OF_MONTH, 7);
        }
        return next.getTimeInMillis();
    }

    static void ensureChannel(Context context) {
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Daily fact", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Daily fact notifications");
            Uri soundUri = getNotificationSoundUri(context);
            if (soundUri != null) {
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                channel.setSound(soundUri, attrs);
                channel.enableVibration(true);
            } else {
                channel.setSound(null, null);
                channel.enableVibration(false);
            }
            context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private static Bitmap drawableToBitmap(Drawable drawable) {
        if (drawable == null) return null;
        int w = drawable.getIntrinsicWidth();
        int h = drawable.getIntrinsicHeight();
        if (w <= 0 || h <= 0) {
            w = 256;
            h = 256;
        }
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, w, h);
        drawable.draw(canvas);
        return bitmap;
    }
}
