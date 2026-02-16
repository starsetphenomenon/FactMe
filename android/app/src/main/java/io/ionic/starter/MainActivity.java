package io.ionic.starter;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            registerPlugin(FactMeNotificationPlugin.class);
        } catch (Throwable t) {
            Log.e(TAG, "FactMeNotificationPlugin registration failed", t);
        }
        super.onCreate(savedInstanceState);
    }
}
