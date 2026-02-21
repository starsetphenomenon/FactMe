package io.ionic.starter;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.drawable.Drawable;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.drawable.DrawableCompat;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.Locale;

public class FactMeNotificationReceiver extends BroadcastReceiver {

    public static final String ACTION_DAILY = "io.ionic.starter.FACTME_DAILY";
    private static final String CHANNEL_ID = "daily_fact";
    private static final String PREFS_NAME = "FactMeNotification";
    private static final String KEY_FACTS_BY_DATE = "factsByDate";

    static final String EXTRA_ID = "id";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_BODY = "body";
    static final String EXTRA_LARGE_ICON_NAME = "largeIconDrawableName";
    static final String EXTRA_LARGE_ICON_TINT = "largeIconTintColor";
    static final String EXTRA_WEEKDAY = "weekday";
    static final String EXTRA_HOUR = "hour";
    static final String EXTRA_MINUTE = "minute";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_DAILY.equals(intent.getAction())) return;

        int id = intent.getIntExtra(EXTRA_ID, 0);
        String titleFallback = intent.getStringExtra(EXTRA_TITLE);
        String bodyFallback = intent.getStringExtra(EXTRA_BODY);
        String largeIconNameFallback = intent.getStringExtra(EXTRA_LARGE_ICON_NAME);
        String largeIconTintFallback = intent.getStringExtra(EXTRA_LARGE_ICON_TINT);
        int weekday = intent.getIntExtra(EXTRA_WEEKDAY, Calendar.MONDAY);
        int hour = intent.getIntExtra(EXTRA_HOUR, 9);
        int minute = intent.getIntExtra(EXTRA_MINUTE, 0);

        if (titleFallback == null) titleFallback = "";
        if (bodyFallback == null) bodyFallback = "";

        String todayKey = todayIsoDate();
        String title = titleFallback;
        String body = bodyFallback;
        String largeIconName = largeIconNameFallback;
        String largeIconTint = largeIconTintFallback;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String factsJson = prefs.getString(KEY_FACTS_BY_DATE, null);
        if (factsJson != null) {
            try {
                JSONObject factsByDate = new JSONObject(factsJson);
                if (factsByDate.has(todayKey)) {
                    JSONObject entry = factsByDate.getJSONObject(todayKey);
                    title = entry.optString("title", titleFallback);
                    body = entry.optString("body", bodyFallback);
                    if (entry.has("largeIconDrawableName")) {
                        largeIconName = entry.optString("largeIconDrawableName", largeIconNameFallback);
                    }
                    if (entry.has("largeIconTintColor")) {
                        largeIconTint = entry.optString("largeIconTintColor", largeIconTintFallback);
                    }
                }
            } catch (Exception ignored) {
            }
        }

        FactMeNotificationPlugin.ensureChannel(context);
        NotificationCompat.Builder builder = buildNotification(context, title, body, largeIconName, largeIconTint);
        NotificationManagerCompat.from(context).notify(id, builder.build());

        long nextTrigger = nextTriggerTime(weekday, hour, minute);
        Intent nextIntent = new Intent(context, FactMeNotificationReceiver.class);
        nextIntent.setAction(ACTION_DAILY);
        nextIntent.putExtra(EXTRA_ID, id);
        nextIntent.putExtra(EXTRA_TITLE, titleFallback);
        nextIntent.putExtra(EXTRA_BODY, bodyFallback);
        nextIntent.putExtra(EXTRA_LARGE_ICON_NAME, largeIconNameFallback);
        nextIntent.putExtra(EXTRA_LARGE_ICON_TINT, largeIconTintFallback);
        nextIntent.putExtra(EXTRA_WEEKDAY, weekday);
        nextIntent.putExtra(EXTRA_HOUR, hour);
        nextIntent.putExtra(EXTRA_MINUTE, minute);

        int flags = PendingIntent.FLAG_CANCEL_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent pending = PendingIntent.getBroadcast(context, id, nextIntent, flags);
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC, nextTrigger, pending);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                am.set(AlarmManager.RTC, nextTrigger, pending);
            } else {
                am.setExact(AlarmManager.RTC, nextTrigger, pending);
            }
        }
    }

    static NotificationCompat.Builder buildNotification(Context context, String title, String body,
                                                         String largeIconDrawableName, String largeIconTintColor) {
        Context app = context.getApplicationContext();
        String pkg = app.getPackageName();

        int smallIconId = app.getResources().getIdentifier("ic_notification_app", "drawable", pkg);
        if (smallIconId == 0) {
            smallIconId = app.getResources().getIdentifier("ic_notification_small", "drawable", pkg);
        }
        if (smallIconId == 0) {
            smallIconId = app.getResources().getIdentifier("ic_launcher_small", "drawable", pkg);
        }
        if (smallIconId == 0) {
            smallIconId = app.getApplicationInfo().icon;
        }

        Intent launch = app.getPackageManager().getLaunchIntentForPackage(pkg);
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        }
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            piFlags |= PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent contentIntent = launch != null
                ? PendingIntent.getActivity(app, 0, launch, piFlags)
                : null;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(app, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(smallIconId)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        FactMeNotificationPlugin.applySoundToBuilder(app, builder);
        if (contentIntent != null) {
            builder.setContentIntent(contentIntent);
        }

        if (largeIconDrawableName != null && !largeIconDrawableName.isEmpty()) {
            int largeResId = app.getResources().getIdentifier(
                    largeIconDrawableName, "drawable", pkg);
            if (largeResId == 0) {
                largeResId = app.getResources().getIdentifier(
                        largeIconDrawableName, "drawable", "io.ionic.starter");
            }
            if (largeResId != 0) {
                Drawable drawable = ContextCompat.getDrawable(app, largeResId);
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
        return builder;
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

    private static String todayIsoDate() {
        Calendar c = Calendar.getInstance();
        int y = c.get(Calendar.YEAR);
        int m = c.get(Calendar.MONTH) + 1;
        int d = c.get(Calendar.DAY_OF_MONTH);
        return String.format(Locale.US, "%04d-%02d-%02d", y, m, d);
    }

    private static long nextTriggerTime(int weekday, int hour, int minute) {
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
}
