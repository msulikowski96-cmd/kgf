import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { buildMapHtml } from "@/components/map/mapHtml";
import { useMapState } from "@/components/map/useMapState";
import type { MapEvent, RideMapProps } from "@/components/map/mapTypes";
import { DEFAULT_CENTER } from "@shared/fleet";

// Web: the same Leaflet page in an iframe, talking over postMessage.
export function RideMap(props: RideMapProps) {
  const {
    initialCenter,
    initialZoom = 13,
    onCenterChange,
    style,
    testID,
  } = props;
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const state = useMapState(props);
  const onCenter = useRef(onCenterChange);
  onCenter.current = onCenterChange;

  const html = useMemo(
    () => buildMapHtml(initialCenter ?? DEFAULT_CENTER, initialZoom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      let data: { __rideMap?: boolean; msg?: MapEvent };
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!data?.__rideMap || !data.msg) return;
      if (data.msg.type === "ready") setReady(true);
      else if (data.msg.type === "center")
        onCenter.current?.({ lat: data.msg.lat, lng: data.msg.lng });
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ __rideMapState: true, state }),
      "*",
    );
  }, [ready, state]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {React.createElement("iframe", {
        ref: frame,
        srcDoc: html,
        title: "Mapa",
        style: { border: 0, width: "100%", height: "100%", display: "block" },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", backgroundColor: "#0e0e10" },
});
