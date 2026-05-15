"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import OverviewTab from "@/components/tabs/OverviewTab";
import CampaignDetailTab from "@/components/tabs/CampaignDetailTab";
import GoogleAdsTab from "@/components/tabs/GoogleAdsTab";
import HygieneTab from "@/components/tabs/HygieneTab";
import McatPauseTab from "@/components/tabs/McatPauseTab";
import CategoryDiversityTab from "@/components/tabs/CategoryDiversityTab";
import McatMasterTab from "@/components/tabs/McatMasterTab";
import AiInsightsTab from "@/components/tabs/AiInsightsTab";
import BlTab from "@/components/tabs/BlTab";
import TrafficEnquiryTab from "@/components/tabs/TrafficEnquiryTab";
import McatWeeklyPerformanceTab from "@/components/tabs/McatWeeklyPerformanceTab";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main">
        <Topbar activeTab={activeTab} />
        
        <div className="cnt">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "google" && <GoogleAdsTab />}
          {activeTab === "bl" && <BlTab />}
          {activeTab === "traffic_enquiry" && <TrafficEnquiryTab />}
          {activeTab === "campaign" && <CampaignDetailTab />}
          {activeTab === "hygiene" && <HygieneTab />}
          {activeTab === "mcat" && <McatPauseTab />}
          {activeTab === "mcat_weekly" && <McatWeeklyPerformanceTab />}
          {activeTab === "diversity" && <CategoryDiversityTab />}
          {activeTab === "master" && <McatMasterTab />}
          {activeTab === "ai" && <AiInsightsTab />}
          
          {/* Default view for unimplemented tabs */}
          {!["overview", "google", "bl", "traffic_enquiry", "campaign", "hygiene", "mcat", "mcat_weekly", "diversity", "master", "ai"].includes(activeTab) && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>🚧</div>
              <h3>Module under construction</h3>
              <p>Migrating the "{activeTab}" module to Next.js structure...</p>
            </div>
          )}
        </div>
      </main>

      {/* Shared Modal Overlay */}
      <div className="modal-overlay" id="global-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h3 id="modal-title">Intelligence Detail</h3>
            <button className="close-btn" onClick={() => document.getElementById('global-modal')?.classList.remove('show')}>&times;</button>
          </div>
          <div className="modal-body" id="modal-body">
            {/* Modal content injected here */}
          </div>
        </div>
      </div>
    </div>
  );
}
