'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { 
  Building2, 
  Upload, 
  X, 
  Save, 
  ArrowLeft,
  Image as ImageIcon,
  FileSignature
} from 'lucide-react'
import { Company, BUSINESS_TYPES, BUSINESS_CATEGORIES } from '@/types/company'
import { INDIAN_STATES } from '@/types/party'
import { useAuth } from '@/hooks/useAuth'
import { toCamelCase } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'

interface CompanyFormData {
  businessName: string
  phoneNumber: string
  gstin?: string
  emailId: string
  businessType: string
  businessCategory: string
  state: string
  pincode: string
  businessAddress: string
}

export default function EditCompanyPage() {
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [logo, setLogo] = useState<string>('')
  const [signature, setSignature] = useState<string>('')
  const logoInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string
  const { token } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CompanyFormData>()

  useEffect(() => {
    if (!companyId || !token) return;

    const fetchCompany = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/companies/${companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch company data.');
        const data = await res.json();
        const camelCaseData = toCamelCase(data);
        setCompany(camelCaseData);
        reset(camelCaseData);
        if (camelCaseData.logo) setLogo(camelCaseData.logo);
        if (camelCaseData.signature) setSignature(camelCaseData.signature);
      } catch (error) {
        alert('Failed to load company data.');
        router.push('/dashboard/companies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [companyId, token, reset, router]);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await toBase64(file);
      setLogo(base64);
    } catch (error) {
      alert('Failed to read logo file.');
    }
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await toBase64(file);
      setSignature(base64);
    } catch (error) {
      alert('Failed to read signature file.');
    }
  };

  const removeLogo = () => {
    setLogo('')
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const removeSignature = () => {
    setSignature('')
    if (signatureInputRef.current) signatureInputRef.current.value = ''
  }

  const onSubmit = async (data: CompanyFormData) => {
    if (!token) {
      alert('Authentication error. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      const companyPayload = {
        ...data,
        logo: logo || undefined,
        signature: signature || undefined,
      };

      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(companyPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update company');
      }

      alert('Company updated successfully!');
      router.push(`/dashboard/companies/${companyId}`);
    } catch (error) {
      alert('Failed to update company: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  
  const validateGSTIN = (value?: string) => {
    if (!value) return true
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    return gstinRegex.test(value) || 'Invalid GSTIN format'
  }

  const validatePhone = (value: string) => {
    const phoneRegex = /^[6-9]\d{9}$/
    return phoneRegex.test(value) || 'Invalid phone number'
  }

  const validatePincode = (value: string) => {
    const pincodeRegex = /^[1-9][0-9]{5}$/
    return pincodeRegex.test(value) || 'Invalid pincode'
  }

  const validateEmail = (value: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    return emailRegex.test(value) || 'Invalid email address'
  }

  if (loading && !company) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Company"
        subtitle={`Update the details for ${company?.businessName || 'the company'}.`}
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-200" />
            Back
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white p-6 rounded-lg border">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side: Form inputs */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name <span className="text-red-500">*</span></label>
                  <input type="text" {...register('businessName', { required: 'Business name is required' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter business name" />
                  {errors.businessName && <p className="mt-1 text-sm text-red-600">{errors.businessName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                  <input type="text" {...register('phoneNumber', { required: 'Phone number is required', validate: validatePhone })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter phone number" />
                  {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email ID <span className="text-red-500">*</span></label>
                  <input type="email" {...register('emailId', { required: 'Email is required', validate: validateEmail })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter email address" />
                  {errors.emailId && <p className="mt-1 text-sm text-red-600">{errors.emailId.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input type="text" {...register('gstin', { validate: validateGSTIN })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter GSTIN (optional)" />
                  {errors.gstin && <p className="mt-1 text-sm text-red-600">{errors.gstin.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Type <span className="text-red-500">*</span></label>
                  <select {...register('businessType', { required: 'Business type is required' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select business type</option>
                    {BUSINESS_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                  {errors.businessType && <p className="mt-1 text-sm text-red-600">{errors.businessType.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Category <span className="text-red-500">*</span></label>
                  <select {...register('businessCategory', { required: 'Business category is required' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select business category</option>
                    {BUSINESS_CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
                  </select>
                  {errors.businessCategory && <p className="mt-1 text-sm text-red-600">{errors.businessCategory.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                  <select {...register('state', { required: 'State is required' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select state</option>
                    {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                  </select>
                  {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode <span className="text-red-500">*</span></label>
                  <input type="text" {...register('pincode', { required: 'Pincode is required', validate: validatePincode })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter pincode" />
                  {errors.pincode && <p className="mt-1 text-sm text-red-600">{errors.pincode.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Address <span className="text-red-500">*</span></label>
                <textarea {...register('businessAddress', { required: 'Business address is required' })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter complete business address" />
                {errors.businessAddress && <p className="mt-1 text-sm text-red-600">{errors.businessAddress.message}</p>}
              </div>
            </div>

            {/* Right side: Logo and signature uploads */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {logo ? (
                      <div>
                        <img src={logo} alt="Logo Preview" className="mx-auto h-24 w-auto" />
                        <button type="button" onClick={removeLogo} className="mt-2 text-sm text-red-600 hover:text-red-800">Remove</button>
                      </div>
                    ) : (
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    )}
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="logo-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload a file</span>
                        <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleLogoUpload} accept="image/*" ref={logoInputRef} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Digital Signature</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {signature ? (
                      <div>
                        <img src={signature} alt="Signature Preview" className="mx-auto h-24 w-auto" />
                        <button type="button" onClick={removeSignature} className="mt-2 text-sm text-red-600 hover:text-red-800">Remove</button>
                      </div>
                    ) : (
                      <FileSignature className="mx-auto h-12 w-12 text-gray-400" />
                    )}
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="signature-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload a file</span>
                        <input id="signature-upload" name="signature-upload" type="file" className="sr-only" onChange={handleSignatureUpload} accept="image/*" ref={signatureInputRef} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
