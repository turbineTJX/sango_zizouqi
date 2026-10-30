package com.sango.sovereign;

import android.os.Bundle;
import android.content.pm.ActivityInfo;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // Capacitor streams approved assets directly from the APK.
                WebResourceResponse response = super.shouldInterceptRequest(view, request);
                if (response != null && "localhost".equals(request.getUrl().getHost())) {
                    Map<String, String> headers = new HashMap<>();
                    if (response.getResponseHeaders() != null) headers.putAll(response.getResponseHeaders());
                    headers.put("Cache-Control", "no-store");
                    response.setResponseHeaders(headers);
                }
                return response;
            }
        });
    }
}
