# Billing Portal v1.0

A comprehensive Logistic & Courier Billing Application built with Next.js.

## Features

### 🔐 Authentication
- Login page with user role management (Admin/Billing Operator)
- Role-based access control

### 👥 Party Management Module
- Add/Edit customer party details
- Full address and GST information management
- Validation for mandatory fields
- Search and filter functionality
- Bulk upload via CSV

### 📄 Sales Invoice Module
- Generate sales invoices for courier items
- Auto-generated invoice numbers
- Items table with calculations
- Additional charges management
- Payment tracking
- Bulk upload support

### 📊 Sales List View
- Display and manage invoices
- Advanced filtering options
- Summary totals
- Bulk export (PDF, CSV)

### 📈 Reports Module
- Sales reports
- Party statements
- Daybook reports
- Export functionality

### 📤 CSV Upload Functionality
- Bulk import of parties and sales
- Data validation and preview
- Error handling

## Technology Stack

- **Framework**: Next.js 14.2.5
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **PDF Generation**: jsPDF
- **CSV Processing**: PapaParse
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd billing-portal-v1
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials

- **Admin**: `admin` / `admin123`
- **Billing Operator**: `operator` / `operator123`

## Project Structure

```
billing-portal-v1/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout with navigation
│   │   ├── page.tsx            # Dashboard home page
│   │   ├── parties/            # Party management pages
│   │   ├── invoices/           # Invoice management pages
│   │   ├── reports/            # Reports pages
│   │   └── upload/             # CSV upload pages
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Login page
├── components/                 # Reusable components
├── lib/                        # Utility functions
├── public/                     # Static assets
└── types/                      # TypeScript type definitions
```

## User Roles

### Admin
- Full access to all modules
- User management
- CSV upload functionality
- System configuration

### Billing Operator
- Sales and invoice management
- Party management
- Reports viewing
- Limited access to settings

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

© 2025 LakVee Softwares & Solutions. All rights reserved.

## Support

For support and questions, please contact LakVee Softwares & Solutions.

---

**Version**: 1.0  
**Last Updated**: August 5, 2025
# lakvee-billing-system
