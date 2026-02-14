package io.ionic.starter;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
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
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.Calendar;

@CapacitorPlugin(name = "FactMeNotification")
public class FactMeNotificationPlugin extends Plugin {

    private static final String CHANNEL_ID = "default";
    private static final int TEST_NOTIFICATION_ID = 999;

    @PluginMethod
    public void showTestNotification(PluginCall call) {
        String title = call.getString("title");
        String body = call.getString("body");
        String largeIconDrawableName = call.getString("largeIconDrawableName");
        String largeIconTintColor = call.getString("largeIconTintColor");
        if (title == null) title = "";
        if (body == null) body = "";

        Context context = getContext().getApplicationContext();
        ensureChannel(context);

        // Prefer your square icon (no white corners), then vector fallbacks, then app launcher
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
    }

    @PluginMethod
    public void scheduleDailyNotifications(PluginCall call) {
        JSONArray list = call.getArray("notifications");
        if (list == null) {
            call.resolve();
            return;
        }
        Context context = getContext();
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) {
            call.resolve();
            return;
        }
        int flags = PendingIntent.FLAG_CANCEL_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        try {
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                    am.set(AlarmManager.RTC, trigger, pending);
                } else {
                    am.setExact(AlarmManager.RTC, trigger, pending);
                }
            }
        } catch (JSONException e) {
            call.reject(e.getMessage());
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void clearDisplayedNotifications(PluginCall call) {
        Context context = getContext().getApplicationContext();
        NotificationManagerCompat nm = NotificationManagerCompat.from(context);
        for (int id : new int[] { 1, 2, 3, 4, 5, 6, 7, TEST_NOTIFICATION_ID }) {
            nm.cancel(id);
        }
        call.resolve();
    }

    @PluginMethod
    public void cancelDailyNotifications(PluginCall call) {
        JSONArray ids = call.getArray("ids");
        if (ids == null) {
            call.resolve();
            return;
        }
        Context context = getContext();
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            try {
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
            } catch (JSONException ignored) {
            }
        }
        call.resolve();
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

    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Default", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Default");
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
