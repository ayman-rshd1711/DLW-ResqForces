"use client";
import React from "react";
import dynamic from "next/dynamic";

const SingaporeMap = dynamic(() => import("../../ui/SingaporeMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-slate-50 animate-pulse">
      <p className="text-slate-500 font-medium">Loading Map...</p>
    </div>
  ),
});
function page() {
  return (
    <div>
      <div className="flex flex-col items-center justify-start gap-7 w-[90%] border-2 border-slate-200 rounded-2xl mx-auto mt-40 bg-white shadow-xl py-8">
        <SingaporeMap />
      </div>
    </div>
  );
}

export default page;
