import DashboardShell from '@/components/DashboardShell';
import {
  getAdsRunningRows,
  getCompactCampaignRows,
  getWeeklyReportResponse,
} from '@/lib/server/reportSheetCache';

export default async function Home() {
  const [
    initialWeeklyReportResponse,
    initialCampaignWeeklyData,
    initialAdsRunningData,
  ] = await Promise.all([
    getWeeklyReportResponse({
      granularity: 'group',
      selectedGroup: 'all',
      selectedPmcat: 'all',
      selectedMcat: 'all',
    }),
    getCompactCampaignRows('weekly'),
    getAdsRunningRows(),
  ]);

  // dashboard shell will handle the case when the data is not available and show skeletons

  return (
    <DashboardShell
      initialWeeklyReportData={initialWeeklyReportResponse.data}
      initialCampaignWeeklyData={initialCampaignWeeklyData}
      initialAdsRunningData={initialAdsRunningData}
    />
  );
}
