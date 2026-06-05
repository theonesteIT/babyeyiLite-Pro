import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assetsHref } from '../../../assets_portal/config/portal'
import { Upload, X, FileText, CreditCard, BookOpen, Save } from 'lucide-react'
import { QRCode } from 'react-qr-code'

export default function AddAsset() {
  const navigate = useNavigate()
  const [images, setImages] = useState([])
  const [qrValue] = useState('AST-' + Date.now().toString(36).toUpperCase())

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    setImages(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Add New Asset</h2>
        <p className="text-gray-500 text-sm mt-1">Register a new asset in the system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-navy mb-4">Asset Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name *</label>
                <input type="text" className="input-field" placeholder="Enter asset name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Code *</label>
                <input type="text" className="input-field" placeholder="e.g. IT-LAP-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                <input type="text" className="input-field" placeholder="Scan or enter barcode" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">QR Code</label>
                <input type="text" className="input-field" value={qrValue} readOnly />
              </div>
            </div>
          </div>

          {/* Category Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-navy mb-4">Category Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select className="select-field">
                  <option>Select category</option>
                  <option>IT Equipment</option>
                  <option>Furniture</option>
                  <option>Vehicles</option>
                  <option>Electronics</option>
                  <option>Machinery</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
                <select className="select-field">
                  <option>Select sub category</option>
                  <option>Laptops</option>
                  <option>Desktops</option>
                  <option>Printers</option>
                  <option>Servers</option>
                </select>
              </div>
            </div>
          </div>

          {/* Purchase Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-navy mb-4">Purchase Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
                <input type="date" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <input type="text" className="input-field" placeholder="Supplier name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost *</label>
                <input type="number" className="input-field" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input type="text" className="input-field" placeholder="INV-001" />
              </div>
            </div>
          </div>

          {/* Warranty Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-navy mb-4">Warranty Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Provider</label>
                <input type="text" className="input-field" placeholder="Provider name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Start</label>
                <input type="date" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty End</label>
                <input type="date" className="input-field" />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="card">
            <h3 className="text-lg font-semibold text-navy mb-4">Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <input type="text" className="input-field" placeholder="Main Branch" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                <input type="text" className="input-field" placeholder="Building A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <input type="text" className="input-field" placeholder="Floor 2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input type="text" className="input-field" placeholder="Room 201" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* QR Code */}
          <div className="card">
            <h3 className="text-lg font-semibold text-navy mb-4">QR Code</h3>
            <div className="flex justify-center">
              <QRCode value={qrValue} size={160} bgColor="#ffffff" fgColor="#000435" />
            </div>
            <button className="btn-outline w-full mt-4 text-sm">Download QR</button>
          </div>

          {/* Asset Images */}
          <div className="card">
            <h3 className="text-lg font-semibold text-navy mb-4">Asset Images</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt="" className="w-full h-24 object-cover rounded-lg" />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                </div>
              ))}
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-amber-500 transition-colors">
              <Upload size={20} className="text-gray-400 mb-1" />
              <span className="text-sm text-gray-500">Upload images</span>
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          {/* Documents */}
          <div className="card">
            <h3 className="text-lg font-semibold text-navy mb-4">Documents</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                <FileText size={18} className="text-gray-400" />
                <span className="text-sm text-gray-600">Invoice</span>
                <input type="file" className="hidden" />
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                <CreditCard size={18} className="text-gray-400" />
                <span className="text-sm text-gray-600">Warranty Card</span>
                <input type="file" className="hidden" />
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                <BookOpen size={18} className="text-gray-400" />
                <span className="text-sm text-gray-600">Manuals</span>
                <input type="file" className="hidden" />
              </label>
            </div>
          </div>

          <button onClick={() => navigate(assetsHref('/inventory'))} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Save size={18} /> Save Asset
          </button>
        </div>
      </div>
    </div>
  )
}
