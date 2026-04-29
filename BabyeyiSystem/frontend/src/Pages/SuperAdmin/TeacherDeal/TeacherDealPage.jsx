import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    Loader2, Plus, RefreshCw, X,
    TrendingUp, Users, Package, Image,
    CheckCircle, AlertCircle, ArrowLeft, Search, Building2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import TeacherDealProductsTable from './TeacherDealProductsTable';
import TeacherDealPartnersTable from './TeacherDealPartnersTable';
import {
    BABYEYI_NAVY, BABYEYI_AMBER, BABYEYI_FONT_STACK, BABYEYI_PAGE_BG
} from '../../../theme/babyeyiDashboardTheme';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

const ACCENT = BABYEYI_NAVY;
const GRAD = {
    primary: 'from-[#1F2937] to-[#111827]',
    blue: 'from-[#F59E0B] to-[#FBBF24]',
    indigo: 'from-[#4F46E5] to-[#4338CA]',
    violet: 'from-[#8B5CF6] to-[#7C3AED]',
    teal: 'from-[#0D9488] to-[#0F766E]',
    emerald: 'from-[#10B981] to-[#059669]',
    red: 'from-[#EF4444] to-[#DC2626]',
    amber: 'from-[#F59E0B] to-[#D97706]',
};

const inp = `w-full bg-amber-50/80 border-2 border-amber-200 text-gray-900 rounded-xl px-4 py-3 text-sm font-medium
  focus:outline-none focus:border-[#FEBF10] focus:ring-2 focus:ring-amber-100
  placeholder-amber-400 transition-all`;

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

// Gradient Card Component (Aligned with SuperAdmin StatCard)
const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', onClick }) => (
    <div
        onClick={onClick}
        className={`bg-gradient-to-br ${GRAD[color] || GRAD.blue} rounded-2xl p-5 shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer relative overflow-hidden select-none group`}
    >
        <div className="absolute top-[-10%] right-[-10%] opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Icon size={100} />
        </div>
        <div className="relative">
            <div className="inline-flex rounded-xl bg-white/20 p-2 mb-3">
                <Icon size={20} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-white">{value}</h3>
            <p className="text-xs font-bold text-white/90 uppercase tracking-wider">{title}</p>
            {subtitle && <p className="text-[10px] text-white/70 mt-1 font-medium">{subtitle}</p>}
        </div>
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
            const payload = {
                org_name: String(partnerForm.org_name || '').trim(),
                partner_code: String(partnerForm.partner_code || '').trim() || null,
                login_username: String(partnerForm.login_username || '').trim(),
                contact_email: String(partnerForm.contact_email || '').trim(),
                contact_phone: String(partnerForm.contact_phone || '').trim() || null,
                description: String(partnerForm.description || '').trim() || null,
                is_active: partnerForm.is_active ? 1 : 0,
            };
            const method = editingPartnerId ? 'put' : 'post';
            const url = editingPartnerId
                ? `${API}/services/shule-avance/admin/teacher-deal-partners/${editingPartnerId}`
                : `${API}/services/shule-avance/admin/teacher-deal-partners`;
            const res = await axios[method](url, payload, { withCredentials: true });
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
        <div className="min-h-screen" style={{ background: BABYEYI_PAGE_BG, fontFamily: BABYEYI_FONT_STACK }}>
            {/* Header */}
            <header className="sticky top-0 z-30 border-b-2 border-amber-100 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={() => navigate('/superadmin/dashboard')}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-amber-800 hover:bg-amber-50 border border-amber-200 shrink-0 transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-xs font-bold hidden sm:inline">Dashboard</span>
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-lg font-black text-gray-900 truncate flex items-center gap-2">
                                <Package className="w-5 h-5 text-amber-600 shrink-0 hidden sm:block" />
                                Ticha Deal Management
                            </h1>
                            <p className="text-[10px] text-amber-700 uppercase tracking-widest font-bold">EduPoto Pro System</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                            onClick={refreshData}
                            disabled={loadingProducts || loadingPartners}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-all"
                        >
                            <RefreshCw size={14} className={loadingProducts || loadingPartners ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            onClick={activeTab === 'products' ? openNewProductModal : openNewPartnerModal}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-black text-[#FEBF10] shadow-lg active:scale-[0.98] transition-all rounded-xl"
                            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #111827 100%)` }}
                        >
                            <Plus size={16} />
                            Add {activeTab === 'products' ? 'Product' : 'Partner'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Messages */}
                {message && (
                    <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center gap-3 anim">
                        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                        <p className="text-sm font-bold text-emerald-800">{message}</p>
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center gap-3 anim">
                        <AlertCircle size={18} className="text-red-600 shrink-0" />
                        <p className="text-sm font-bold text-red-800">{error}</p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        title="Total Products"
                        value={products.length}
                        subtitle={`${activeProducts} active currently`}
                        icon={Package}
                        color="indigo"
                    />
                    <StatCard
                        title="Active Partners"
                        value={partners.length}
                        subtitle={`${activePartners} verified partners`}
                        icon={Users}
                        color="violet"
                    />
                    <StatCard
                        title="Average Price"
                        value={avgPrice.toLocaleString()}
                        subtitle="Currency: RWF"
                        icon={TrendingUp}
                        color="emerald"
                    />
                    <StatCard
                        title="Catalog Assets"
                        value={totalMedia}
                        subtitle="Images/Videos uploaded"
                        icon={Image}
                        color="amber"
                    />
                </div>

                {/* Tab Navigation */}
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex gap-2 p-1.5 bg-amber-50/50 border-2 border-amber-100 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'products'
                                    ? 'bg-[#000435] text-[#FEBF10] shadow-md shadow-slate-900/20'
                                    : 'text-amber-800 hover:bg-amber-100'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Package size={14} />
                                Products
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('partners')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'partners'
                                    ? 'bg-[#000435] text-[#FEBF10] shadow-md shadow-slate-900/20'
                                    : 'text-amber-800 hover:bg-amber-100'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Users size={14} />
                                Partners
                            </div>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-50" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab === 'products' ? 'by name, code...' : 'by org, email...'}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${inp} pl-11`}
                        />
                    </div>
                </div>

                {/* Tables */}
                {activeTab === 'products' ? (
                    <TeacherDealProductsTable
                        rows={filteredProducts}
                        loading={loadingProducts}
                        onEdit={startProductEdit}
                        onDelete={removeProduct}
                        toAssetUrl={toAssetUrl}
                        fmtMoney={fmtMoney}
                    />
                ) : (
                    <TeacherDealPartnersTable
                        rows={filteredPartners}
                        loading={loadingPartners}
                        onEdit={startPartnerEdit}
                        onDelete={removePartner}
                    />
                )}
            </div>

            {/* Product Modal */}
            {productModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm anim-fade-in">
                    <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto border-2 border-amber-100 flex flex-col">
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b-2 border-amber-50 bg-white/95 backdrop-blur-md z-10">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">{editingProductId ? 'Edit Deal Product' : 'Add New Product'}</h2>
                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">Product Information Registry</p>
                            </div>
                            <button
                                onClick={() => setProductModalOpen(false)}
                                className="p-2 rounded-xl text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form className="p-6 space-y-5" onSubmit={handleProductSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Product Code</label>
                                    <input
                                        value={productForm.product_code}
                                        onChange={(e) => setProductForm(prev => ({ ...prev, product_code: e.target.value }))}
                                        className={inp}
                                        placeholder="e.g. TD-2026-X"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Category</label>
                                    <input
                                        value={productForm.category}
                                        onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                                        className={inp}
                                        placeholder="e.g. Laptops, Books"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                                    Product Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    value={productForm.name}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                                    className={inp}
                                    placeholder="Enter high-level product title"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Short Description</label>
                                <input
                                    value={productForm.short_description}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, short_description: e.target.value }))}
                                    className={inp}
                                    placeholder="Appears in catalog previews (max 100 chars)"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Detailed Description</label>
                                <textarea
                                    rows={4}
                                    value={productForm.description}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                                    className={`${inp} min-h-[100px] resize-none`}
                                    placeholder="Provide full specifications and deal terms..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                                        Price (RWF) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        value={productForm.price_rwf}
                                        onChange={(e) => setProductForm(prev => ({ ...prev, price_rwf: e.target.value }))}
                                        className={inp}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Max per Teacher</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={productForm.max_quantity}
                                        onChange={(e) => setProductForm(prev => ({ ...prev, max_quantity: e.target.value }))}
                                        className={inp}
                                        placeholder="Unlimited if blank"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Partner / Supplier</label>
                                    <select
                                        value={productForm.partner_org_id || ''}
                                        onChange={(e) => setProductForm(prev => ({ ...prev, partner_org_id: e.target.value }))}
                                        className={inp}
                                    >
                                        <option value="">Direct Babyeyi Deal</option>
                                        {partners.map(p => (
                                            <option key={p.id} value={p.id}>{p.org_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Upload Media</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            multiple
                                            onChange={(e) => setProductForm(prev => ({ ...prev, media: Array.from(e.target.files || []) }))}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className={`${inp} flex items-center justify-between pointer-events-none`}>
                                            <span className="truncate">
                                                {productForm.media.length > 0
                                                    ? `${productForm.media.length} files selected`
                                                    : 'Select images/videos...'}
                                            </span>
                                            <Image size={16} className="text-amber-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                                <input
                                    type="checkbox"
                                    id="prod-active"
                                    checked={productForm.is_active}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="w-5 h-5 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500 transition-all cursor-pointer"
                                />
                                <label htmlFor="prod-active" className="text-xs font-black text-amber-800 uppercase tracking-wider cursor-pointer select-none">
                                    Listed & Active in Catalog
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
                                <button
                                    type="submit"
                                    disabled={savingProduct}
                                    className="flex-1 px-6 py-3.5 text-sm font-black text-[#FEBF10] shadow-lg active:scale-[0.98] transition-all rounded-xl inline-flex items-center justify-center gap-2"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #111827 100%)` }}
                                >
                                    {savingProduct && <Loader2 size={18} className="animate-spin" />}
                                    {editingProductId ? 'Update Product Record' : 'Save New Product'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProductModalOpen(false)}
                                    className="px-6 py-3.5 border-2 border-amber-100 text-amber-800 font-bold rounded-xl hover:bg-amber-50 transition-all text-sm"
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm anim-fade-in">
                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto border-2 border-amber-100 flex flex-col">
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b-2 border-amber-50 bg-white/95 backdrop-blur-md z-10">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">{editingPartnerId ? 'Edit Partner' : 'Add New Partner'}</h2>
                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">Authorized Deal Supplier</p>
                            </div>
                            <button
                                onClick={() => setPartnerModalOpen(false)}
                                className="p-2 rounded-xl text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form className="p-6 space-y-5" onSubmit={handlePartnerSubmit}>
                            <div>
                                <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Organization Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={partnerForm.org_name}
                                    onChange={(e) => setPartnerForm(prev => ({ ...prev, org_name: e.target.value }))}
                                    className={inp}
                                    placeholder="e.g. Rwanda Tech Solutions"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">System Username <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={partnerForm.login_username}
                                    onChange={(e) => setPartnerForm(prev => ({ ...prev, login_username: e.target.value }))}
                                    className={inp}
                                    placeholder="Username for login"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Contact Email <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="email"
                                    value={partnerForm.contact_email}
                                    onChange={(e) => setPartnerForm(prev => ({ ...prev, contact_email: e.target.value }))}
                                    className={inp}
                                    placeholder="contact@supplier.rw"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Partner Code</label>
                                    <input
                                        value={partnerForm.partner_code}
                                        onChange={(e) => setPartnerForm(prev => ({ ...prev, partner_code: e.target.value }))}
                                        className={inp}
                                        placeholder="SUP-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Contact Phone</label>
                                    <input
                                        value={partnerForm.contact_phone}
                                        onChange={(e) => setPartnerForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                                        className={inp}
                                        placeholder="+250..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Organization Bio / Notes</label>
                                <textarea
                                    rows={3}
                                    value={partnerForm.description}
                                    onChange={(e) => setPartnerForm(prev => ({ ...prev, description: e.target.value }))}
                                    className={`${inp} min-h-[80px] resize-none`}
                                    placeholder="Brief description of the supplier..."
                                />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                                <input
                                    type="checkbox"
                                    id="partner-active"
                                    checked={partnerForm.is_active}
                                    onChange={(e) => setPartnerForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="w-5 h-5 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500 transition-all cursor-pointer"
                                />
                                <label htmlFor="partner-active" className="text-xs font-black text-amber-800 uppercase tracking-wider cursor-pointer select-none">
                                    Authorized Supplier Account
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={savingPartner}
                                    className="flex-1 px-6 py-3.5 text-sm font-black text-[#FEBF10] shadow-lg active:scale-[0.98] transition-all rounded-xl inline-flex items-center justify-center gap-2"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #111827 100%)` }}
                                >
                                    {savingPartner && <Loader2 size={18} className="animate-spin" />}
                                    {editingPartnerId ? 'Update Partner Info' : 'Register Partner'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPartnerModalOpen(false)}
                                    className="px-6 py-3.5 border-2 border-amber-100 text-amber-800 font-bold rounded-xl hover:bg-amber-50 transition-all text-sm"
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