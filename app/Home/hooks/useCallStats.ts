"use client";

import { useEffect, useRef, useState } from "react";

export type CallQuality = "excellent" | "good" | "poor" | "reconnecting" | "unknown";

export function useCallStats(
  pc: RTCPeerConnection | null,
  enabled: boolean,
  reconnecting: boolean
) {
  const [quality, setQuality] = useState<CallQuality>("unknown");
  const [statsLabel, setStatsLabel] = useState("");
  const prevRef = useRef<{
    packetsLost?: number;
    packetsReceived?: number;
    bytesReceived?: number;
    timestamp?: number;
  }>({});

  useEffect(() => {
    if (!enabled || !pc) {
      setQuality(reconnecting ? "reconnecting" : "unknown");
      setStatsLabel("");
      return;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const report = await pc.getStats();
        let rtt = 0;
        let packetsLost = 0;
        let packetsReceived = 0;
        let bytesReceived = 0;
        let usingRelay = false;

        report.forEach((stat) => {
          if (stat.type === "candidate-pair" && (stat as RTCIceCandidatePairStats).state === "succeeded") {
            const pair = stat as RTCIceCandidatePairStats & { currentRoundTripTime?: number };
            if (typeof pair.currentRoundTripTime === "number") {
              rtt = pair.currentRoundTripTime * 1000;
            }
            const local = report.get(pair.localCandidateId || "") as { candidateType?: string } | undefined;
            const remote = report.get(pair.remoteCandidateId || "") as { candidateType?: string } | undefined;
            if (
              (local && local.candidateType === "relay") ||
              (remote && remote.candidateType === "relay")
            ) {
              usingRelay = true;
            }
          }
          if (stat.type === "inbound-rtp" && !(stat as { isRemote?: boolean }).isRemote) {
            const inbound = stat as RTCInboundRtpStreamStats;
            packetsLost += inbound.packetsLost || 0;
            packetsReceived += inbound.packetsReceived || 0;
            bytesReceived += inbound.bytesReceived || 0;
          }
        });

        const prev = prevRef.current;
        let lossRate = 0;
        if (prev.packetsReceived != null && prev.packetsLost != null) {
          const dLost = Math.max(0, packetsLost - prev.packetsLost);
          const dRecv = Math.max(0, packetsReceived - prev.packetsReceived);
          const total = dLost + dRecv;
          lossRate = total > 0 ? dLost / total : 0;
        }
        prevRef.current = { packetsLost, packetsReceived, bytesReceived, timestamp: Date.now() };

        if (cancelled) return;
        if (reconnecting) {
          setQuality("reconnecting");
          setStatsLabel("Reconnecting…");
          return;
        }

        let next: CallQuality = "excellent";
        if (lossRate > 0.08 || rtt > 400) next = "poor";
        else if (lossRate > 0.03 || rtt > 200) next = "good";

        setQuality(next);
        const parts = [
          next === "poor" ? "Poor connection" : next === "good" ? "Fair connection" : "Good connection",
          rtt ? `${Math.round(rtt)}ms` : null,
          usingRelay ? "relay" : null,
        ].filter(Boolean);
        setStatsLabel(parts.join(" · "));
      } catch {
        // ignore stats errors
      }
    };

    tick();
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pc, enabled, reconnecting]);

  return { quality, statsLabel };
}
