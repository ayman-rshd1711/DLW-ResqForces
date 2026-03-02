import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MdMyLocation } from "react-icons/md";
import { FaCarCrash, FaHeartbeat, FaQuestionCircle } from "react-icons/fa";
import { GiCampfire } from "react-icons/gi";
import { supabase } from "@/lib/supabaseClient";

const MapWithNoSSR = dynamic(() => import("./ReportMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 text-xs uppercase font-bold tracking-tighter">
      Loading Map...
    </div>
  ),
});

// ✅ incident -> required certs
function requiredCertsForIncident(incidentType) {
  if (incidentType === "fire") return ["FFC", "FSM"];
  if (incidentType === "cardiac_arrest") return ["CPR", "AED"];
  if (incidentType === "unknown") return ["CPR", "AED"];
  if (incidentType === "car_accident") return ["CPR", "AED"];
  return [];
}

function ReportModal({ isOpen, onClose }) {
  const [position, setPosition] = useState([14.5995, 120.9842]);

  // ✅ Must match DB values
  const [selectedType, setSelectedType] = useState("car_accident");

  const [severity, setSeverity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReportSubmit = async () => {
    setIsSubmitting(true);

    const severityMap = { 1: "low", 2: "medium", 3: "high" };
    const severityLabel = severityMap[severity];

    try {
      // 0) Ensure logged in
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("Not logged in");
      const user = userData.user;

      // 1) Insert incident and RETURN the inserted row
      const { data: incident, error: incidentErr } = await supabase
        .from("incidents")
        .insert([
          {
            incident_type: selectedType,
            risk_level: severityLabel,
            lat: position[0],
            lng: position[1],
            reporter_id: user.id,
            status: "open",
          },
        ])
        .select("id, incident_type")
        .single();

      if (incidentErr) throw incidentErr;

      console.log("[Report] Inserted incident:", incident);

      // 2) Determine certs needed
      const neededCerts = requiredCertsForIncident(incident.incident_type);
      console.log("[Report] neededCerts:", neededCerts);

      if (neededCerts.length === 0) {
        console.log(
          "[Report] No cert mapping for incident type; skipping alerts."
        );
        onClose();
        return;
      }

      // 3) Find eligible responders (approved certs)
      const { data: eligible, error: eligErr } = await supabase
        .from("responder_verifications")
        .select("user_id, cert_type, status")
        .in("cert_type", neededCerts)
        .eq("status", "approved");

      if (eligErr) throw eligErr;

      console.log("[Report] eligible rows:", eligible);

      const responderIds = [...new Set((eligible || []).map((r) => r.user_id))];
      console.log("[Report] responderIds:", responderIds);

      // 4) Build alerts (exclude reporter)
      //   const alertsToInsert = responderIds
      //     .filter((rid) => rid && rid !== user.id)
      //     .map((rid) => ({
      //       incident_id: incident.id,
      //       responder_id: rid,
      //       status: "sent",
      //     }));
      // CHANGE IT TO THIS:
      // Add this temporarily to see EVERYONE who is a responder
      const { data: allResponders } = await supabase
        .from("responder_verifications")
        .select("user_id, cert_type, status");

      console.log("DEBUG - Every single responder in DB:", allResponders);
      // 4) Build alerts (Now excluding yourself correctly)
      const alertsToInsert = responderIds
        .filter((rid) => rid !== user.id) // ✅ This prevents YOU from getting your own alert
        .map((rid) => ({
          incident_id: incident.id,
          responder_id: rid,
          status: "sent",
        }));

      console.log("[Report] alertsToInsert (filtered):", alertsToInsert);

      // 5) Insert alerts
      if (alertsToInsert.length > 0) {
        const { error: alertErr } = await supabase
          .from("incident_alerts")
          .insert(alertsToInsert);

        if (alertErr) throw alertErr;

        console.log("[Report] Alerts inserted successfully!");
      } else {
        console.log(
          "[Report] No alerts to insert (no eligible responders or only reporter)."
        );
      }

      onClose();
    } catch (error) {
      alert("Submission Error: " + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error("Location access denied", err)
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      className={`modal mt-16 ${
        isOpen ? "modal-open" : ""
      } bg-slate-900/40 backdrop-blur-sm`}
    >
      <div className="modal-box max-w-3xl h-[70vh] border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {/* 1. LOCATION */}
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
              Location & Time
            </h2>
            <div className="relative mb-3 h-56 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <MapWithNoSSR position={position} setPosition={setPosition} />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 border border-slate-200 px-4 py-1.5 rounded-full text-[11px] font-bold text-blue-600 shadow-md pointer-events-none">
                Current Pin: {position[0].toFixed(4)}, {position[1].toFixed(4)}
              </div>
            </div>

            <button
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((p) =>
                    setPosition([p.coords.latitude, p.coords.longitude])
                  );
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-3 text-sm font-medium text-blue-600 border border-slate-200 hover:bg-slate-100 transition-all"
            >
              <MdMyLocation size={18} /> Re-center to Current Location
            </button>
          </section>

          <div className="my-6 border-t border-slate-100" />

          {/* 2. TYPE */}
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
              Accident Details
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <IncidentType
                icon={<FaCarCrash size={40} />}
                label="Car Crash"
                color="text-blue-500"
                active={selectedType === "car_accident"}
                onClick={() => setSelectedType("car_accident")}
              />

              <IncidentType
                icon={<FaHeartbeat size={40} />}
                label="Cardiac Arrest"
                color="text-orange-500"
                active={selectedType === "cardiac_arrest"}
                onClick={() => setSelectedType("cardiac_arrest")}
              />

              <IncidentType
                icon={<GiCampfire size={40} />}
                label="Fire"
                color="text-red-500"
                active={selectedType === "fire"}
                onClick={() => setSelectedType("fire")}
              />

              <IncidentType
                icon={<FaQuestionCircle size={40} />}
                label="Unknown"
                color="text-indigo-500"
                active={selectedType === "unknown"}
                onClick={() => setSelectedType("unknown")}
              />
            </div>
          </section>

          <div className="my-6 border-t border-slate-100" />

          {/* 3. SEVERITY */}
          <div className="w-full">
            <input
              type="range"
              min="1"
              max="3"
              step="1"
              value={severity}
              onChange={(e) => setSeverity(parseInt(e.target.value))}
              className="range range-info w-full h-2 bg-slate-200"
            />

            <div className="flex justify-between px-2 mt-1 text-[10px] text-slate-300 font-bold">
              <span>|</span>
              <span>|</span>
              <span>|</span>
            </div>

            <div className="flex justify-between px-1 mt-2 text-xs font-black tracking-tighter">
              <span
                className={
                  severity === 1
                    ? "text-emerald-500 scale-110 transition-transform"
                    : "text-slate-400"
                }
              >
                LOW
              </span>
              <span
                className={
                  severity === 2
                    ? "text-amber-500 scale-110 transition-transform"
                    : "text-slate-400"
                }
              >
                MEDIUM
              </span>
              <span
                className={
                  severity === 3
                    ? "text-red-600 scale-110 transition-transform"
                    : "text-slate-400"
                }
              >
                HIGH
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 p-6 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="hover:cursor-pointer flex-1 rounded-xl bg-white border border-slate-200 py-4 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            className="hover:cursor-pointer flex-1 rounded-xl bg-blue-600 py-4 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
            onClick={handleReportSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-md"></span>
            ) : (
              "Submit Report"
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}

const IncidentType = ({ icon, label, color, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-2 transition-all aspect-square ${
      active
        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
    }`}
  >
    <div className={active ? "text-blue-600" : color}>{icon}</div>
    <span
      className={`text-md font-bold uppercase leading-tight text-center ${
        active ? "text-blue-700" : "text-slate-500"
      }`}
    >
      {label}
    </span>
  </button>
);

export default ReportModal;
