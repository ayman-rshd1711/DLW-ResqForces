"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaCamera } from "react-icons/fa";
import { MdReport } from "react-icons/md";
import { FaMagnifyingGlassLocation } from "react-icons/fa6";
import CameraModal from "./CameraModal";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

function prettyType(t) {
  if (t === "fire") return "Fire / Smoke";
  if (t === "cardiac_arrest") return "Cardiac Arrest";
  if (t === "not_responding") return "Not Responding";
  if (t === "car_accident") return "Car Accident";
  return "Incident";
}

function prettyRisk(r) {
  if (r === "high") return "High";
  if (r === "medium") return "Medium";
  if (r === "low") return "Low";
  return "Unknown";
}

function riskBadge(risk) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold border";
  if (risk === "high") return `${base} bg-red-50 text-red-700 border-red-200`;
  if (risk === "medium")
    return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  if (risk === "low")
    return `${base} bg-green-50 text-green-700 border-green-200`;
  return `${base} bg-slate-50 text-slate-700 border-slate-200`;
}

function taskPreview(incidentType) {
  if (incidentType === "fire") {
    return [
      "Acknowledge the alert",
      "Share a brief scene update (safe distance)",
      "Support crowd guidance / keep others away",
    ];
  }
  if (incidentType === "cardiac_arrest" || incidentType === "not_responding") {
    return [
      "Acknowledge the alert",
      "Share a brief scene update",
      "Assist with locating AED if available",
    ];
  }
  if (incidentType === "car_accident") {
    return [
      "Acknowledge the alert",
      "Share a brief scene update",
      "Support scene safety and information sharing",
    ];
  }
  return ["Acknowledge the alert", "Share a brief scene update"];
}

function EmergencyPage() {
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [activeAlert, setActiveAlert] = useState(null);
  const [incidentInfo, setIncidentInfo] = useState(null);
  const [loadingIncident, setLoadingIncident] = useState(false);

  // ✅ sound alarm (fixed with ref)
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  function playAlarm() {
    if (!soundEnabledRef.current) return; // always reads latest value
    const audio = new Audio("/alarm.mp3");
    audio.play().catch(() => {});
  }

  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const previewTasks = useMemo(() => {
    return taskPreview(incidentInfo?.incident_type);
  }, [incidentInfo?.incident_type]);

  async function fetchIncident(incidentId) {
    setLoadingIncident(true);
    const { data, error } = await supabase
      .from("incidents")
      .select("id, incident_type, risk_level, lat, lng, created_at")
      .eq("id", incidentId)
      .single();

    setLoadingIncident(false);
    if (error) {
      console.error(error);
      setIncidentInfo(null);
      return;
    }
    setIncidentInfo(data);
  }

  async function acceptAlert() {
    if (!activeAlert) return;

    const { error } = await supabase.rpc("accept_alert_and_assign_tasks", {
      p_alert_id: activeAlert.id,
    });

    if (error) {
      console.error(error);
      return;
    }

    setActiveAlert(null);
    setIncidentInfo(null);
  }

  async function declineAlert() {
    if (!activeAlert) return;

    const { error } = await supabase
      .from("incident_alerts")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", activeAlert.id);

    if (error) {
      console.error(error);
      return;
    }

    setActiveAlert(null);
    setIncidentInfo(null);
  }

  // Realtime listener for alerts
  useEffect(() => {
    let channel;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      // Fetch latest pending alert
      const { data: existing, error: existingErr } = await supabase
        .from("incident_alerts")
        .select("id, incident_id, responder_id, status, created_at")
        .eq("responder_id", user.id)
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!existingErr && existing && existing.length > 0) {
        setActiveAlert(existing[0]);
        playAlarm(); // ✅ sound
        fetchIncident(existing[0].incident_id);
      }

      // Subscribe to new alerts
      channel = supabase
        .channel("rt-incident-alerts")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "incident_alerts" },
          (payload) => {
            const row = payload.new;
            if (row.responder_id === user.id && row.status === "sent") {
              setActiveAlert(row);
              playAlarm(); // ✅ sound
              fetchIncident(row.incident_id);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex flex-col justify-center items-center">
      {/* Alert popup modal */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-black">🚨 Nearby Case Alert</div>
                <div className="mt-1 text-sm text-slate-600">
                  A case near you needs support.
                </div>
              </div>
              {incidentInfo?.risk_level && (
                <span className={riskBadge(incidentInfo.risk_level)}>
                  {prettyRisk(incidentInfo.risk_level)}
                </span>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              {loadingIncident ? (
                <div className="text-sm text-slate-600">Loading case details…</div>
              ) : incidentInfo ? (
                <>
                  <div className="text-sm font-extrabold text-slate-800">
                    {prettyType(incidentInfo.incident_type)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Reported: {new Date(incidentInfo.created_at).toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Location: {incidentInfo.lat?.toFixed?.(4)},{" "}
                    {incidentInfo.lng?.toFixed?.(4)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-600">
                  Case details unavailable (but you can still accept).
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="text-sm font-extrabold text-slate-800">
                If you accept, you’ll be assigned:
              </div>
              <ul className="mt-2 space-y-2">
                {previewTasks.map((t, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white p-3"
                  >
                    <span className="mt-[2px] text-slate-400">•</span>
                    <span className="text-sm text-slate-700">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-slate-500">
                Focus on safety and information sharing. If it seems dangerous,
                call emergency services.
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={declineAlert}
                className="rounded-xl border border-slate-200 bg-white py-2 font-bold"
              >
                Decline
              </button>
              <button
                onClick={acceptAlert}
                className="rounded-xl bg-red-500 py-2 font-bold text-white"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top buttons */}
      <div className="w-[95%] flex justify-end gap-3 mt-6">
        <button
          onClick={() => setSoundEnabled(true)}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold shadow-sm hover:shadow-md"
        >
          {soundEnabled ? "Sound enabled" : "Enable alert sound"}
        </button>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold shadow-sm hover:shadow-md"
        >
          Logout (test)
        </button>
      </div>

      {/* Original UI */}
      <div className="flex w-full flex-row items-center justify-center gap-6 px-4">
        <div
          className="group flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer"
          onClick={() => setIsCameraOpen(true)}
        >
          <div className="mb-2 text-slate-700 transition-colors group-hover:text-blue-500">
            <FaCamera size={50} />
          </div>
          <span className="text-base font-bold uppercase tracking-wide text-slate-600">
            Camera
          </span>
          <span className="text-xs text-slate-400 font-medium">Live Feed</span>
        </div>

        <div className="group flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer">
          <div className="mb-2 text-slate-700 transition-colors group-hover:text-amber-500">
            <MdReport size={55} />
          </div>
          <span className="text-base font-bold uppercase tracking-wide text-slate-600">
            Report
          </span>
          <span className="text-xs text-slate-400 font-medium">File Incident</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mt-16">
        <button
          className="group relative flex h-56 w-56 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.5)] transition-all hover:scale-105 hover:bg-red-600 active:scale-95"
          onClick={() => (window.location.href = "tel:995")}
        >
          <div className="text-center">
            <span className="block text-7xl font-bold tracking-tighter">995</span>
            <span className="mt-1 block text-sm font-semibold uppercase tracking-widest opacity-90">
              Emergency Call
            </span>
            <span className="mt-1 block text-xs opacity-75">(SCDF)</span>
          </div>

          <span className="absolute inset-0 rounded-full border-4 border-red-400 opacity-20 group-hover:animate-ping"></span>
        </button>

        <p className="mt-6 text-base font-semibold text-gray-500 animate-pulse">
          Tap to Call Now
        </p>
      </div>

      <div className="w-[95%] group flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-8 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer mt-12">
        <div className="mb-3 text-slate-700 transition-colors group-hover:text-green-500">
          <FaMagnifyingGlassLocation size={55} />
        </div>
        <span className="text-lg font-bold uppercase tracking-wide text-slate-600">
          AED near me
        </span>
        <span className="text-sm text-slate-400 font-medium italic">
          Find Nearest Device
        </span>
      </div>

      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} />
    </div>
  );
}

export default EmergencyPage;