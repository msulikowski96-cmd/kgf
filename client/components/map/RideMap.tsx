import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { buildMapHtml } from "@/components/map/mapHtml";
import { useMapState } from "@/components/map/useMapState";
import type { MapEvent, RideMapProps } from "@/components/map/mapTypes";
import { DEFAULT_CENTER } from "@shared/fleet";

// Native: Leaflet runs inside a WebView, so no map API key is needed.
export function RideMap(props: RideMapProps) {
  const {
    initialCenter,
    initialZoom = 13,
    onCenterChange,
    style,
    testID,
  } = props;
  const webview = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const state = useMapState(props);
  const onCenter = useRef(onCenterChange);
  onCenter.current = onCenterChange;

  // The page is built once; later changes travel as messages
  const html = useMemo(
    () => buildMapHtml(initialCenter ?? DEFAULT_CENTER, initialZoom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!ready) return;
    webview.current?.injectJavaScript(
      `window.__setMapState && window.__setMapState(${JSON.stringify(state)}); true;`,
    );
  }, [ready, state]);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: MapEvent;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "ready") setReady(true);
    else if (msg.type === "center")
      onCenter.current?.({ lat: msg.lat, lng: msg.lng });
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <WebView
        ref={webview}
        source={{ html, baseUrl: "https://localhost/" }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        style={styles.webview}
        containerStyle={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", backgroundColor: "#0e0e10" },
  webview: { flex: 1, backgroundColor: "#0e0e10" },
});
