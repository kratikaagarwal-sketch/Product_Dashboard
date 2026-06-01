import DashboardShell from '@/components/DashboardShell';
import { getWeeklyReportResponse } from '@/lib/server/reportSheetCache';

export default async function Home() {
  const initialWeeklyReportResponse = await getWeeklyReportResponse({
    granularity: 'group',
    selectedGroup: 'all',
    selectedPmcat: 'all',
    selectedMcat: 'all',
  });

  return <DashboardShell initialWeeklyReportData={initialWeeklyReportResponse.data} />;
}
