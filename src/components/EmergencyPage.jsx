"use client";
import React, { useState } from "react";
import { FaCamera } from "react-icons/fa";
import { MdReport } from "react-icons/md";
import { FaMagnifyingGlassLocation } from "react-icons/fa6";
import CameraModal from "./CameraModal";

function EmergencyPage() {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  return (
    <div className="w-full flex flex-col justify-center items-center">
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

        {/* Report Card - Icon 45->55, Text sm->base, 10px->xs */}
        <div className="group flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer">
          <div className="mb-2 text-slate-700 transition-colors group-hover:text-amber-500">
            <MdReport size={55} />
          </div>
          <span className="text-base font-bold uppercase tracking-wide text-slate-600">
            Report
          </span>
          <span className="text-xs text-slate-400 font-medium">
            File Incident
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mt-16">
        {/* The 995 Circular Button - Scaled from h-48/w-48 to h-56/w-56 */}
        <button
          className="group relative flex h-56 w-56 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.5)] transition-all hover:scale-105 hover:bg-red-600 active:scale-95"
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

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
      />
    </div>
  );
}

export default EmergencyPage;
