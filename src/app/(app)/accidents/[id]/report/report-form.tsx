"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitFinalReport } from "@/lib/actions/reports";

export function ReportForm({ accidentId, initialData }: { accidentId: string, initialData: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [isDraft, setIsDraft] = useState(false);
  const [isPending, startTransition] = useTransition();

  const tabs = [
    { id: "general", label: "General Information" },
    { id: "conditions", label: "Road & Weather" },
    { id: "reconstruction", label: "Crash Reconstruction" },
    { id: "vehicles", label: "Vehicle Details" },
  ];

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("accidentId", accidentId);
    formData.append("isDraft", isDraft.toString());
    
    startTransition(async () => {
      try {
        await submitFinalReport(formData);
      } catch (err: any) {
        alert(err.message || err);
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between border-b border-forest-100 pb-6">
        <div>
          <p className="id-tag text-forest-400">CASE {accidentId.slice(0, 8).toUpperCase()}</p>
          <h1 className="mt-2 text-3xl font-bold text-forest-900 tracking-tight">Final Accident Report</h1>
          <p className="mt-2 text-forest-500 max-w-2xl">
            Complete the final inspection report. This information will be compiled into the official .docx document.
          </p>
        </div>
        <a 
          href={`/api/export-docx?id=${accidentId}`}
          className="btn-secondary flex items-center gap-2 bg-white shadow-sm border border-forest-200 inline-flex"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export Draft .docx
        </a>
      </div>

      <div className="flex space-x-1 p-1 bg-forest-50/50 rounded-xl overflow-x-auto border border-forest-100/50 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ease-out whitespace-nowrap
              ${activeTab === tab.id 
                ? "bg-white text-forest-900 shadow-sm ring-1 ring-black/5 scale-100" 
                : "text-forest-600 hover:bg-forest-100/50 hover:text-forest-800 scale-95 hover:scale-100"}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleFormSubmit} className="bg-white rounded-2xl shadow-sm border border-forest-100 p-8 transition-all duration-300">
        
        {/* GENERAL TAB */}
        <div className={activeTab === "general" ? "block space-y-6 animate-in slide-in-from-right-4 fade-in duration-500" : "hidden"}>
          <h2 className="text-xl font-semibold text-forest-900 border-b border-forest-50 pb-2">Report Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-forest-700">Recipient Office</label>
              <input type="text" name="recipientOffice" defaultValue={initialData.recipientOffice} placeholder="e.g. KAKAMEGA V.I.C" className="w-full px-4 py-2.5 rounded-lg border border-forest-200 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-forest-700">Subject Line</label>
              <input type="text" name="subjectLine" defaultValue={initialData.subjectLine} placeholder="e.g. FATAL ROAD TRAFFIC ACCIDENT..." className="w-full px-4 py-2.5 rounded-lg border border-forest-200 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* CONDITIONS TAB */}
        <div className={activeTab === "conditions" ? "block space-y-6 animate-in slide-in-from-right-4 fade-in duration-500" : "hidden"}>
          <h2 className="text-xl font-semibold text-forest-900 border-b border-forest-50 pb-2">Road, Weather & Location Conditions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-forest-700">Road Condition</label>
              <textarea name="roadCondition" defaultValue={initialData.roadCondition} rows={3} placeholder="Describe road condition, carriageway type, lane markings, surface defects, gradient, etc." className="w-full px-4 py-2.5 rounded-lg border border-forest-200 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 outline-none transition-all resize-y"></textarea>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-forest-700">Traffic</label>
              <textarea name="trafficCondition" defaultValue={initialData.trafficCondition} rows={2} placeholder="Describe traffic conditions at time of crash" className="w-full px-4 py-2.5 rounded-lg border border-forest-200 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 outline-none transition-all resize-y"></textarea>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-forest-700">Weather</label>
              <input type="text" name="weather" defaultValue={initialData.weather} placeholder="Weather condition at time of crash" className="w-full px-4 py-2.5 rounded-lg border border-forest-200 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-forest-700">Visibility</label>
              <input type="text" name="visibility" defaultValue={initialData.visibility} placeholder="Visibility condition at time of crash" className="w-full px-4 py-2.5 rounded-lg border border-forest-200 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* RECONSTRUCTION TAB */}
        <div className={activeTab === "reconstruction" ? "block space-y-6 animate-in slide-in-from-right-4 fade-in duration-500" : "hidden"}>
          <h2 className="text-xl font-semibold text-forest-900 border-b border-forest-50 pb-2">Crash Reconstruction</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-forest-700">Reconstruction Narrative</label>
              <textarea 
                name="reconstructionNarrative"
                rows={5} 
                defaultValue={initialData.reconstructionNarrative}
                className="w-full px-4 py-3 rounded-lg border border-forest-200 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 outline-none transition-all resize-y"
                placeholder="Describe how the crash unfolded based on physical evidence..."
              ></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-forest-700">Point of Impact</label>
                <input type="text" name="pointOfImpact" defaultValue={initialData.pointOfImpact} placeholder="e.g. Front Right Fender" className="w-full px-4 py-2.5 rounded-lg border border-forest-200 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-forest-700">Probable Cause</label>
                <select name="causeCode" defaultValue={initialData.causeCode} className="w-full px-4 py-2.5 rounded-lg border border-forest-200 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 outline-none transition-all bg-white">
                  <option>Speeding</option>
                  <option>Improper Overtaking</option>
                  <option>Mechanical Failure</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* VEHICLES TAB */}
        <div className={activeTab === "vehicles" ? "block space-y-6 animate-in slide-in-from-right-4 fade-in duration-500" : "hidden"}>
          <h2 className="text-xl font-semibold text-forest-900 border-b border-forest-50 pb-2">Vehicle Specifics</h2>
          <div className="p-6 border border-dashed border-forest-300 rounded-xl bg-forest-50/50 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-forest-100">
              <svg className="w-6 h-6 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>
            <div>
              <p className="font-medium text-forest-900">Vehicle details will be dynamically loaded here</p>
              <p className="text-sm text-forest-500">Includes driver info, insurance, and damages per vehicle.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-forest-100 flex justify-end gap-4">
          <button 
            type="submit" 
            disabled={isPending}
            onClick={() => setIsDraft(true)}
            className="px-6 py-2.5 text-forest-700 font-medium hover:bg-forest-50 rounded-lg transition-colors"
          >
            Save Draft
          </button>
          <button 
            type="submit" 
            disabled={isPending}
            onClick={() => setIsDraft(false)}
            className="px-8 py-2.5 bg-forest-800 hover:bg-forest-900 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPending && !isDraft ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Saving...
              </>
            ) : "Submit Final Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
