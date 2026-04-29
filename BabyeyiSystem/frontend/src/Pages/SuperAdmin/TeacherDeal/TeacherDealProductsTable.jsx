import { Edit3, Trash2, Image as ImageIcon, FileText, Video, Package } from 'lucide-react';

export default function TeacherDealProductsTable({ 
  rows, 
  loading, 
  onEdit, 
  onDelete, 
  fmtMoney 
}) {
  const getMediaIcon = (mediaType) => {
    if (mediaType?.startsWith('image/')) return <ImageIcon size={12} />;
    if (mediaType?.startsWith('video/')) return <Video size={12} />;
    return <FileText size={12} />;
  };

  return (
    <div className="rounded-3xl border-2 border-amber-100 bg-white shadow-xl overflow-hidden anim-fade-in">
      {/* Table Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin"></div>
            <Package className="absolute inset-0 m-auto text-amber-500" size={20} />
          </div>
          <p className="text-xs font-black text-amber-800 uppercase tracking-widest mt-4">Syncing Catalog...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4 border-2 border-amber-100">
            <Package size={40} className="text-amber-300" />
          </div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">No Products Found</h3>
          <p className="text-xs text-amber-700 mt-2 max-w-xs mx-auto font-medium">The teacher deal catalog is currently empty. Start by adding your first product.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-amber-50/50 border-b-2 border-amber-100">
                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Product Info</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Pricing</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Supplier</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Media</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-amber-800 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-amber-50/30 transition-colors duration-150 group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-gray-900 text-sm group-hover:text-amber-900 transition-colors">{row.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-[10px] font-black bg-amber-100/50 px-1.5 py-0.5 rounded text-amber-700">
                          {row.product_code || 'N/A'}
                        </code>
                        {row.short_description && (
                          <span className="text-[10px] text-amber-600 font-bold line-clamp-1 truncate max-w-[150px]">
                            {row.short_description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-gray-900 text-sm">{fmtMoney(row.price_rwf)}</span>
                      {row.max_quantity && (
                        <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter">Limit: {row.max_quantity} units</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                      {row.partner_org_name || 'Babyeyi Direct'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {row.category ? (
                      <span className="inline-flex px-2 py-1 text-[10px] font-black bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 uppercase tracking-wider">
                        {row.category}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-[10px] font-bold italic">Uncategorized</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {row.media && row.media.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-2">
                          {row.media.slice(0, 3).map((media, idx) => (
                            <div key={idx} className="w-6 h-6 rounded-full bg-white border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm">
                              {getMediaIcon(media.mime_type)}
                            </div>
                          ))}
                        </div>
                        {row.media.length > 3 && (
                          <span className="text-[10px] font-black text-amber-600">+{row.media.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <ImageIcon size={14} />
                        <span className="text-[10px] font-bold">None</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      row.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'}`} />
                      {row.is_active ? 'Active' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(row)}
                        className="p-2 rounded-xl text-amber-700 hover:bg-amber-100 hover:text-amber-900 border border-transparent hover:border-amber-200 transition-all"
                        title="Edit Record"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(row.id)}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100 transition-all"
                        title="Delete Permanently"
                      >
                        <Trash2 size={14} />
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
  );
}