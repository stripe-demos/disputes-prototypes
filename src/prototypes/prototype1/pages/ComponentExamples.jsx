import { useState } from 'react';
import {
  Badge,
  Breadcrumb,
  Button,
  Chip,
  FilterChip,
  DateRangePicker,
  Dialog,
  Input,
  Select,
  Textarea,
  Checkbox,
  Radio,
  Link,
  Switch,
  Table,
  Tabs,
  Toggle,
  ToggleGroup,
  Tooltip,
  LineChart,
  BarChart,
  SparkLineChart,
  SparkBarChart,
  MeterChart,
} from '../../../sail';
import { COUNTRIES } from '../../../data/countries';

const ComponentSection = ({ title, children }) => (
  <section className="max-w-[800px]">
    <h2 className="text-body-medium-emphasized text-default mb-2">{title}</h2>
    <div className="flex p-10 rounded-xl border border-border items-center justify-center">
      {children}
    </div>
  </section>
);

export default function ComponentExamples() {
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('option1');
  const [textareaValue, setTextareaValue] = useState('');
  const [switchChecked, setSwitchChecked] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState('option1');
  const [selectedCard, setSelectedCard] = useState('card1');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTabMd, setActiveTabMd] = useState('tab1');

  // Dropdown state
  const [singleSelectValue, setSingleSelectValue] = useState('');
  const [multiSelectValue, setMultiSelectValue] = useState(['standard', 'express', 'custom']);
  const [dateRangeValue, setDateRangeValue] = useState('');
  const [countryValue, setCountryValue] = useState('');

  // Sample data for table
  const tableColumns = [
    { key: 'name', header: 'Name', width: 'grow' },
    { key: 'email', header: 'Email' },
    {
      key: 'status', header: 'Status', render: (item) => (
        <Badge variant={item.status === 'Active' ? 'success' : 'default'}>{item.status}</Badge>
      )
    },
    { key: 'amount', header: 'Amount', align: 'right' },
  ];

  const tableData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active', amount: '$1,234.00' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Pending', amount: '$567.00' },
    { id: 3, name: 'Bob Wilson', email: 'bob@example.com', status: 'Active', amount: '$890.00' },
  ];

  // Chart sample data
  const lineChartData = Array.from({ length: 12 }, (_, i) => [
    { date: new Date(2024, i, 1), amount: 3000 + Math.random() * 5000, series: 'Revenue' },
    { date: new Date(2024, i, 1), amount: 1500 + Math.random() * 2500, series: 'Expenses' },
  ]).flat();

  const barChartData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].flatMap(month => [
    { month, revenue: Math.round(2000 + Math.random() * 3000), region: 'North America' },
    { month, revenue: Math.round(1000 + Math.random() * 2000), region: 'Europe' },
    { month, revenue: Math.round(500 + Math.random() * 1500), region: 'Asia' },
  ]);

  const groupedBarData = ['Q1', 'Q2', 'Q3', 'Q4'].flatMap(quarter => [
    { quarter, value: Math.round(100 + Math.random() * 200), product: 'Payments' },
    { quarter, value: Math.round(50 + Math.random() * 150), product: 'Billing' },
    { quarter, value: Math.round(30 + Math.random() * 100), product: 'Connect' },
  ]);

  const sparkData = Array.from({ length: 20 }, (_, i) => ({
    day: i, value: 50 + Math.sin(i * 0.5) * 30 + Math.random() * 10,
  }));

  const sparkBarData = Array.from({ length: 12 }, (_, i) => ({
    day: `D${i + 1}`, count: Math.round(20 + Math.random() * 80),
  }));

  const meterData = [
    { method: 'Visa', transactions: 4200 },
    { method: 'Mastercard', transactions: 2800 },
    { method: 'Amex', transactions: 1400 },
    { method: 'Other', transactions: 600 },
  ];


  return (
    <div className="space-y-12">
      <ComponentSection
        title="Breadcrumb"
      >
        <div className="flex flex-col gap-6">
          <Breadcrumb
            pages={[{ label: 'Page at the root', to: '/' }]}
            currentPage="The current page"
          />
          <Breadcrumb
            pages={[
              { label: 'Page at the root', to: '/' },
              { label: 'Page one level deep', to: '/' },
            ]}
            currentPage="The current page"
            showCurrentPage={false}
          />
        </div>
      </ComponentSection>

      <ComponentSection
        title="Tabs"
      >
        <div className="w-full">
          <Tabs
            tabs={[
              { key: 'tab1', label: 'Tab 1' },
              { key: 'tab2', label: 'Tab 2' },
              { key: 'tab3', label: 'Tab 3' },
              { key: 'tab4', label: 'Tab 4' },
              { key: 'tab5', label: 'Tab 5' },
            ]}
            activeTab={activeTabMd}
            onTabChange={setActiveTabMd}
          >
            <p className="p-4 border border-border rounded-lg bg-offset text-body-small text-subdued">Content for {activeTabMd}</p>
          </Tabs>
        </div>
      </ComponentSection>

      <ComponentSection
        title="Badge"
      >
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </ComponentSection>

      <ComponentSection
        title="Button"
      >
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button icon="add">With Icon</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </ComponentSection>

      <ComponentSection
        title="Link"
      >
        <div className="flex flex-wrap gap-4 text-body-small">
          <Link href="#">Primary link</Link>
          <Link href="#" variant="secondary">Secondary link</Link>
          <Link href="#" external>External</Link>
          <Link href="#" disabled>Disabled</Link>
        </div>
      </ComponentSection>

      <ComponentSection
        title="Input"
      >
        <div className="space-y-4 max-w-sm">
          <Input
            label="Email address"
            description="We'll use this for account notifications"
            placeholder="you@example.com"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input
            label="Price"
            placeholder="0.00"
            prefix="$"
            value=""
            onChange={() => { }}
          />
          <Input
            label="Username"
            placeholder="Choose a username"
            error
            errorMessage="This username is already taken"
            value=""
            onChange={() => { }}
          />
        </div>
      </ComponentSection>

      <ComponentSection
        title="Select"
      >
        <div className="space-y-4 max-w-sm">
          <Select
            label="Country"
            description="Select your billing country"
            value={selectValue}
            onChange={(e) => setSelectValue(e.target.value)}
          >
            <option value="option1">United States</option>
            <option value="option2">Canada</option>
            <option value="option3">United Kingdom</option>
          </Select>
          <div className="flex flex-wrap items-center gap-3">
            <Select size="sm" value={selectValue} onChange={(e) => setSelectValue(e.target.value)}>
              <option value="option1">Small</option>
              <option value="option2">Option 2</option>
            </Select>
            <Select value={selectValue} onChange={(e) => setSelectValue(e.target.value)}>
              <option value="option1">Medium</option>
              <option value="option2">Option 2</option>
            </Select>
            <Select size="lg" value={selectValue} onChange={(e) => setSelectValue(e.target.value)}>
              <option value="option1">Large</option>
              <option value="option2">Option 2</option>
            </Select>
          </div>
        </div>
      </ComponentSection>

      <ComponentSection
        title="Textarea"
      >
        <div className="max-w-sm">
          <Textarea
            label="Message"
            description="Describe your issue in detail"
            placeholder="Enter your message..."
            rows={3}
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
          />
        </div>
      </ComponentSection>

      <ComponentSection
        title="Switch"
      >
        <div className="flex flex-col space-y-8">
          <Switch
            checked={switchChecked}
            onChange={(e) => setSwitchChecked(e.target.checked)}
            label="Enable notifications"
            description="Receive emails about account activity"
          />
          <Switch
            checked={false}
            onChange={() => { }}
            disabled
            label="Disabled switch"
          />
        </div>
      </ComponentSection>

      <ComponentSection
        title="Checkbox"
      >
        <div className="flex flex-col space-y-4">
          <Checkbox
            checked={checkboxChecked}
            onChange={(e) => setCheckboxChecked(e.target.checked)}
            label="Accept terms"
            description="I agree to the terms and conditions"
          />
          <Checkbox
            checked={true}
            onChange={() => { }}
            label="Checked checkbox"
          />
          <Checkbox
            checked={false}
            onChange={() => { }}
            disabled
            label="Disabled checkbox"
          />
        </div>
      </ComponentSection>

      <ComponentSection
        title="Radio"
      >
        <div className="flex flex-col space-y-4">
          <Radio
            checked={selectedRadio === 'option1'}
            onChange={() => setSelectedRadio('option1')}
            name="plan"
            value="option1"
            label="Basic plan"
            description="$9/month - For individuals"
          />
          <Radio
            checked={selectedRadio === 'option2'}
            onChange={() => setSelectedRadio('option2')}
            name="plan"
            value="option2"
            label="Pro plan"
            description="$29/month - For small teams"
          />
          <Radio
            checked={selectedRadio === 'option3'}
            onChange={() => setSelectedRadio('option3')}
            name="plan"
            value="option3"
            label="Enterprise"
            description="Custom pricing"
          />
        </div>
      </ComponentSection>

      <ComponentSection
        title="Toggle"
      >
        <div className="max-w-sm">
          <ToggleGroup label="Select an option">
            <Toggle
              title="Option A"
              description="This is the first option"
              selected={selectedCard === 'card1'}
              onClick={() => setSelectedCard('card1')}
            />
            <Toggle
              title="Option B"
              description="This is the second option"
              selected={selectedCard === 'card2'}
              onClick={() => setSelectedCard('card2')}
            />
          </ToggleGroup>
        </div>
      </ComponentSection>

      <ComponentSection title="Chips + Dropdowns">
        <div className="flex flex-wrap gap-3">
          <FilterChip
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            value={singleSelectValue}
            onChange={setSingleSelectValue}
          />
          <FilterChip
            label="Type"
            variant="multi"
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'express', label: 'Express' },
              { value: 'custom', label: 'Custom' },
            ]}
            value={multiSelectValue}
            onChange={setMultiSelectValue}
          />
          <FilterChip
            label="Country"
            options={COUNTRIES}
            value={countryValue}
            onChange={setCountryValue}
            searchable
            searchPlaceholder="Search countries..."
          />
          <Chip
            label="Date range"
            value={dateRangeValue}
            displayValue={dateRangeValue}
            onClear={() => setDateRangeValue('')}
            renderDropdown={({ ref, anchorRef, onClose }) => (
              <DateRangePicker
                ref={ref}
                anchorRef={anchorRef}
                value={dateRangeValue}
                onChange={setDateRangeValue}
                onClose={onClose}
              />
            )}
          />
        </div>
      </ComponentSection>

      <ComponentSection
        title="Tooltip"
      >
        <div className="flex flex-wrap gap-4">
          <Tooltip content="This is a tooltip on top" placement="top">
            <Button variant="secondary">Hover me (top)</Button>
          </Tooltip>
          <Tooltip content="This is a tooltip on bottom" placement="bottom">
            <Button variant="secondary">Hover me (bottom)</Button>
          </Tooltip>
          <Tooltip content="Minimal style" placement="top" variant="minimal">
            <Button variant="secondary">Minimal tooltip</Button>
          </Tooltip>
        </div>
      </ComponentSection>

      <ComponentSection
        title="Dialog"
      >
        <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
      </ComponentSection>

      <ComponentSection
        title="Table"
      >
        <div className="w-full">
          <Table
            columns={tableColumns}
            data={tableData}
            onRowClick={(item) => alert(`Clicked: ${item.name}`)}
          />
        </div>
      </ComponentSection>

      {/* Dialog instance */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Confirm Action"
        subtitle="This action cannot be undone."
        size="medium"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
          </div>
        }
      >
        <p className="text-body-small text-subdued">
          Are you sure you want to proceed? This will permanently delete the selected items.
        </p>
      </Dialog>

      {/* Charts */}
      <ComponentSection title="LineChart">
        <div className="w-full h-[300px]">
          <LineChart
            data={lineChartData}
            x="date"
            y="amount"
            facet="series"
            xUnitFormat={{ unit: 'time', options: { style: 'short-time' } }}
            yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
            legendEnabled
            presentation={[
              { attribute: 'facet', value: 'Revenue', name: 'Revenue', color: 'var(--color-chart-1)' },
              { attribute: 'facet', value: 'Expenses', name: 'Expenses', color: 'var(--color-chart-4)' },
            ]}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="BarChart">
        <div className="w-full h-[300px]">
          <BarChart
            data={barChartData}
            x="month"
            y="revenue"
            stack="region"
            yUnitFormat={{ unit: 'currency', options: { currency: 'USD' } }}
            legendEnabled
          />
        </div>
      </ComponentSection>

      <ComponentSection title="BarChart (grouped)">
        <div className="w-full h-[300px]">
          <BarChart
            data={groupedBarData}
            x="quarter"
            y="value"
            group="product"
            legendEnabled
          />
        </div>
      </ComponentSection>

      <ComponentSection title="SparkLineChart">
        <div className="flex gap-6 items-center">
          <div className="w-[120px] h-[40px]">
            <SparkLineChart data={sparkData} x="day" y="value" />
          </div>
          <div className="w-[120px] h-[40px]">
            <SparkLineChart
              data={sparkData}
              x="day"
              y="value"
              presentation={{ color: 'var(--color-chart-3)' }}
            />
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="SparkBarChart">
        <div className="flex gap-6 items-center">
          <div className="w-[120px] h-[40px]">
            <SparkBarChart data={sparkBarData} x="day" y="count" />
          </div>
          <div className="w-[120px] h-[40px]">
            <SparkBarChart
              data={sparkBarData}
              x="day"
              y="count"
              presentation={{ color: 'var(--color-chart-4)' }}
            />
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="MeterChart">
        <div className="w-full max-w-md">
          <MeterChart
            data={meterData}
            segmentName="method"
            segmentValue="transactions"
            legendEnabled
            unitFormat={{ unit: 'number', options: {} }}
          />
        </div>
      </ComponentSection>

    </div>
  );
}
