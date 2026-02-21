import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type TimeGrouping = 'minute' | 'hour' | 'day' | 'week';
export type ChartView = 'time' | 'distribution';
export type DateRange = '7' | '30' | '90' | 'all';

const DEFAULT_DATE_RANGE: DateRange = '30';
const DEFAULT_GROUPING: TimeGrouping = 'day';
const DEFAULT_CHART_VIEW: ChartView = 'time';
const DEFAULT_CHART_TYPE = 'bar';
export const ANALYTICS_FILTERS_SESSION_KEY = 'analyticsFilters';

function readFiltersFromSearchParams(searchParams: URLSearchParams) {
  const dateRange = searchParams.get('dateRange') as DateRange | null;
  const grouping = searchParams.get('grouping') as TimeGrouping | null;
  const classification = searchParams.get('classification');
  const view = searchParams.get('view') as ChartView | null;
  const chartType = searchParams.get('chartType') as 'bar' | 'line' | null;
  const stacked = searchParams.get('stacked');
  const visible = searchParams.get('visible');

  return {
    dateRange:
      dateRange && ['7', '30', '90', 'all'].includes(dateRange)
        ? dateRange
        : DEFAULT_DATE_RANGE,
    grouping:
      grouping && ['minute', 'hour', 'day', 'week'].includes(grouping)
        ? grouping
        : DEFAULT_GROUPING,
    classificationFilter: classification ?? 'all',
    chartView:
      view && (view === 'time' || view === 'distribution')
        ? view
        : DEFAULT_CHART_VIEW,
    chartType:
      chartType && (chartType === 'bar' || chartType === 'line')
        ? chartType
        : DEFAULT_CHART_TYPE,
    stacked: stacked !== 'false',
    visibleClassifications: visible
      ? new Set(visible.split(',').filter(Boolean))
      : new Set<string>(),
  };
}

export function useAnalyticsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const skipSyncFromUrlRef = useRef(false);

  const [grouping, setGrouping] = useState<TimeGrouping>(DEFAULT_GROUPING);
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [chartView, setChartView] = useState<ChartView>(DEFAULT_CHART_VIEW);
  const [chartType, setChartType] = useState<'bar' | 'line'>(DEFAULT_CHART_TYPE);
  const [visibleClassifications, setVisibleClassifications] = useState<
    Set<string>
  >(new Set());
  const [stacked, setStacked] = useState(true);

  useEffect(() => {
    if (skipSyncFromUrlRef.current) {
      skipSyncFromUrlRef.current = false;
      return;
    }
    const filters = readFiltersFromSearchParams(searchParams);
    setDateRange(filters.dateRange);
    setGrouping(filters.grouping);
    setClassificationFilter(filters.classificationFilter);
    setChartView(filters.chartView);
    setChartType(filters.chartType);
    setStacked(filters.stacked);
    setVisibleClassifications(filters.visibleClassifications);
  }, [searchParams]);

  useEffect(() => {
    skipSyncFromUrlRef.current = true;
    const next = new URLSearchParams();
    if (dateRange !== DEFAULT_DATE_RANGE) next.set('dateRange', dateRange);
    if (grouping !== DEFAULT_GROUPING) next.set('grouping', grouping);
    if (classificationFilter !== 'all')
      next.set('classification', classificationFilter);
    if (chartView !== DEFAULT_CHART_VIEW) next.set('view', chartView);
    if (chartType !== DEFAULT_CHART_TYPE) next.set('chartType', chartType);
    if (!stacked) next.set('stacked', 'false');
    if (visibleClassifications.size > 0)
      next.set('visible', Array.from(visibleClassifications).sort().join(','));
    setSearchParams(next, { replace: true });
    try {
      const qs = next.toString();
      if (qs) {
        sessionStorage.setItem(ANALYTICS_FILTERS_SESSION_KEY, qs);
      } else {
        sessionStorage.removeItem(ANALYTICS_FILTERS_SESSION_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [
    dateRange,
    grouping,
    classificationFilter,
    chartView,
    chartType,
    stacked,
    visibleClassifications,
    setSearchParams,
  ]);

  const toggleVisibleClassification = (cls: string) => {
    setVisibleClassifications(prev => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  };

  return {
    dateRange,
    setDateRange,
    grouping,
    setGrouping,
    classificationFilter,
    setClassificationFilter,
    chartView,
    setChartView,
    chartType,
    setChartType,
    stacked,
    setStacked,
    visibleClassifications,
    setVisibleClassifications,
    toggleVisibleClassification,
  };
}
