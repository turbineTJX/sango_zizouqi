package com.sango.sovereign;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipEntry;
import java.security.MessageDigest;
import org.json.JSONObject;
import org.json.JSONArray;

public class MainActivity extends BridgeActivity {
    private Map<String, byte[]> artFiles;
    private boolean artChecked = false;

    private synchronized void loadArt() throws Exception {
        if (artChecked) return;
        artChecked = true;
        InputStream input;
        try { input = getAssets().open("public/art.pack"); }
        catch (java.io.FileNotFoundException missing) { return; }
        Map<String, byte[]> entries = new HashMap<>();
        long total = 0;
        try (ZipInputStream zip = new ZipInputStream(input)) {
            ZipEntry entry;
            byte[] buffer = new byte[8192];
            while ((entry = zip.getNextEntry()) != null) {
                if (entries.size() >= 20001 || entries.containsKey(entry.getName())) throw new Exception("Invalid art archive");
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                int count;
                while ((count = zip.read(buffer)) != -1) {
                    total += count;
                    if (total > 512L * 1024 * 1024) throw new Exception("Art archive exceeds limit");
                    bytes.write(buffer, 0, count);
                }
                entries.put(entry.getName(), bytes.toByteArray());
            }
        }
        JSONObject index = new JSONObject(new String(entries.get("pack-index.json"), java.nio.charset.StandardCharsets.UTF_8));
        if (index.getInt("formatVersion") != 1) throw new Exception("Unsupported art pack");
        JSONArray files = index.getJSONArray("files");
        Map<String, byte[]> approved = new HashMap<>();
        for (int i = 0; i < files.length(); i++) {
            JSONObject file = files.getJSONObject(i);
            String path = file.getString("path");
            if (!path.matches("([A-Za-z0-9_-]+/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\\.(json|png|jpe?g|webp|svg|glb|obj)") || approved.containsKey(path)) throw new Exception("Invalid art path");
            byte[] bytes = entries.get(path);
            if (bytes == null || bytes.length != file.getInt("bytes")) throw new Exception("Art file length mismatch");
            StringBuilder hash = new StringBuilder();
            for (byte value : MessageDigest.getInstance("SHA-256").digest(bytes)) hash.append(String.format("%02x", value & 255));
            if (!hash.toString().equals(file.getString("sha256"))) throw new Exception("Art checksum mismatch");
            approved.put(path, bytes);
        }
        if (!approved.containsKey("manifest.json") || entries.size() != approved.size() + 1) throw new Exception("Invalid art entries");
        artFiles = approved;
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if ("localhost".equals(request.getUrl().getHost()) && path != null && path.startsWith("/assets/")) {
                    try {
                        loadArt();
                        byte[] bytes = artFiles == null ? null : artFiles.get(path.substring(8));
                        String type = path.endsWith(".json") ? "application/json" : path.endsWith(".svg") ? "image/svg+xml" : path.endsWith(".webp") ? "image/webp" : path.endsWith(".png") ? "image/png" : path.endsWith(".glb") ? "model/gltf-binary" : path.endsWith(".obj") ? "text/plain" : "image/jpeg";
                        return new WebResourceResponse(type, "UTF-8", bytes == null ? 404 : 200, bytes == null ? "Not Found" : "OK", new HashMap<>(), new ByteArrayInputStream(bytes == null ? new byte[0] : bytes));
                    } catch (Exception error) {
                        return new WebResourceResponse("text/plain", "UTF-8", 500, "Invalid Art Pack", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
                    }
                }
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
