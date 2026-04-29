import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { 
  Loader2, Plus, RefreshCw, X, Edit3, Trash2,
  TrendingUp, Users, Package, Image, 
  CheckCircle, Clock, Building, Mail, Phone,
  Tag, Layers, DollarSign, Link, AlertCircle
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

const emptyProductForm = {
  product_code: '',
  category: '',
  name: '',
  short_description: '',
  description: '',
  price_rwf: '',
  max_quantity: '',
  partner_org_id: '',
  media: [],
  is_active: true,
};

const emptyPartnerForm = {
  org_name: '',
  partner_code: '',
  login_username: '',
  contact_email: '',
  contact_phone: '',
  description: '',
  logo: null,
  is_active: true,
};

function toErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function fmtMoney(value) {
  return `${Number(value || 0).toLocaleString()} RWF`;
}

function toAssetUrl(pathLike) {
  if (!pathLike || typeof pathLike !== 'string') return null;
  if (pathLike.startsWith('http://') || pathLike.startsWith('https://')) return pathLike;
  const clean = pathLike.replace(/\\/g, '/');
  return `${UPLOADS_BASE}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

// Gradient Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, gradient, color }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 shadow-lg`}>
    <div className="absolute top-0 right-0 opacity-10">
      <Icon size={80} />
    </div>
    <div className="relative">
      <div className={`inline-flex rounded-xl ${color} p-2 mb-3`}>
        <Icon size={20} />
      </div>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      <p className="text-sm font-medium text-white/80 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-white/60 mt-2">{subtitle}</p>}
    </div>
  </div>
);

// Modern Table Component
const ModernTable = ({ columns, data, loading, emptyMessage }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-indigo-500 mb-3" />
        <p className="text-sm text-gray-500">Loading data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package size={48} className="text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, idx) => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-6 py-4 text-sm">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, onEdit, onDelete, fmtMoney }) => (
  <div className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200">
    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => onEdit(product)}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        <Edit3 size={14} />
      </button>
      <button
        onClick={() => onDelete(product.id)}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
    
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 pr-16">{product.name}</h3>
        {product.product_code && (
          <p className="text-xs text-gray-500 font-mono mt-0.5">{product.product_code}</p>
        )}
      </div>
      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        product.is_active 
          ? 'bg-emerald-50 text-emerald-700' 
          : 'bg-gray-100 text-gray-500'
      }`}>
        {product.is_active ? 'Active' : 'Inactive'}
      </div>
    </div>
    
    {product.short_description && (
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.short_description}</p>
    )}
    
    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
      {product.category && (
        <span className="flex items-center gap-1">
          <Tag size={12} />
          {product.category}
        </span>
      )}
      <span className="flex items-center gap-1">
        <DollarSign size={12} />
        {fmtMoney(product.price_rwf)}
      </span>
      {product.max_quantity && (
        <span className="flex items-center gap-1">
          <Layers size={12} />
          Max: {product.max_quantity}
        </span>
      )}
    </div>
    
    {product.partner_org_name && (
      <div className="flex items-center gap-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <Building size={12} />
        <span>{product.partner_org_name}</span>
      </div>
    )}
  </div>
);

// Partner Card Component
const PartnerCard = ({ partner, onEdit, onDelete }) => (
  <div className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200">
    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => onEdit(partner)}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        <Edit3 size={14} />
      </button>
      <button
        onClick={() => onDelete(partner)}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
    
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 pr-16">{partner.org_name}</h3>
        <p className="text-xs text-gray-500 font-mono mt-0.5">@{partner.login_username}</p>
      </div>
      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        partner.is_active 
          ? 'bg-emerald-50 text-emerald-700' 
          : 'bg-gray-100 text-gray-500'
      }`}>
        {partner.is_active ? 'Active' : 'Inactive'}
      </div>
    </div>
    
    <div className="space-y-2 text-xs text-gray-600 mb-3">
      <div className="flex items-center gap-2">
        <Mail size={12} className="text-gray-400" />
        <span>{partner.contact_email}</span>
      </div>
      {partner.contact_phone && (
        <div className="flex items-center gap-2">
          <Phone size={12} className="text-gray-400" />
          <span>{partner.contact_phone}</span>
        </div>
      )}
      {partner.partner_code && (
        <div className="flex items-center gap-2">
          <Link size={12} className="text-gray-400" />
          <span className="font-mono">{partner.partner_code}</span>
        </div>
      )}
    </div>
    
    {partner.description && (
      <p className="text-xs text-gray-500 pt-2 border-t border-gray-100 line-clamp-2">
        {partner.description}
      </p>
    )}
  </div>
);

export default function TeacherDealPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingPartner, setSavingPartner] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [partnerForm, setPartnerForm] = useState(emptyPartnerForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await axios.get(`${API}/services/shule-avance/admin/teacher-deal-products`, {
        params: { include_inactive: 1 },
        withCredentials: true,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not load products');
      setProducts(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      setProducts([]);
      setError(toErrorMessage(err, 'Failed to load products.'));
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadPartners = async () => {
    setLoadingPartners(true);
    try {
      const res = await axios.get(`${API}/services/shule-avance/admin/teacher-deal-partners`, {
        withCredentials: true,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not load partners');
      setPartners(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      setPartners([]);
      setError(toErrorMessage(err, 'Failed to load partners.'));
    } finally {
      setLoadingPartners(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setError('');
    setMessage('');
    await Promise.all([loadProducts(), loadPartners()]);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
  };

  const resetPartnerForm = () => {
    setEditingPartnerId(null);
    setPartnerForm(emptyPartnerForm);
  };

  const openNewProductModal = () => {
    resetProductForm();
    setProductModalOpen(true);
    setError('');
    setMessage('');
  };

  const openNewPartnerModal = () => {
    resetPartnerForm();
    setPartnerModalOpen(true);
    setError('');
    setMessage('');
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    setSavingProduct(true);
    setError('');
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('product_code', String(productForm.product_code || '').trim());
      fd.append('category', String(productForm.category || '').trim());
      fd.append('name', String(productForm.name || '').trim());
      fd.append('short_description', String(productForm.short_description || '').trim());
      fd.append('description', String(productForm.description || '').trim());
      fd.append('price_rwf', String(productForm.price_rwf || '').trim());
      fd.append('max_quantity', String(productForm.max_quantity || '').trim());
      fd.append('is_active', productForm.is_active ? '1' : '0');
      if (productForm.partner_org_id) fd.append('partner_org_id', String(productForm.partner_org_id));
      productForm.media.forEach((file) => fd.append('media', file));

      const method = editingProductId ? 'put' : 'post';
      const url = editingProductId
        ? `${API}/services/shule-avance/admin/teacher-deal-products/${editingProductId}`
        : `${API}/services/shule-avance/admin/teacher-deal-products`;
      const res = await axios[method](url, fd, { withCredentials: true });
      if (!res.data?.success) throw new Error(res.data?.message || 'Save failed');
      setMessage(editingProductId ? 'Product updated successfully.' : 'Product created successfully.');
      setProductModalOpen(false);
      resetProductForm();
      await loadProducts();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to save product.'));
    } finally {
      setSavingProduct(false);
    }
  };

  const handlePartnerSubmit = async (event) => {
    event.preventDefault();
    setSavingPartner(true);
    setError('');
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('org_name', String(partnerForm.org_name || '').trim());
      fd.append('partner_code', String(partnerForm.partner_code || '').trim() || '');
      fd.append('login_username', String(partnerForm.login_username || '').trim());
      fd.append('contact_email', String(partnerForm.contact_email || '').trim());
      fd.append('contact_phone', String(partnerForm.contact_phone || '').trim() || '');
      fd.append('description', String(partnerForm.description || '').trim() || '');
      fd.append('is_active', partnerForm.is_active ? '1' : '0');
      if (partnerForm.logo) fd.append('logo', partnerForm.logo);

      const method = editingPartnerId ? 'put' : 'post';
      const url = editingPartnerId
        ? `${API}/services/shule-avance/admin/teacher-deal-partners/${editingPartnerId}`
        : `${API}/services/shule-avance/admin/teacher-deal-partners`;
      const res = await axios[method](url, fd, { withCredentials: true });
      if (!res.data?.success) throw new Error(res.data?.message || 'Save failed');
      setMessage(editingPartnerId ? 'Partner updated successfully.' : 'Partner created successfully.');
      setPartnerModalOpen(false);
      resetPartnerForm();
      await loadPartners();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to save partner.'));
    } finally {
      setSavingPartner(false);
    }
  };

  const startProductEdit = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      product_code: product.product_code || '',
      category: product.category || '',
      name: product.name || '',
      short_description: product.short_description || '',
      description: product.description || '',
      price_rwf: String(product.price_rwf || ''),
      max_quantity: product.max_quantity ? String(product.max_quantity) : '',
      partner_org_id: product.partner_org_id || '',
      media: [],
      is_active: product.is_active,
    });
    setProductModalOpen(true);
    setError('');
    setMessage('');
  };

  const startPartnerEdit = (partner) => {
    setEditingPartnerId(partner.id);
    setPartnerForm({
      org_name: partner.org_name || '',
      partner_code: partner.partner_code || '',
      login_username: partner.login_username || '',
      contact_email: partner.contact_email || '',
      contact_phone: partner.contact_phone || '',
      description: partner.description || '',
      logo: null,
      is_active: partner.is_active,
    });
    setPartnerModalOpen(true);
    setError('');
    setMessage('');
  };

  const removeProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    setError('');
    setMessage('');
    try {
      const res = await axios.delete(`${API}/services/shule-avance/admin/teacher-deal-products/${id}`, { withCredentials: true });
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      setMessage('Product deleted.');
      await loadProducts();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to delete product.'));
    }
  };

  const removePartner = async (partner) => {
    if (!window.confirm(`Delete partner ${partner.org_name}?`)) return;
    setError('');
    setMessage('');
    try {
      const res = await axios.delete(`${API}/services/shule-avance/admin/teacher-deal-partners/${partner.id}`, { withCredentials: true });
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      setMessage('Partner deleted.');
      await loadPartners();
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to delete partner.'));
    }
  };

  const activeProducts = useMemo(() => products.filter((item) => item.is_active).length, [products]);
  const activePartners = useMemo(() => partners.filter((item) => item.is_active).length, [partners]);
  const avgPrice = useMemo(() => {
    if (products.length === 0) return 0;
    const sum = products.reduce((acc, p) => acc + (p.price_rwf || 0), 0);
    return Math.round(sum / products.length);
  }, [products]);
  const totalMedia = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.media?.length || 0), 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.product_code?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.partner_org_name?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const filteredPartners = useMemo(() => {
    if (!searchQuery) return partners;
    const query = searchQuery.toLowerCase();
    return partners.filter(p => 
      p.org_name?.toLowerCase().includes(query) ||
      p.login_username?.toLowerCase().includes(query) ||
      p.contact_email?.toLowerCase().includes(query)
    );
  }, [partners, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-1 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full"></div>
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Shulé Avancé</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Teacher Deal Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Manage products, partners, and catalog assignments</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={refreshData}
                disabled={loadingProducts || loadingPartners}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={16} className={loadingProducts || loadingPartners ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={activeTab === 'products' ? openNewProductModal : openNewPartnerModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm"
              >
                <Plus size={16} />
                Add {activeTab === 'products' ? 'Product' : 'Partner'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">{message}</p>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <StatCard
            title="Total Products"
            value={products.length}
            subtitle={`${activeProducts} active`}
            icon={Package}
            gradient="from-indigo-500 to-indigo-700"
            color="bg-white/20"
          />
          <StatCard
            title="Partners"
            value={partners.length}
            subtitle={`${activePartners} active`}
            icon={Users}
            gradient="from-purple-500 to-purple-700"
            color="bg-white/20"
          />
          <StatCard
            title="Average Price"
            value={avgPrice.toLocaleString()}
            subtitle="RWF"
            icon={TrendingUp}
            gradient="from-emerald-500 to-emerald-700"
            color="bg-white/20"
          />
          <StatCard
            title="Media Files"
            value={totalMedia}
            subtitle="across all products"
            icon={Image}
            gradient="from-amber-500 to-amber-700"
            color="bg-white/20"
          />
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'products'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package size={16} />
                Products
              </div>
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'partners'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} />
                Partners
              </div>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'products' ? 'products by name, code, category...' : 'partners by name, username, email...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Content Grid */}
        {activeTab === 'products' ? (
          loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
              <p className="text-gray-500">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
              <Package size={64} className="text-gray-300 mb-4" />
              <p className="text-gray-500 text-center">
                {searchQuery ? 'No products match your search.' : 'No products added yet.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={openNewProductModal}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Plus size={16} />
                  Add your first product
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={startProductEdit}
                  onDelete={removeProduct}
                  fmtMoney={fmtMoney}
                />
              ))}
            </div>
          )
        ) : loadingPartners ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
            <p className="text-gray-500">Loading partners...</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
            <Users size={64} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              {searchQuery ? 'No partners match your search.' : 'No partners added yet.'}
            </p>
            {!searchQuery && (
              <button
                onClick={openNewPartnerModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Plus size={16} />
                Add your first partner
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPartners.map((partner) => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                onEdit={startPartnerEdit}
                onDelete={removePartner}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingProductId ? 'Edit Product' : 'Add Product'}</h2>
                <p className="text-sm text-gray-500 mt-1">Fill in the product details below</p>
              </div>
              <button
                onClick={() => setProductModalOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-5" onSubmit={handleProductSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Code</label>
                  <input
                    value={productForm.product_code}
                    onChange={(e) => setProductForm(prev => ({ ...prev, product_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g., TD-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g., Books, Software"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                <input
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
                <input
                  value={productForm.short_description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, short_description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Brief summary (max 100 chars)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Detailed product description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (RWF) <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={productForm.price_rwf}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price_rwf: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.max_quantity}
                    onChange={(e) => setProductForm(prev => ({ ...prev, max_quantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Unlimited if empty"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partner (optional)</label>
                <select
                  value={productForm.partner_org_id || ''}
                  onChange={(e) => setProductForm(prev => ({ ...prev, partner_org_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="">No partner</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.org_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Media Files</label>
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  multiple
                  onChange={(e) => setProductForm(prev => ({ ...prev, media: Array.from(e.target.files || []) }))}
                  className="w-full text-sm"
                />
                {productForm.media.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">{productForm.media.length} file(s) selected</p>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.is_active}
                  onChange={(e) => setProductForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Active product</span>
              </label>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-all"
                >
                  {savingProduct && <Loader2 size={16} className="animate-spin" />}
                  {editingProductId ? 'Update Product' : 'Create Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partner Modal */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingPartnerId ? 'Edit Partner' : 'Add Partner'}</h2>
                <p className="text-sm text-gray-500 mt-1">Create a reserved teacher deal partner</p>
              </div>
              <button
                onClick={() => setPartnerModalOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-5" onSubmit={handlePartnerSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name <span className="text-red-500">*</span></label>
                <input
                  required
                  value={partnerForm.org_name}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, org_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g., ABC School"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                <input
                  required
                  value={partnerForm.login_username}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, login_username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Username for login"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  required
                  type="email"
                  value={partnerForm.contact_email}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, contact_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="contact@school.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partner Code</label>
                  <input
                    value={partnerForm.partner_code}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, partner_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Unique code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={partnerForm.contact_phone}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Contact number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={partnerForm.description}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Additional notes about this partner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Logo</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, logo: e.target.files?.[0] || null }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all flex items-center justify-between pointer-events-none">
                    <span className="truncate">
                      {partnerForm.logo 
                        ? partnerForm.logo.name 
                        : 'Select logo image...'}
                    </span>
                    <Image size={16} className="text-indigo-500" />
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={partnerForm.is_active}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Active partner</span>
              </label>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={savingPartner}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-all"
                >
                  {savingPartner && <Loader2 size={16} className="animate-spin" />}
                  {editingPartnerId ? 'Update Partner' : 'Create Partner'}
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}