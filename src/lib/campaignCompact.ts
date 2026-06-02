export const CAMPAIGN_STRING_KEYS = [
  'week_start_date',
  'mcat_name',
  'group_name',
  'pmcat_name',
] as const;

export const CAMPAIGN_NUMBER_KEYS = [
  'bl_sold_approved',
  'bl_approved',
  'bl_txn_approved',
  'blni',
  'enq_approved',
  'calls_approved',
  'unq_purchaser',
  'fenq_bl_senders',
  'intent_bl_senders',
  'direct_bl_senders',
  'flpns_bl_senders',
  'whatsapp_bl_senders',
  'total_cost_inr',
  'total_clicks',
  'total_impressions',
  'total_conversions',
] as const;

type CampaignStringKey = (typeof CAMPAIGN_STRING_KEYS)[number];
type CampaignNumberKey = (typeof CAMPAIGN_NUMBER_KEYS)[number];

export type CampaignRawRow = Record<CampaignStringKey, string> & Record<CampaignNumberKey, number>;

export type CompactCampaignRowsPayload = {
  format: 'compact-campaign-rows';
  version: 1;
  stringKeys: typeof CAMPAIGN_STRING_KEYS;
  numberKeys: typeof CAMPAIGN_NUMBER_KEYS;
  dictionaries: Record<CampaignStringKey, string[]>;
  rows: number[][];
  source?: {
    period: 'daily' | 'weekly' | 'monthly';
    mtimeMs: number | null;
    size: number | null;
  };
};

export const encodeCompactCampaignRows = (
  rows: CampaignRawRow[],
  source?: CompactCampaignRowsPayload['source'],
): CompactCampaignRowsPayload => {
  const dictionaries = Object.fromEntries(
    CAMPAIGN_STRING_KEYS.map(key => [key, [] as string[]]),
  ) as Record<CampaignStringKey, string[]>;

  const dictionaryIndexes = Object.fromEntries(
    CAMPAIGN_STRING_KEYS.map(key => [key, new Map<string, number>()]),
  ) as Record<CampaignStringKey, Map<string, number>>;

  const getDictionaryIndex = (key: CampaignStringKey, rawValue: unknown) => {
    const value = String(rawValue ?? '');
    const index = dictionaryIndexes[key].get(value);
    if (index !== undefined) return index;

    const nextIndex = dictionaries[key].length;
    dictionaryIndexes[key].set(value, nextIndex);
    dictionaries[key].push(value);
    return nextIndex;
  };

  return {
    format: 'compact-campaign-rows',
    version: 1,
    stringKeys: CAMPAIGN_STRING_KEYS,
    numberKeys: CAMPAIGN_NUMBER_KEYS,
    dictionaries,
    rows: rows.map(row => [
      ...CAMPAIGN_STRING_KEYS.map(key => getDictionaryIndex(key, row[key])),
      ...CAMPAIGN_NUMBER_KEYS.map(key => Number(row[key] ?? 0)),
    ]),
    source,
  };
};

export const isCompactCampaignRowsPayload = (
  value: unknown,
): value is CompactCampaignRowsPayload => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { format?: unknown }).format === 'compact-campaign-rows' &&
      (value as { version?: unknown }).version === 1 &&
      Array.isArray((value as { rows?: unknown }).rows),
  );
};

export const decodeCompactCampaignRows = (
  payload: CompactCampaignRowsPayload,
): CampaignRawRow[] => {
  const stringKeyCount = CAMPAIGN_STRING_KEYS.length;

  return payload.rows.map(tuple => {
    const row = {} as CampaignRawRow;

    CAMPAIGN_STRING_KEYS.forEach((key, index) => {
      row[key] = payload.dictionaries[key][tuple[index]] ?? '';
    });

    CAMPAIGN_NUMBER_KEYS.forEach((key, index) => {
      row[key] = tuple[stringKeyCount + index] ?? 0;
    });

    return row;
  });
};

export const decodeCampaignRowsResponse = (
  value: CampaignRawRow[] | CompactCampaignRowsPayload | null,
) => {
  if (!value) return null;
  if (isCompactCampaignRowsPayload(value)) return decodeCompactCampaignRows(value);
  return value;
};
