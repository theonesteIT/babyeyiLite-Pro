import { Edit3, Trash2, Mail, Phone, Building, User } from 'lucide-react';

export default function TeacherDealPartnersTable({ rows, loading, onEdit, onDelete }) {
    return (
        <div className="rounded-3xl border-2 border-amber-100 bg-white shadow-xl overflow-hidden anim-fade-in">
            {/* Table Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin"></div>
                    <p className="text-xs font-black text-amber-800 uppercase tracking-widest mt-4">Loading Partners...</p>
                </div>
            ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4 border-2 border-amber-100">
                        <Building size={40} className="text-amber-300" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">No Partners Registered</h3>
                    <p className="text-xs text-amber-700 mt-2 max-w-xs mx-auto font-medium">Verified deal partners will appear here once they are registered in the system.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-amber-50/50 border-b-2 border-amber-100">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Partner Entity</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Contact Channels</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Identity Code</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-amber-800 uppercase tracking-widest">Access Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-amber-800 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50">
                            {rows.map((partner) => (
                                <tr key={partner.id} className="hover:bg-amber-50/30 transition-colors duration-150 group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 text-sm group-hover:text-amber-900 transition-colors">{partner.org_name}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <User size={10} className="text-amber-500" />
                                                <span className="text-[10px] text-amber-700 font-black font-mono">@{partner.login_username}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                                <Mail size={12} className="text-amber-400" />
                                                <span>{partner.contact_email}</span>
                                            </div>
                                            {partner.contact_phone && (
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                                    <Phone size={12} className="text-amber-400" />
                                                    <span>{partner.contact_phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {partner.partner_code ? (
                                            <code className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded text-gray-700 border border-gray-200 uppercase tracking-wider">
                                                {partner.partner_code}
                                            </code>
                                        ) : (
                                            <span className="text-gray-300 text-[10px] font-bold italic">No Code Assigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${partner.is_active
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${partner.is_active ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'}`} />
                                            {partner.is_active ? 'Authorized' : 'Restricted'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEdit(partner)}
                                                className="p-2 rounded-xl text-amber-700 hover:bg-amber-100 hover:text-amber-900 border border-transparent hover:border-amber-200 transition-all"
                                                title="Edit Partner"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(partner)}
                                                className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100 transition-all"
                                                title="Remove Partner"
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