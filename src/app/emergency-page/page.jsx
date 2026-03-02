"use client";
import EmergencyPage from "@/components/EmergencyPage";
import React from "react";
import { useState } from "react";
import ReportModal from "@/components/ReportModal";

function page() {
  return (
    <div>
      <div className="flex flex-col items-center justify-start gap-7 w-[90%] border-2 border-slate-200 rounded-2xl mx-auto mt-40 bg-white shadow-xl py-8">
        <EmergencyPage />
      </div>
    </div>
  );
}

export default page;
