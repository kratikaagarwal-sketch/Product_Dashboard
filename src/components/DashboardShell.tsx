"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import OverviewTab from "@/components/tabs/OverviewTab";
import GoogleAdsTab from "@/components/tabs/GoogleAdsTab";
import HygieneTab from "@/components/tabs/HygieneTab";
import McatPauseTab from "@/components/tabs/McatPauseTab";
import CategoryDiversityTab from "@/components/tabs/CategoryDiversityTab";
import AiInsightsTab from "@/components/tabs/AiInsightsTab";
import BlTab from "@/components/tabs/BlTab";
import TrafficEnquiryTab from "@/components/tabs/TrafficEnquiryTab";
import DailyCampaignTab from "@/components/tabs/DailyCampaignTab";
import WeeklyReportTab from "@/components/tabs/WeeklyReportTab";
import { prefetchCachedApiData } from "@/lib/clientApiCache";

type WeeklyReportResponse = React.ComponentProps<typeof WeeklyReportTab>['initialData'];

type DashboardShellProps = {
  initialWeeklyReportData?: NonNullable<WeeklyReportResponse>;
};

export default function DashboardShell({ initialWeeklyReportData }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState("weekly_report");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<string[]>(["weekly_report"]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960) {
        setIsSidebarOpen(false);
        document.body.style.overflow = "";
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 960) {
      document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    setVisitedTabs(prev => (prev.includes(activeTab) ? prev : [...prev, activeTab]));
  }, [activeTab]);

  useEffect(() => {
    prefetchCachedApiData<any[]>(`daily-campaign:weekly:0`, `/api/daily-campaign?period=weekly`, 5 * 60 * 1000);
    prefetchCachedApiData<any[]>('ads-running-mcats', '/api/ads-running-mcats', 5 * 60 * 1000);
  }, []);

  return (
    <div className="layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="main">
        <Topbar activeTab={activeTab} onMenuClick={() => setIsSidebarOpen(true)} />
        
        <div className="cnt">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "google" && <GoogleAdsTab />}
          {activeTab === "bl" && <BlTab />}
          {activeTab === "traffic_enquiry" && <TrafficEnquiryTab />}
          {activeTab === "hygiene" && <HygieneTab />}
          {activeTab === "mcat" && <McatPauseTab />}
          {activeTab === "diversity" && <CategoryDiversityTab />}
          {activeTab === "ai" && <AiInsightsTab />}
          {visitedTabs.includes("daily_campaign") && (
            <div style={{ display: activeTab === "daily_campaign" ? "block" : "none" }}>
              <DailyCampaignTab />
            </div>
          )}
          {visitedTabs.includes("weekly_report") && (
            <div style={{ display: activeTab === "weekly_report" ? "block" : "none" }}>
              <WeeklyReportTab initialData={initialWeeklyReportData} />
            </div>
          )}
          
          {!["overview", "google", "bl", "traffic_enquiry", "hygiene", "mcat", "daily_campaign", "weekly_report", "diversity", "ai"].includes(activeTab) && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              <h3>Module under construction</h3>
              <p>Migrating the "{activeTab}" module to Next.js structure...</p>
            </div>
          )}
        </div>
      </main>

      <div className="modal-overlay" id="global-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h3 id="modal-title">Intelligence Detail</h3>
            <button className="close-btn" onClick={() => document.getElementById('global-modal')?.classList.remove('show')}>&times;</button>
          </div>
          <div className="modal-body" id="modal-body">
          </div>
        </div>
      </div>
    </div>
  );
}
