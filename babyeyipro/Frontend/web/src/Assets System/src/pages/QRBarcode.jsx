import { useState } from 'react'
import { QRCode } from 'react-qr-code'
import { QrCode, Printer, Download, FileText } from 'lucide-react'
import { assets } from '../data/mockData'

export default function QRBarcode() {
  const [mode, setMode] = useState('single')
  const [qrValue, setQrValue] = useState('AST-001')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">QR & Barcode Center</h2>
        <p className="text-gray-500 text-sm mt-1">Generate and print QR codes and barcodes for assets</p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2">
        <button onClick={() => setMode('single')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'single' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <QrCode size={16} className="inline mr-1.5" /> Single QR
        </button>
        <button onClick={() => setMode('bulk')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'bulk' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <FileText size={16} className="inline mr-1.5" /> Bulk QR
        </button>
        <button onClick={() => setMode('label')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'label' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Printer size={16} className="inline mr-1.5" /> Barcode Labels
        </button>
      </div>

      {/* Single QR */}
      {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-navy mb-4">Generate QR Code</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Asset</label>
              <select className="select-field" onChange={e => setQrValue(e.target.value)}>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name} - {a.code}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex items-center gap-1.5"><Download size={16} /> Download</button>
              <button className="btn-outline flex items-center gap-1.5"><Printer size={16} /> Print</button>
            </div>
          </div>
          <div className="card flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-navy mb-4">Preview</h3>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <QRCode value={qrValue} size={180} bgColor="#ffffff" fgColor="#000435" />
            </div>
            <p className="text-sm text-gray-500 mt-3 font-mono">{qrValue}</p>
          </div>
        </div>
      )}

      {/* Bulk QR */}
      {mode === 'bulk' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-navy mb-4">Bulk QR Generation</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {assets.slice(0, 8).map((a) => (
              <div key={a.id} className="border border-gray-200 rounded-xl p-3 text-center hover:border-amber-500 transition-colors">
                <QRCode value={a.id} size={100} bgColor="#ffffff" fgColor="#000435" className="mx-auto" />
                <p className="text-xs font-medium text-navy mt-2 truncate">{a.code}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-primary flex items-center gap-1.5"><Download size={16} /> Download All</button>
            <button className="btn-outline flex items-center gap-1.5"><Printer size={16} /> Print All</button>
          </div>
        </div>
      )}

      {/* Labels */}
      {mode === 'label' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-navy mb-4">Print Options</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-amber-500 transition-colors">
              <Printer size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="font-medium text-navy">A4 Labels</p>
              <p className="text-xs text-gray-500 mt-1">Print on A4 label sheets</p>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-amber-500 transition-colors">
              <Printer size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="font-medium text-navy">Sticker Format</p>
              <p className="text-xs text-gray-500 mt-1">Print individual stickers</p>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-amber-500 transition-colors">
              <QrCode size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="font-medium text-navy">Asset Tags</p>
              <p className="text-xs text-gray-500 mt-1">Pre-formatted asset tags</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
