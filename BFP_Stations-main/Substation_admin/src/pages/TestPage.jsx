import React, { useState, useRef, useEffect } from "react";

export default function TestPage() {
  const [stationId, setStationId] = useState("101");
  const [sinceId, setSinceId] = useState(0);
  const [polling, setPolling] = useState(false);
  const [log, setLog] = useState("");
  const [currentCallerUserId, setCurrentCallerUserId] = useState(null);

  const pcRef = useRef(null);
  const intervalRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const phpBaseUrl =
    import.meta.env.VITE_PHP_BACKEND_URL || "http://127.0.0.1/SE_BFP";
  const defaultStationId = import.meta.env.VITE_STATION_ID || "103";

  const stationClientUrl = `${phpBaseUrl}/station_client.html?stationId=${defaultStationId}`;

  const appendLog = (message) => {
    setLog((prev) => {
      const time = new Date().toLocaleTimeString();
      return prev + `[${time}] ${message}\n`;
    });
  };

  const sendSignal = async (body) => {
    try {
      const res = await fetch(`${phpBaseUrl}/api/webrtc_send_signal.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        appendLog("Error sending signal: " + (data.error || "unknown"));
      } else {
        appendLog(`Signal sent. id=${data.id} type=${body.type}`);
      }
    } catch (err) {
      appendLog("Error sending signal (network): " + err.message);
    }
  };

  const ensurePeerConnection = async () => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (err) {
      appendLog("Error getting local media: " + err.message);
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate || !currentCallerUserId) return;
      appendLog("ICE candidate from station");
      sendSignal({
        from_user_id: null,
        to_user_id: currentCallerUserId,
        to_station_id: parseInt(stationId, 10) || 0,
        type: "ice",
        payload: event.candidate,
      });
    };

    pc.ontrack = (event) => {
      appendLog("Remote track received on station (attaching to audio element)");
      const audioEl = document.getElementById("remoteAudio");
      if (audioEl && event.streams[0]) {
        audioEl.srcObject = event.streams[0];
      } else {
        appendLog("No remote audio element or stream available to attach");
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const handleOfferSignal = async (sig) => {
    try {
      const callerId = sig.from_user_id;
      setCurrentCallerUserId(callerId);
      appendLog("Handling offer from user_id=" + callerId);

      const pc = await ensurePeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      appendLog("Answer created, sending to user");

      await sendSignal({
        from_user_id: null,
        to_user_id: callerId,
        to_station_id: parseInt(stationId, 10) || 0,
        type: "answer",
        payload: answer,
      });
    } catch (err) {
      appendLog("Error handling offer: " + err.message);
    }
  };

  const pollOnce = async () => {
    const sid = parseInt(stationId, 10) || 0;
    if (!sid) {
      appendLog("Invalid station_id");
      return;
    }

    try {
      const url = `${phpBaseUrl}/api/webrtc_poll_signals.php?station_id=${sid}&since_id=${sinceId}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.success) {
        appendLog("Error from server: " + (data.error || "unknown"));
        return;
      }

      if (Array.isArray(data.signals) && data.signals.length > 0) {
        for (const sig of data.signals) {
          if (sig.id > sinceId) {
            setSinceId(sig.id);
          }
          if (sig.type === "offer") {
            await handleOfferSignal(sig);
          }
        }
      }
    } catch (err) {
      appendLog("Fetch error: " + err.message);
    }
  };

  const startPolling = () => {
    if (polling) return;
    setPolling(true);
    appendLog("Polling started");
    pollOnce();
    intervalRef.current = setInterval(pollOnce, 1000);
  };

  const stopPolling = () => {
    if (!polling) return;
    setPolling(false);
    appendLog("Polling stopped");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((sender) => {
          if (sender.track) sender.track.stop();
        });
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", maxWidth: 800 }}>
      <h1>WebRTC Station Voice Console – Substation Admin</h1>
      <p>
        Use the embedded voice console below to answer calls from the
        End-User mobile WebRTC test screen.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <h3>Voice Console (station_client.html)</h3>
        <iframe
          title="Substation Voice Console"
          src={stationClientUrl}
          style={{ width: "100%", height: "420px", border: "1px solid #ccc", borderRadius: "6px" }}
          allow="microphone; autoplay"
        />
      </div>
    </div>
  );
}
