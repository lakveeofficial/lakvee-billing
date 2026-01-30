'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react'
import { Company, CompanyFilters, BUSINESS_TYPES } from '@/types/company';
import { INDIAN_STATES } from '@/types/party';
import { useAuth } from '@/hooks/useAuth';
import { toCamelCase } from '@/lib/utils';
import PageHeader from '@/components/PageHeader'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [filters, setFilters] = useState<CompanyFilters>({
    search: '',
    businessType: 'all',
    state: 'all',
    isActive: 'all'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>({});
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  useEffect(() => {
    applyFilters()
  }, [companies, filters, activeCompany])

  // Keep summary in sync with current companies and activeCompany
  useEffect(() => {
    const total = Array.isArray(companies) ? companies.length : 0;
    const active = activeCompany ? 1 : 0;
    const inactive = Math.max(0, total - active);
    const currentCompany = activeCompany?.businessName || 'No Company Selected';
    setSummary({ total, active, inactive, currentCompany });
  }, [companies, activeCompany]);

  const loadData = async () => {
    if (!token) {
      console.error('No authentication token found');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching companies...');
      const [companiesRes, activeCompanyRes] = await Promise.all([
        fetch('/api/companies?page=1&limit=10&order=desc', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Ensure cookies are sent with the request
        }),
        fetch('/api/companies/active', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Ensure cookies are sent with the request
        }),
      ]);

      console.log('Companies response status:', companiesRes.status);
      
      let localCompanies: any[] = [];
      try {
        if (companiesRes.ok) {
          const data = await companiesRes.json();
          if (data && (Array.isArray(data.companies) || Array.isArray(data))) {
            const list = toCamelCase(data.companies || data);
            localCompanies = Array.isArray(list) ? list : [];
            setCompanies(localCompanies);
            setFilteredCompanies(localCompanies);
          } else {
            console.warn('Unexpected companies response shape:', data);
          }
        } else {
          const data = await companiesRes.json().catch(() => ({} as any));
          console.error('API Error:', data);
          alert(`Failed to fetch companies: ${data.message || 'Unknown error'}`);
        }
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        const text = await companiesRes.text();
        console.error('Raw response:', text);
      }

      let activeDataParsed: any = null;
      if (activeCompanyRes.ok) {
        const activeData = await activeCompanyRes.json();
        activeDataParsed = toCamelCase(activeData);
        setActiveCompany(activeDataParsed);
      } else {
        setActiveCompany(null);
      }

      // Compute summary from already parsed payloads
      try {
        // Use locally parsed list to avoid relying on async state update timing
        const total = Array.isArray(localCompanies) ? localCompanies.length : Array.isArray(companies) ? companies.length : 0;
        const active = activeDataParsed ? 1 : 0;
        const inactive = Math.max(0, total - active);
        const currentCompany = activeDataParsed?.businessName || 'No Company Selected';
        setSummary({ total, active, inactive, currentCompany });
      } catch {}

    } catch (error) {
      console.error('Failed to load company data:', error);
      alert('Failed to load company data.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = companies

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(company =>
        company.businessName.toLowerCase().includes(searchTerm) ||
        company.phoneNumber.includes(searchTerm) ||
        company.emailId.toLowerCase().includes(searchTerm) ||
        company.gstin?.toLowerCase().includes(searchTerm) ||
        company.businessAddress.toLowerCase().includes(searchTerm)
      )
    }

    // Business type filter
    if (filters.businessType !== 'all') {
      filtered = filtered.filter(company => company.businessType === filters.businessType)
    }

    // State filter
    if (filters.state !== 'all') {
      filtered = filtered.filter(company => company.state === filters.state)
    }

    // Active status filter (derive from activeCompany mapping)
    if (filters.isActive !== 'all') {
      const wantActive = filters.isActive === 'active'
      filtered = filtered.filter(c => (activeCompany?.id === c.id) === wantActive)
    }

    setFilteredCompanies(filtered)
  }

  const handleDelete = async (id: string) => {
    if (!token) return;
    const company = companies.find(c => c.id === id);
    if (!company) return;

    if (activeCompany?.id === id) {
      alert('Cannot delete the active company. Please set another company as active first.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${company.businessName}"?`)) {
      try {
        const response = await fetch(`/api/companies/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          alert('Company deleted successfully.');
          loadData();
        } else {
          const errorData = await response.json();
          alert(`Failed to delete company: ${errorData.message}`);
        }
      } catch (error) {
        console.error('Error deleting company:', error);
        alert('An error occurred while deleting the company.');
      }
    }
  };

  const handleSetActive = async (id: string) => {
    if (!token) return;
    try {
      const response = await fetch('/api/companies/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ companyId: id }),
      });

      if (response.ok) {
        alert('Company set as active.');
        loadData();
      } else {
        const errorData = await response.json();
        alert(`Failed to set active company: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error setting active company:', error);
      alert('An error occurred while setting the active company.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Company Management"
        subtitle="Manage your business companies and settings"
        actions={
          <button
            onClick={() => router.push('/dashboard/companies/new')}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-colors"
          >
            <Plus className="w-4 h-4 text-indigo-200" />
            Add Company
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Companies</p>
              <p className="text-2xl font-bold text-slate-900">{summary.total || 0}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Companies</p>
              <p className="text-2xl font-bold text-green-900">{summary.active || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Inactive Companies</p>
              <p className="text-2xl font-bold text-red-900">{summary.inactive || 0}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Current Company</p>
              <p className="text-sm font-medium text-slate-900 truncate">{summary.currentCompany}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Type</label>
              <select
                value={filters.businessType}
                onChange={(e) => setFilters({ ...filters, businessType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {BUSINESS_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All States</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters({ ...filters, isActive: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No companies found</h3>
            <p className="text-slate-600 mb-4">Get started by creating your first company.</p>
            <button
              onClick={() => router.push('/dashboard/companies/new')}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
            >
              Add Company
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Business Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {company.logo ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={company.logo}
                              alt={company.businessName}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-slate-900">
                              {company.businessName}
                            </div>
                            {activeCompany?.id === company.id && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <div className="text-sm text-slate-500">
                            {company.gstin || 'No GSTIN'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-900">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {company.phoneNumber}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {company.emailId}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {company.state}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {BUSINESS_TYPES.find(t => t.value === company.businessType)?.label}
                        </div>
                        <div className="text-sm text-slate-500">
                          {company.businessCategory}
                        </div>
                        <div className="text-sm text-slate-500">
                          {company.pincode}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        {(() => {
                          const isActiveNow = activeCompany?.id === company.id
                          return (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              isActiveNow ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {isActiveNow ? 'Active' : 'Inactive'}
                            </span>
                          )
                        })()}
                        {activeCompany?.id !== company.id && (
                          <button
                            onClick={() => handleSetActive(company.id)}
                            className="block text-xs text-blue-600 hover:text-blue-800"
                          >
                            Set as Active
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => router.push(`/dashboard/companies/${company.id}`)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/companies/${company.id}/edit`)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                          disabled={activeCompany?.id === company.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
