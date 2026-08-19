import React, { useState, useMemo } from 'react';
import { LineChart, BarChart, SparkLineChart, SparkBarChart, MeterChart, Toggle } from '../../../sail';

// --- Sample Data Generators ---

function timeSeries(days, base, variance, startDate = new Date(2023, 6, 1)) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i * Math.round(365 / days));
    return { date: d, amount: Math.round(base + Math.sin(i / 4) * variance + (Math.random() - 0.5) * variance * 0.3) };
  });
}

// --- Chart Definitions ---

const LINE_CHARTS = [
  {
    id: 'basic',
    label: 'Basic line',
    render: () => (
      <LineChart
        data={timeSeries(30, 4500, 2000)}
        x="date"
        y="amount"
        xUnitFormat={{ unit: 'time', options: { month: 'short', year: 'numeric' } }}
        yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
      />
    ),
  },
  {
    id: 'multi',
    label: 'Multiple series',
    render: () => {
      const categories = ['Revenue', 'Expenses', 'Profit'];
      const data = categories.flatMap((cat, ci) =>
        Array.from({ length: 24 }, (_, i) => ({
          date: new Date(2023, i, 1),
          amount: Math.round((2500 + ci * 1200) + Math.sin(i / 3) * 800 + Math.random() * 400),
          category: cat,
        }))
      );
      return (
        <LineChart
          data={data}
          x="date"
          y="amount"
          facet="category"
          legendEnabled
          xUnitFormat={{ unit: 'time', options: { month: 'short', year: '2-digit' } }}
          yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
          presentation={[
            { attribute: 'facet', value: 'Revenue', color: 'var(--color-chart-1)', name: 'Revenue' },
            { attribute: 'facet', value: 'Expenses', color: 'var(--color-chart-5)', name: 'Expenses' },
            { attribute: 'facet', value: 'Profit', color: 'var(--color-chart-3)', name: 'Profit' },
          ]}
        />
      );
    },
  },
  {
    id: 'compared',
    label: 'Comparing time periods',
    render: () => {
      const current = Array.from({ length: 24 }, (_, i) => ({
        date: new Date(2023, i, 1),
        amount: Math.round(3800 + Math.sin(i / 3) * 1200 + i * 50),
        period: 'current',
      }));
      const previous = Array.from({ length: 24 }, (_, i) => ({
        date: new Date(2023, i, 1),
        amount: Math.round(3000 + Math.sin(i / 3) * 900 + i * 30),
        period: 'previous',
      }));
      return (
        <LineChart
          data={[...current, ...previous]}
          x="date"
          y="amount"
          facet="period"
          legendEnabled
          xUnitFormat={{ unit: 'time', options: { month: 'short', year: '2-digit' } }}
          yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
          presentation={[
            { attribute: 'facet', value: 'current', color: 'var(--color-chart-1)', name: 'This period' },
            { attribute: 'facet', value: 'previous', color: 'var(--color-neutral-300)', name: 'Previous period', lineStyle: 'dashed' },
          ]}
        />
      );
    },
  },
  {
    id: 'forecast',
    label: 'Forecasting',
    render: () => {
      const actual = Array.from({ length: 18 }, (_, i) => ({
        date: new Date(2023, i, 1),
        amount: Math.round(4000 + Math.sin(i / 3) * 1500 + i * 40),
        period: 'actual',
      }));
      const lastActual = actual[actual.length - 1];
      const forecast = [
        { date: lastActual.date, amount: lastActual.amount, period: 'forecast' },
        ...Array.from({ length: 6 }, (_, i) => ({
          date: new Date(2023, i + 18, 1),
          amount: Math.round(lastActual.amount + (i + 1) * 120 + Math.sin(i) * 300),
          period: 'forecast',
        })),
      ];
      return (
        <LineChart
          data={[...actual, ...forecast]}
          x="date"
          y="amount"
          lineSegment="period"
          xUnitFormat={{ unit: 'time', options: { month: 'short', year: '2-digit' } }}
          yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
          presentation={[
            { attribute: 'lineSegment', value: 'actual', lineStyle: 'default' },
            { attribute: 'lineSegment', value: 'forecast', lineStyle: 'dashed' },
          ]}
        />
      );
    },
  },
  {
    id: 'ci',
    label: 'Confidence interval',
    render: () => {
      const data = Array.from({ length: 30 }, (_, i) => {
        const amount = Math.round(4000 + Math.sin(i / 4) * 1500 + i * 30);
        const spread = 400 + i * 15;
        return {
          date: new Date(2023, 0, 1 + i * 12),
          amount,
          lower: amount - spread,
          upper: amount + spread,
        };
      });
      return (
        <LineChart
          data={data}
          x="date"
          y="amount"
          confidenceInterval={{ lower: 'lower', upper: 'upper' }}
          xUnitFormat={{ unit: 'time', options: { month: 'short', year: '2-digit' } }}
          yUnitFormat={{ unit: 'number', options: {} }}
        />
      );
    },
  },
  {
    id: 'presentation',
    label: 'Custom presentation',
    render: () => {
      const data = ['Subscriptions', 'One-time', 'Usage-based'].flatMap((type, ti) =>
        Array.from({ length: 20 }, (_, i) => ({
          date: new Date(2023, 0, 1 + i * 18),
          amount: Math.round((2000 + ti * 1500) + Math.sin(i / 3 + ti) * 1000),
          type,
        }))
      );
      return (
        <LineChart
          data={data}
          x="date"
          y="amount"
          facet="type"
          legendEnabled
          xUnitFormat={{ unit: 'time', options: { month: 'short' } }}
          yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
          presentation={[
            { attribute: 'facet', value: 'Subscriptions', color: 'var(--color-chart-2)', name: 'Subscriptions' },
            { attribute: 'facet', value: 'One-time', color: 'var(--color-chart-4)', name: 'One-time payments' },
            { attribute: 'facet', value: 'Usage-based', color: 'var(--color-chart-6)', name: 'Usage-based' },
          ]}
        />
      );
    },
  },
  {
    id: 'ticks',
    label: 'Ticks configuration',
    render: () => (
      <LineChart
        data={timeSeries(40, 5000, 2500)}
        x="date"
        y="amount"
        xDesiredTickCount={4}
        yDesiredTickCount={3}
        xUnitFormat={{ unit: 'time', options: { month: 'short', year: '2-digit' } }}
        yUnitFormat={{ unit: 'number', options: {} }}
      />
    ),
  },
  {
    id: 'percent',
    label: 'Percent formatting',
    render: () => {
      const data = Array.from({ length: 24 }, (_, i) => ({
        date: new Date(2023, i, 1),
        rate: 0.02 + Math.sin(i / 4) * 0.015 + Math.random() * 0.005,
      }));
      return (
        <LineChart
          data={data}
          x="date"
          y="rate"
          xUnitFormat={{ unit: 'time', options: { month: 'short', year: '2-digit' } }}
          yUnitFormat={{ unit: 'percent', options: {} }}
        />
      );
    },
  },
  {
    id: 'no-tooltip',
    label: 'No tooltip',
    render: () => (
      <LineChart
        data={timeSeries(24, 3000, 1500)}
        x="date"
        y="amount"
        tooltip={null}
        xUnitFormat={{ unit: 'time', options: { month: 'short' } }}
        yUnitFormat={{ unit: 'number', options: {} }}
      />
    ),
  },
  {
    id: 'events',
    label: 'Events',
    render: () => {
      const [log, setLog] = useState([]);
      const data = useMemo(() => timeSeries(20, 4000, 2000), []);
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0">
            <LineChart
              data={data}
              x="date"
              y="amount"
              xUnitFormat={{ unit: 'time', options: { month: 'short' } }}
              yUnitFormat={{ unit: 'number', options: {} }}
              id="events-line"
              onLineClick={(p) => setLog(prev => [...prev.slice(-4), `click: series with ${p.data?.length} points`])}
              onNeedleHover={(p) => setLog(prev => [...prev.slice(-4), `needle: ${p.data ? 'hover' : 'leave'}`])}
            />
          </div>
          {log.length > 0 && (
            <div className="mt-2 p-2 border border-border rounded bg-offset max-h-[80px] overflow-y-auto">
              {log.map((l, i) => <div key={i} className="text-body-small text-subdued font-mono">{l}</div>)}
            </div>
          )}
        </div>
      );
    },
  },
];

const BAR_CHARTS = [
  {
    id: 'basic',
    label: 'Basic bars',
    render: () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const data = months.map(m => ({ month: m, revenue: Math.round(3000 + Math.random() * 5000) }));
      return (
        <BarChart
          data={data}
          x="month"
          y="revenue"
          yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
        />
      );
    },
  },
  {
    id: 'stacked',
    label: 'Stacked bars',
    render: () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const regions = ['US', 'EU', 'APAC'];
      const data = months.flatMap(month =>
        regions.map(region => ({
          month,
          revenue: Math.round(1500 + Math.random() * 3000),
          region,
        }))
      );
      return (
        <BarChart
          data={data}
          x="month"
          y="revenue"
          stack="region"
          legendEnabled
          yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
          presentation={[
            { attribute: 'stack', value: 'US', color: 'var(--color-chart-1)', name: 'United States' },
            { attribute: 'stack', value: 'EU', color: 'var(--color-chart-2)', name: 'Europe' },
            { attribute: 'stack', value: 'APAC', color: 'var(--color-chart-3)', name: 'Asia Pacific' },
          ]}
        />
      );
    },
  },
  {
    id: 'grouped',
    label: 'Grouped bars',
    render: () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const products = ['Basic', 'Pro', 'Enterprise'];
      const data = months.flatMap(month =>
        products.map(product => ({
          month,
          revenue: Math.round(1000 + Math.random() * 4000),
          product,
        }))
      );
      return (
        <BarChart
          data={data}
          x="month"
          y="revenue"
          group="product"
          legendEnabled
          yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
        />
      );
    },
  },
  {
    id: 'forecast',
    label: 'Forecast bars',
    render: () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const data = months.map((m, i) => ({
        month: m,
        revenue: Math.round(4000 + Math.sin(i / 2) * 1500 + i * 100),
        predicted: i >= 8 ? Math.round(4000 + Math.sin(i / 2) * 1500 + i * 100) : null,
      }));
      return (
        <BarChart
          data={data}
          x="month"
          y="revenue"
          forecast="predicted"
          yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
        />
      );
    },
  },
  {
    id: 'time-axis',
    label: 'Time x-axis',
    render: () => {
      const data = Array.from({ length: 18 }, (_, i) => ({
        date: new Date(2023, i, 1),
        volume: Math.round(3000 + Math.random() * 4000 + i * 100),
      }));
      return (
        <BarChart
          data={data}
          x="date"
          y="volume"
          xUnitFormat={{ unit: 'time', options: { month: 'short', year: '2-digit' } }}
          yUnitFormat={{ unit: 'number', options: {} }}
        />
      );
    },
  },
  {
    id: 'negative',
    label: 'Negative values',
    render: () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const data = months.map((m, i) => ({
        month: m,
        pnl: Math.round(Math.sin(i / 2) * 4000 + (Math.random() - 0.5) * 2000),
      }));
      return (
        <BarChart
          data={data}
          x="month"
          y="pnl"
          yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
          presentation={{ color: 'var(--color-chart-4)' }}
        />
      );
    },
  },
  {
    id: 'events',
    label: 'Events',
    render: () => {
      const [log, setLog] = useState([]);
      const data = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.map(m => ({ month: m, revenue: Math.round(3000 + Math.random() * 5000) }));
      }, []);
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0">
            <BarChart
              data={data}
              x="month"
              y="revenue"
              yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
              id="events-bar"
              onBarClick={(p) => setLog(prev => [...prev.slice(-4), `click: ${JSON.stringify(p.data).slice(0, 60)}`])}
              onBarHover={(p) => setLog(prev => [...prev.slice(-4), `hover: ${p.data ? p.data.month : 'leave'}`])}
            />
          </div>
          {log.length > 0 && (
            <div className="mt-2 p-2 border border-border rounded bg-offset max-h-[80px] overflow-y-auto">
              {log.map((l, i) => <div key={i} className="text-body-small text-subdued font-mono">{l}</div>)}
            </div>
          )}
        </div>
      );
    },
  },
];

const METER_CHARTS = [
  {
    id: 'basic',
    label: 'With legend',
    render: () => (
      <MeterChart
        data={[
          { method: 'Visa', transactions: 4200 },
          { method: 'Mastercard', transactions: 2800 },
          { method: 'Amex', transactions: 1400 },
          { method: 'Apple Pay', transactions: 900 },
          { method: 'Google Pay', transactions: 600 },
          { method: 'Other', transactions: 350 },
        ]}
        segmentName="method"
        segmentValue="transactions"
        legendEnabled
        unitFormat={{ unit: 'number', options: {} }}
      />
    ),
  },
  {
    id: 'custom-colors',
    label: 'Custom colors',
    render: () => (
      <MeterChart
        data={[
          { status: 'Succeeded', count: 8542 },
          { status: 'Failed', count: 342 },
          { status: 'Pending', count: 116 },
        ]}
        segmentName="status"
        segmentValue="count"
        legendEnabled
        unitFormat={{ unit: 'number', options: {} }}
        presentation={[
          { attribute: 'segment', value: 'Succeeded', color: 'var(--color-chart-6)', name: 'Succeeded' },
          { attribute: 'segment', value: 'Failed', color: 'var(--color-chart-7)', name: 'Failed' },
          { attribute: 'segment', value: 'Pending', color: 'var(--color-chart-4)', name: 'Pending' },
        ]}
      />
    ),
  },
  {
    id: 'bar-only',
    label: 'Bar only',
    render: () => (
      <MeterChart
        data={[
          { type: 'Online', amount: 7500 },
          { type: 'In-person', amount: 2500 },
        ]}
        segmentName="type"
        segmentValue="amount"
        presentation={[
          { attribute: 'segment', value: 'Online', color: 'var(--color-chart-2)' },
          { attribute: 'segment', value: 'In-person', color: 'var(--color-chart-3)' },
        ]}
      />
    ),
  },
  {
    id: 'many-segments',
    label: 'Many segments',
    render: () => (
      <MeterChart
        data={[
          { country: 'United States', revenue: 42000 },
          { country: 'United Kingdom', revenue: 18000 },
          { country: 'Germany', revenue: 14000 },
          { country: 'France', revenue: 11000 },
          { country: 'Japan', revenue: 9500 },
          { country: 'Canada', revenue: 7200 },
          { country: 'Australia', revenue: 5800 },
          { country: 'Brazil', revenue: 4100 },
          { country: 'India', revenue: 3200 },
        ]}
        segmentName="country"
        segmentValue="revenue"
        legendEnabled
        unitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
      />
    ),
  },
  {
    id: 'events',
    label: 'Events',
    render: () => {
      const [log, setLog] = useState([]);
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0">
            <MeterChart
              data={[
                { method: 'Visa', transactions: 4200 },
                { method: 'Mastercard', transactions: 2800 },
                { method: 'Amex', transactions: 1400 },
              ]}
              segmentName="method"
              segmentValue="transactions"
              legendEnabled
              unitFormat={{ unit: 'number', options: {} }}
              id="events-meter"
              onSegmentClick={(p) => setLog(prev => [...prev.slice(-4), `${p.eventType}: ${p.data?.method}`])}
              onSegmentHover={(p) => setLog(prev => [...prev.slice(-4), `${p.eventType}: ${p.data?.method}`])}
            />
          </div>
          {log.length > 0 && (
            <div className="mt-2 p-2 border border-border rounded bg-offset max-h-[80px] overflow-y-auto">
              {log.map((l, i) => <div key={i} className="text-body-small text-subdued font-mono">{l}</div>)}
            </div>
          )}
        </div>
      );
    },
  },
];

const SPARK_CHARTS = [
  {
    id: 'line',
    label: 'Spark line',
    render: () => {
      const data = Array.from({ length: 30 }, (_, i) => ({
        day: i, value: Math.round(50 + Math.sin(i / 4) * 25 + Math.random() * 10),
      }));
      return <SparkLineChart data={data} x="day" y="value" />;
    },
  },
  {
    id: 'line-faceted',
    label: 'Spark line (faceted)',
    render: () => {
      const data = ['A', 'B'].flatMap(cat =>
        Array.from({ length: 30 }, (_, i) => ({
          day: i, value: Math.round((cat === 'A' ? 60 : 40) + Math.sin(i / 3) * 15 + Math.random() * 8), cat,
        }))
      );
      return (
        <SparkLineChart
          data={data}
          x="day"
          y="value"
          facet="cat"
          presentation={[
            { attribute: 'facet', value: 'A', color: 'var(--color-chart-1)' },
            { attribute: 'facet', value: 'B', color: 'var(--color-chart-5)' },
          ]}
        />
      );
    },
  },
  {
    id: 'bar',
    label: 'Spark bar',
    render: () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        day: i, count: Math.round(20 + Math.random() * 40),
      }));
      return <SparkBarChart data={data} x="day" y="count" />;
    },
  },
  {
    id: 'bar-stacked',
    label: 'Spark bar (stacked)',
    render: () => {
      const data = Array.from({ length: 15 }, (_, i) => [
        { day: i, count: Math.round(20 + Math.random() * 20), type: 'A' },
        { day: i, count: Math.round(10 + Math.random() * 15), type: 'B' },
      ]).flat();
      return (
        <SparkBarChart
          data={data}
          x="day"
          y="count"
          stack="type"
          presentation={[
            { attribute: 'stack', value: 'A', color: 'var(--color-chart-2)' },
            { attribute: 'stack', value: 'B', color: 'var(--color-chart-3)' },
          ]}
        />
      );
    },
  },
];

// --- Components ---


function ChartSection({ title, charts, defaultHeight = 350, autoHeight = false }) {
  const [selected, setSelected] = useState(charts[0].id);
  const active = charts.find(c => c.id === selected);

  return (
    <div className="space-y-4">
      <h2 className="text-heading-small">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {charts.map(item => (
          <Toggle
            key={item.id}
            title={item.label}
            selected={selected === item.id}
            onClick={() => setSelected(item.id)}
            inline
          />
        ))}
      </div>
      <div
        className="border border-border rounded-lg p-5"
        style={autoHeight ? { minHeight: 60 } : { height: defaultHeight }}
      >
        {active && <active.render />}
      </div>
    </div>
  );
}

// --- Page ---

export default function Charts() {
  return (
    <div className="space-y-12 pb-10">
      <div>
        <h1 className="text-heading-large">Charts</h1>
        <p className="text-body-medium text-subdued mt-1">
          Interactive examples for all chart types and prop variations.
        </p>
      </div>

      <ChartSection title="LineChart" charts={LINE_CHARTS} defaultHeight={380} />
      <ChartSection title="BarChart" charts={BAR_CHARTS} defaultHeight={380} />
      <div className="grid grid-cols-2 gap-8">
        <ChartSection title="MeterChart" charts={METER_CHARTS} autoHeight />
        <ChartSection title="SparkLineChart / SparkBarChart" charts={SPARK_CHARTS} defaultHeight={100} />
      </div>
    </div>
  );
}
