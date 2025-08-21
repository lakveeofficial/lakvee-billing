'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import { Company, BUSINESS_TYPES, BUSINESS_CATEGORIES } from '@/types/company';
import { INDIAN_STATES } from '@/types/party';
import { useAuth } from '@/hooks/useAuth';
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
  isActive: boolean
}

export default function NewCompanyPage() {
  const [loading, setLoading] = useState(false)
  const [logo, setLogo] = useState<string>('')
  const [signature, setSignature] = useState<string>('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { token } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<CompanyFormData>({
    defaultValues: {
      isActive: true
    }
  })

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
      setLogoFile(file);
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
      setSignatureFile(file);
    } catch (error) {
      alert('Failed to read signature file.');
    }
  };

  const removeLogo = () => {
    setLogo('')
    setLogoFile(null)
    if (logoInputRef.current) {
      logoInputRef.current.value = ''
    }
  }

  const removeSignature = () => {
    setSignature('')
    setSignatureFile(null)
    if (signatureInputRef.current) {
      signatureInputRef.current.value = ''
    }
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

      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(companyPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save company');
      }

      const savedCompany = await response.json();

      if (data.isActive) {
        const setActiveResponse = await fetch('/api/companies/active', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ companyId: savedCompany.id }),
        });

        if (!setActiveResponse.ok) {
          // Non-critical error, so just alert the user
          alert('Company saved, but failed to set it as active.');
        }
      }

      alert('Company saved successfully!');
      router.push('/dashboard/companies');
    } catch (error) {
      alert('Failed to save company: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const validateGSTIN = (value?: string) => {
    if (!value) return true // Optional field
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Add New Company"
        subtitle="Create a new company profile with logo and signature"
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Logo and Signature Upload */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Branding</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {logo ? (
                  <div className="relative">
                    <img
                      src={logo}
                      alt="Company Logo"
                      className="max-h-32 mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">Upload Company Logo</p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  {logo ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>
            </div>

            {/* Signature Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Digital Signature
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {signature ? (
                  <div className="relative">
                    <img
                      src={signature}
                      alt="Digital Signature"
                      className="max-h-32 mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeSignature}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <FileSignature className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">Upload Digital Signature</p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                )}
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => signatureInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  {signature ? 'Change Signature' : 'Upload Signature'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('businessName', { required: 'Business name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter business name"
              />
              {errors.businessName && (
                <p className="mt-1 text-sm text-red-600">{errors.businessName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('phoneNumber', { 
                  required: 'Phone number is required',
                  validate: validatePhone
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GSTIN
              </label>
              <input
                type="text"
                {...register('gstin', { validate: validateGSTIN })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter GSTIN"
              />
              {errors.gstin && (
                <p className="mt-1 text-sm text-red-600">{errors.gstin.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email ID <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('emailId', { 
                  required: 'Email is required',
                  validate: validateEmail
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
              />
              {errors.emailId && (
                <p className="mt-1 text-sm text-red-600">{errors.emailId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('businessType', { required: 'Business type is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.businessType && (
                <p className="mt-1 text-sm text-red-600">{errors.businessType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Category <span className="text-red-500">*</span>
              </label>
              <select
                {...register('businessCategory', { required: 'Business category is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select business category</option>
                {BUSINESS_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
              {errors.businessCategory && (
                <p className="mt-1 text-sm text-red-600">{errors.businessCategory.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                {...register('state', { required: 'State is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('pincode', { 
                  required: 'Pincode is required',
                  validate: validatePincode
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter pincode"
              />
              {errors.pincode && (
                <p className="mt-1 text-sm text-red-600">{errors.pincode.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Address <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('businessAddress', { required: 'Business address is required' })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter complete business address"
            />
            {errors.businessAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.businessAddress.message}</p>
            )}
          </div>

          <div className="mt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('isActive')}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Set as active company</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Company'}
          </button>
        </div>
      </form>
    </div>
  )
}
