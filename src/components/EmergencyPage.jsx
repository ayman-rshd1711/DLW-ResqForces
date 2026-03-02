"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaCamera, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { MdReport, MdLogout } from "react-icons/md";
import { FaMagnifyingGlassLocation } from "react-icons/fa6";
import CameraModal from "./CameraModal";
import ReportModal from "./ReportModal";
import Link from "next/link";
import { useAtom } from "jotai";
import { triggerLiveLocationAtom } from "@/jotai/EmergencyPageAtoms";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// --- Helper Functions ---
function prettyType(t) {
  const types = {
    fire: "Fire / Smoke",
    cardiac_arrest: "Cardiac Arrest",
    not_responding: "Not Responding",
    car_accident: "Car Accident",
  };
  return types[t] || "Incident";
}

function prettyRisk(r) {
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : "Unknown";
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
      "Share scene update (safe distance)",
      "Support crowd guidance",
    ];
  }
  if (incidentType === "cardiac_arrest" || incidentType === "not_responding") {
    return [
      "Acknowledge the alert",
      "Share scene update",
      "Assist with locating AED",
    ];
  }
  if (incidentType === "car_accident") {
    return [
      "Acknowledge the alert",
      "Share scene update",
      "Support scene safety",
    ];
  }
  return ["Acknowledge the alert", "Share a brief scene update"];
}

function EmergencyPage() {
  const router = useRouter();
  const [, setTriggerLiveLocation] = useAtom(triggerLiveLocationAtom);

  // Modal & UI States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Incident & Alert States
  const [activeAlert, setActiveAlert] = useState(null);
  const [incidentInfo, setIncidentInfo] = useState(null);
  const [loadingIncident, setLoadingIncident] = useState(false);

  // Sound Control
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  function playAlarm() {
    if (!soundEnabledRef.current) return;
    const audio = new Audio("/alarm.mp3");
    audio.play().catch((e) => console.error("Audio play failed:", e));
  }

  // --- Actions ---
  async function logout() {
    await supabase.auth.signOut();
    localStorage.clear();
    router.push("/");
  }

  async function fetchIncident(incidentId) {
    setLoadingIncident(true);
    const { data, error } = await supabase
      .from("incidents")
      .select("id, incident_type, risk_level, lat, lng, created_at")
      .eq("id", incidentId)
      .single();

    setLoadingIncident(false);
    if (!error) setIncidentInfo(data);
  }

  async function acceptAlert() {
    if (!activeAlert) return;
    const { error } = await supabase.rpc("accept_alert_and_assign_tasks", {
      p_alert_id: activeAlert.id,
    });
    if (!error) {
      setActiveAlert(null);
      setIncidentInfo(null);
      // Navigate to home-page to see the map/tasks
      router.push("/home-page");
    }
  }

  async function declineAlert() {
    if (!activeAlert) return;
    await supabase
      .from("incident_alerts")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", activeAlert.id);
    setActiveAlert(null);
    setIncidentInfo(null);
  }

  const previewTasks = useMemo(() => {
    return taskPreview(incidentInfo?.incident_type);
  }, [incidentInfo?.incident_type]);

  // --- Realtime Subscription ---
  useEffect(() => {
    let channel;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Check for existing pending alert
      const { data: existing } = await supabase
        .from("incident_alerts")
        .select("*")
        .eq("responder_id", user.id)
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing?.length > 0) {
        setActiveAlert(existing[0]);
        playAlarm();
        fetchIncident(existing[0].incident_id);
      }

      // 2. Subscribe to new alerts
      //   channel = supabase
      //     .channel("rt-incident-alerts")
      //     .on(
      //       "postgres_changes",
      //       { event: "INSERT", schema: "public", table: "incident_alerts" },
      //       (payload) => {
      //         const row = payload.new;
      //         if (row.responder_id === user.id && row.status === "sent") {
      //           setActiveAlert(row);
      //           playAlarm();
      //           fetchIncident(row.incident_id);
      //         }
      //       }
      //     )
      //     .subscribe();
      // Change lines 142-150 to this for testing:

      channel = supabase
        .channel("rt-incident-alerts")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "incident_alerts" },
          (payload) => {
            const row = payload.new;

            // ✅ ONLY show the alert if the responder_id matches the person logged in
            if (row.responder_id === user.id && row.status === "sent") {
              setActiveAlert(row);
              playAlarm();
              fetchIncident(row.incident_id);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="w-full flex flex-col justify-center items-center pb-10">
      {/* 1. Alert Popup Modal */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl animate-in zoom-in-95 duration-200">
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
                <div className="text-sm text-slate-600 animate-pulse">
                  Loading case details...
                </div>
              ) : incidentInfo ? (
                <>
                  <div className="text-sm font-extrabold text-slate-800">
                    {prettyType(incidentInfo.incident_type)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Reported:{" "}
                    {new Date(incidentInfo.created_at).toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 font-mono">
                    Location: {incidentInfo.lat?.toFixed(4)},{" "}
                    {incidentInfo.lng?.toFixed(4)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-600">
                  Incident details unavailable.
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="text-sm font-extrabold text-slate-800">
                Assigned Tasks:
              </div>
              <ul className="mt-2 space-y-2">
                {previewTasks.map((t, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-700"
                  >
                    <span className="text-red-500">•</span> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={declineAlert}
                className="rounded-xl border border-slate-200 bg-white py-3 font-bold text-slate-500 active:scale-95 transition-all"
              >
                Decline
              </button>
              <button
                onClick={acceptAlert}
                className="rounded-xl bg-red-500 py-3 font-bold text-white shadow-lg active:scale-95 transition-all"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Utility Buttons */}
      <div className="w-[95%] flex justify-end gap-3 mt-6 mb-6">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold shadow-sm hover:shadow-md"
        >
          {soundEnabled ? (
            <FaVolumeUp className="text-green-500" />
          ) : (
            <FaVolumeMute className="text-slate-400" />
          )}
          {soundEnabled ? "Sound Enabled" : "Enable Alert Sound"}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-red-600 font-semibold shadow-sm hover:shadow-md"
        >
          <MdLogout /> Logout
        </button>
      </div>

      {/* 3. Action Cards */}
      <div className="flex w-full flex-row items-center justify-center gap-6 px-4">
        <div
          className="group flex flex-1 flex-col items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 p-6 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          onClick={() => setIsCameraOpen(true)}
        >
          <FaCamera
            size={50}
            className="mb-2 text-slate-700 group-hover:text-blue-500 transition-colors"
          />
          <span className="text-base font-bold uppercase tracking-wide text-slate-600">
            Camera
          </span>
          <span className="text-xs text-slate-400 font-medium">Live Feed</span>
        </div>

        <div
          className="group flex flex-1 flex-col items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600 p-6 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          onClick={() => setIsReportModalOpen(true)}
        >
          <MdReport
            size={55}
            className="mb-2 text-slate-700 group-hover:text-amber-500 transition-colors"
          />
          <span className="text-base font-bold uppercase tracking-wide text-slate-600">
            Report
          </span>
          <span className="text-xs text-slate-400 font-medium">
            File Incident
          </span>
        </div>
      </div>

      {/* 4. Emergency Call Button */}
      <div className="flex flex-col items-center justify-center mt-16">
        <button
          className="group relative flex h-56 w-56 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.5)] transition-all hover:scale-105 active:scale-95"
          onClick={() => (window.location.href = "tel:995")}
        >
          <div className="text-center">
            <span className="block text-7xl font-bold tracking-tighter">
              995
            </span>
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

      {/* 5. AED Locator Card */}
      <div className="w-full mt-12 px-4">
        <Link href="/home-page" onClick={() => setTriggerLiveLocation(true)}>
          <div className="w-full max-w-[95%] m-auto group flex flex-col items-center justify-center rounded-2xl border border-green-100 bg-green-200 p-8 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer">
            <FaMagnifyingGlassLocation
              size={55}
              className="mb-3 text-slate-700 group-hover:text-violet-500 transition-colors"
            />
            <span className="text-lg font-bold uppercase tracking-wide text-slate-600">
              AED near me
            </span>
            <span className="text-sm text-slate-400 font-medium italic">
              Find Nearest Device
            </span>
          </div>
        </Link>
      </div>

      {/* Modals */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
      />
    </div>
  );
}

export default EmergencyPage;
