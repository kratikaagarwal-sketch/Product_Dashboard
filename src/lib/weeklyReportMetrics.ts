export type WeeklyMetric = {
  section: string;
  key: string;
  label: string;
  type: 'number' | 'currency' | 'percent' | 'na';
};

export const WEEKLY_REPORT_METRICS: WeeklyMetric[] = [
  { section: 'summary', key: 'bl_approved', label: 'BL Approved', type: 'number' },
  { section: 'summary', key: 'cost_per_bl', label: 'Cost/BL Approved', type: 'currency' },
  { section: 'summary', key: 'cost_per_txn', label: 'Cost/Transaction', type: 'currency' },
  { section: 'summary', key: 'txn_pct', label: 'Transaction %', type: 'percent' },
  { section: 'summary', key: 'blni_txn_pct', label: 'BLNI/Transaction %', type: 'percent' },
  { section: 'summary', key: 'total_cost', label: 'Total Cost', type: 'currency' },
  { section: 'summary', key: 'pmcat_div_25', label: 'PMCAT Diversity (>= 25 BL)', type: 'percent' },
  { section: 'summary', key: 'mcat_div_10', label: 'MCAT Diversity (>= 10 BL)', type: 'percent' },

  { section: 'Google Adwords Report', key: 'impressions', label: 'Google Ads Impression', type: 'number' },
  { section: 'Google Adwords Report', key: 'clicks', label: 'Google Ads Clicks', type: 'number' },
  { section: 'Google Adwords Report', key: 'ctr', label: 'CTR', type: 'percent' },
  { section: 'Google Adwords Report', key: 'cpc', label: 'Average CPC', type: 'currency' },
  { section: 'Google Adwords Report', key: 'total_cost', label: 'Total Cost', type: 'currency' },
  { section: 'Google Adwords Report', key: 'conversions', label: 'Google Ads Conversion', type: 'number' },
  { section: 'Google Adwords Report', key: 'cost_per_conv', label: 'Cost/Conversion', type: 'currency' },

  { section: 'DB Report', key: 'cost_per_bl', label: 'Cost / BL Approved', type: 'currency' },
  { section: 'DB Report', key: 'cost_per_txn', label: 'Cost / Transaction', type: 'currency' },
  { section: 'DB Report', key: 'total_req_approved', label: 'Total requirement Approved', type: 'number' },
  { section: 'DB Report', key: 'total_calls', label: 'Total calls', type: 'number' },
  { section: 'DB Report', key: 'enq_approved', label: 'Total Enquiry approved', type: 'number' },
  { section: 'DB Report', key: 'bl_approved', label: 'BL Approved', type: 'number' },
  { section: 'DB Report', key: 'bl_approved_sender', label: 'BL Approved (Sender)', type: 'number' },
  { section: 'DB Report', key: 'transactions', label: 'Transactions', type: 'number' },
  { section: 'DB Report', key: 'txn_pct', label: 'Transactions (Approved) %', type: 'percent' },
  { section: 'DB Report', key: 'unique_sold', label: 'Unique Sold', type: 'number' },
  { section: 'DB Report', key: 'bl_sold_pct', label: 'Unique Sold /Approved %', type: 'percent' },
  { section: 'DB Report', key: 'blni', label: 'BLNI', type: 'number' },
  { section: 'DB Report', key: 'blni_appr_pct', label: 'BLNI/ Approved %', type: 'percent' },
  { section: 'DB Report', key: 'blni_txn_pct', label: 'BLNI/ Transaction %', type: 'percent' },
  { section: 'DB Report', key: 'unique_purchaser', label: 'Unique Purchaser', type: 'number' },

  { section: 'Total PMCATs', key: 'pmcat_count', label: 'PMCAT Count (Ad running)', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_div_25', label: 'Total PMCATs with >25 BLs', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_cov_25', label: 'Coverage % (PMCATs with >25 BLs)', type: 'percent' },
  { section: 'Total PMCATs', key: 'pmcat_0_5', label: '0 to <5 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_5_25', label: '5 to <25 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_25_100', label: '25 to <100 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_100_200', label: '100 to <200 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_200_400', label: '200 to <400 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_400_plus', label: '>= 400 BL', type: 'number' },

  { section: 'Hygiene report', key: 'unq_prod_count', label: 'Unique Product Count (Eligible Only)', type: 'na' },
  { section: 'Hygiene report', key: 'mcat_0_clicks', label: '0 Clicks', type: 'number' },
  { section: 'Hygiene report', key: 'mcat_1_10_clicks', label: '1-10 Clicks', type: 'number' },
  { section: 'Hygiene report', key: 'mcat_gt_10_clicks', label: '>10 Clicks', type: 'number' },
];
