package com.robleemedia.stringtheory;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/** Full-screen, portrait, screen kept on while playing. Sound may start without a tap. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        // The game steps 60 times a second. On 90Hz and 120Hz screens ask for 60 so every drawn frame is a new one and the phone runs cooler.
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.preferredRefreshRate = 60f;
        // preferredRefreshRate is only a hint; also pick the display mode at this resolution that runs closest to 60 Hz.
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            android.view.Display d = getWindowManager().getDefaultDisplay();
            android.view.Display.Mode cur = d.getMode(), best = null;
            for (android.view.Display.Mode m : d.getSupportedModes()) {
                if (m.getPhysicalWidth() != cur.getPhysicalWidth() || m.getPhysicalHeight() != cur.getPhysicalHeight()) continue;
                if (best == null || Math.abs(m.getRefreshRate() - 60f) < Math.abs(best.getRefreshRate() - 60f)) best = m;
            }
            if (best != null) lp.preferredDisplayModeId = best.getModeId();
        }
        getWindow().setAttributes(lp);
        hideSystemBars();
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (v, ins) -> { passInsets(v, ins); return ins; });
        // Back (button or gesture) goes to the game first: it skips a film, pauses a flight, closes a sheet or steps back a screen.
        // Only when the game has nothing left to go back from does the app move to the background.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript(
                    "(function(){try{return !!(window.ST&&ST.game&&ST.game.back&&ST.game.back())}catch(e){return false}})()",
                    handled -> { if (!"true".equals(handled)) moveTaskToBack(true); });
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /** Screen off or app in the background: the game stops drawing and stops all sound, and the WebView's own timers stop too. */
    @Override
    public void onPause() {
        getBridge().getWebView().evaluateJavascript("(function(){try{window.ST&&ST.game&&ST.game.sleep&&ST.game.sleep()}catch(e){}})()", null);
        super.onPause();
        getBridge().getWebView().onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        getBridge().getWebView().onResume();
        getBridge().getWebView().evaluateJavascript("(function(){try{window.ST&&ST.game&&ST.game.wake&&ST.game.wake()}catch(e){}})()", null);
        androidx.core.view.ViewCompat.requestApplyInsets(getBridge().getWebView());
    }

    /** The page's safe-area tokens (--safe-t/r/b/l, in CSS px) from the window's real cutout and gesture-bar insets, since a
     *  full-screen WebView can report 0 for env(safe-area-inset-*). */
    private void passInsets(android.view.View v, androidx.core.view.WindowInsetsCompat ins) {
        androidx.core.graphics.Insets i = ins.getInsetsIgnoringVisibility(androidx.core.view.WindowInsetsCompat.Type.systemBars() | androidx.core.view.WindowInsetsCompat.Type.displayCutout());
        float d = getResources().getDisplayMetrics().density;
        String js = String.format(java.util.Locale.US, "(function(){var s=document.documentElement.style;s.setProperty('--safe-t','%.1fpx');s.setProperty('--safe-r','%.1fpx');s.setProperty('--safe-b','%.1fpx');s.setProperty('--safe-l','%.1fpx');window.dispatchEvent(new Event('resize'))})()",
            i.top / d, i.right / d, i.bottom / d, i.left / d);
        getBridge().getWebView().evaluateJavascript(js, null);
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
