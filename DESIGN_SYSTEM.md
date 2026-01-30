# Design System Documentation

## Overview

This design system provides a comprehensive set of reusable components, utilities, and guidelines for building consistent, modern UI across the courier booking management system.

---

## Color Palette

### Primary Colors
- **Primary 50**: `#eff6ff` - Lightest blue
- **Primary 600**: `#2563eb` - Main brand color
- **Primary 700**: `#1d4ed8` - Hover state

### Semantic Colors
- **Success**: Green (`#059669`)
- **Warning**: Yellow (`#d97706`)
- **Error**: Red (`#dc2626`)
- **Info**: Blue (`#2563eb`)

### Gradients
Use these gradient classes for cards and buttons:
- `from-blue-500 to-blue-600`
- `from-purple-500 to-purple-600`
- `from-green-500 to-green-600`
- `from-orange-500 to-orange-600`

---

## Typography

### Headings
- **H1**: `text-3xl font-bold` - Page titles
- **H2**: `text-2xl font-bold` - Section titles
- **H3**: `text-xl font-semibold` - Subsection titles
- **H4**: `text-lg font-semibold` - Card titles

### Body Text
- **Body**: `text-base` - Regular text
- **Small**: `text-sm` - Secondary text
- **Tiny**: `text-xs` - Labels, captions

---

## Spacing

Use Tailwind's spacing scale:
- **xs**: `0.25rem` (4px)
- **sm**: `0.5rem` (8px)
- **md**: `1rem` (16px)
- **lg**: `1.5rem` (24px)
- **xl**: `2rem` (32px)

---

## Components

### StatCard

Display key metrics with gradient backgrounds.

**Usage:**
\`\`\`tsx
import StatCard from '@/components/StatCard'
import { FileText } from 'lucide-react'

<StatCard
  label="Total Bookings"
  value={1234}
  icon={FileText}
  gradient="from-blue-500 to-blue-600"
  trend={{ value: 12, isPositive: true }}
  onClick={() => console.log('Clicked')}
/>
\`\`\`

**Props:**
- `label`: string - Card label
- `value`: string | number - Main value
- `icon`: LucideIcon - Icon component
- `gradient`: string - Tailwind gradient classes
- `trend?`: { value: number, isPositive: boolean } - Optional trend indicator
- `onClick?`: () => void - Optional click handler

---

### DataTable

Sortable, searchable table with loading and empty states.

**Usage:**
\`\`\`tsx
import DataTable from '@/components/DataTable'

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }
]

<DataTable
  columns={columns}
  data={data}
  loading={loading}
  searchable
  searchPlaceholder="Search users..."
  rowKey={(row) => row.id}
  onRowClick={(row) => console.log(row)}
  actions={(row) => (
    <>
      <button onClick={() => edit(row)}>Edit</button>
      <button onClick={() => delete(row)}>Delete</button>
    </>
  )}
/>
\`\`\`

---

### FormCard

Consistent form container with header and footer.

**Usage:**
\`\`\`tsx
import FormCard, { FieldGroup } from '@/components/FormCard'
import { User } from 'lucide-react'

<FormCard
  title="User Profile"
  subtitle="Update your information"
  icon={User}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  submitLabel="Save Changes"
  loading={saving}
>
  <FieldGroup label="Personal Information">
    <input name="name" placeholder="Full Name" />
    <input name="email" type="email" placeholder="Email" />
  </FieldGroup>

  <FieldGroup label="Contact">
    <input name="phone" placeholder="Phone" />
  </FieldGroup>
</FormCard>
\`\`\`

---

### EmptyState

Display when no data is available.

**Usage:**
\`\`\`tsx
import EmptyState from '@/components/EmptyState'
import { Users, Plus } from 'lucide-react'

<EmptyState
  icon={Users}
  title="No users found"
  message="Get started by adding your first user."
  action={{
    label: "Add User",
    onClick: () => router.push('/users/new'),
    icon: Plus
  }}
/>
\`\`\`

---

### LoadingSpinner

Show loading states.

**Usage:**
\`\`\`tsx
import LoadingSpinner, { Skeleton, TableSkeleton } from '@/components/LoadingSpinner'

// Full page loading
<LoadingSpinner fullPage message="Loading data..." />

// Inline loading
<LoadingSpinner size="sm" />

// Skeleton loaders
<Skeleton className="h-8 w-full" count={3} />

// Table skeleton
<TableSkeleton rows={5} columns={4} />
\`\`\`

---

### ActionButton

Consistent button styling with variants.

**Usage:**
\`\`\`tsx
import ActionButton from '@/components/ActionButton'
import { Plus, Save } from 'lucide-react'

<ActionButton
  variant="primary"
  size="md"
  icon={Plus}
  iconPosition="left"
  loading={saving}
  onClick={handleClick}
>
  Add New
</ActionButton>
\`\`\`

**Variants:**
- `primary` - Blue background
- `secondary` - Gray background
- `danger` - Red background
- `success` - Green background
- `outline` - Border only

---

### FilterPanel

Collapsible filter section.

**Usage:**
\`\`\`tsx
import FilterPanel, { FilterField } from '@/components/FilterPanel'

<FilterPanel
  title="Filters"
  defaultOpen
  onClear={clearFilters}
>
  <FilterField label="Status">
    <select>
      <option>All</option>
      <option>Active</option>
      <option>Inactive</option>
    </select>
  </FilterField>

  <FilterField label="Date Range">
    <input type="date" />
  </FilterField>
</FilterPanel>
\`\`\`

---

### Toast

Show notifications.

**Usage:**
\`\`\`tsx
import { useToast, ToastContainer } from '@/components/Toast'

function MyComponent() {
  const { toasts, closeToast, success, error, warning, info } = useToast()

  const handleSave = () => {
    success('Saved successfully!')
  }

  return (
    <>
      <button onClick={handleSave}>Save</button>
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </>
  )
}
\`\`\`

---

## Utility Classes

### Gradients
- `.gradient-blue` - Blue gradient
- `.gradient-purple` - Purple gradient
- `.gradient-green` - Green gradient
- `.gradient-orange` - Orange gradient

### Shadows
- `.shadow-soft` - Subtle shadow
- `.shadow-medium` - Medium shadow
- `.shadow-strong` - Strong shadow

### Cards
- `.card` - Basic card
- `.card-hover` - Card with hover effect

### Badges
- `.badge-success` - Green badge
- `.badge-warning` - Yellow badge
- `.badge-error` - Red badge
- `.badge-info` - Blue badge
- `.badge-neutral` - Gray badge

### Animations
- `.animate-slide-in-right` - Slide in from right
- `.animate-fade-in` - Fade in
- `.animate-scale-in` - Scale in

---

## Best Practices

### 1. Consistency
- Always use design system components
- Follow spacing guidelines
- Use semantic colors

### 2. Accessibility
- Include ARIA labels
- Ensure keyboard navigation
- Maintain color contrast

### 3. Performance
- Use loading states
- Implement lazy loading
- Optimize images

### 4. Responsiveness
- Mobile-first approach
- Test on multiple devices
- Use responsive utilities

---

## Examples

### Page Layout
\`\`\`tsx
<div className="min-h-screen bg-gray-50 p-6">
  <div className="max-w-7xl mx-auto space-y-6">
    <PageHeader title="Dashboard" />
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard {...} />
      <StatCard {...} />
      <StatCard {...} />
      <StatCard {...} />
    </div>

    <div className="card p-6">
      <DataTable {...} />
    </div>
  </div>
</div>
\`\`\`

### Form Page
\`\`\`tsx
<div className="min-h-screen bg-gray-50 p-6">
  <div className="max-w-3xl mx-auto">
    <FormCard {...}>
      <FieldGroup label="Section 1">
        {/* Fields */}
      </FieldGroup>
    </FormCard>
  </div>
</div>
\`\`\`

---

## Migration Guide

### From Old to New

**Old:**
\`\`\`tsx
<div className="bg-white p-4 rounded shadow">
  <h2>Title</h2>
  <table>...</table>
</div>
\`\`\`

**New:**
\`\`\`tsx
<DataTable
  columns={columns}
  data={data}
  searchable
/>
\`\`\`

---

## Support

For questions or issues with the design system, please contact the development team.
