import { useState } from 'react';
import { Send, MessageSquare, Phone, Mail, FileText, Bell, Calendar, CheckCircle } from 'lucide-react';

const templates = [
  { name: 'Excellent Performance', content: 'Dear Parent/Guardian,\n\nWe are pleased to inform you that your child has shown excellent academic performance this term. Their dedication and hard work are commendable.\n\nBest regards,\nClass Teacher' },
  { name: 'Needs Improvement', content: 'Dear Parent/Guardian,\n\nWe would like to bring to your attention that your child needs to improve in certain subjects. We recommend additional support at home and extra tutoring sessions.\n\nBest regards,\nClass Teacher' },
  { name: 'Meeting Invitation', content: 'Dear Parent/Guardian,\n\nWe would like to invite you for a meeting to discuss your child\'s academic progress and develop a plan for improvement.\n\nBest regards,\nClass Teacher' },
];

const parents = [
  { id: 'P001', name: 'Marie Hakizimana', student: 'Eric Hakizimana', phone: '+250 788 XXX XXX', email: 'marie@email.com' },
  { id: 'P002', name: 'Jean Niyonzima', student: 'David Niyonzima', phone: '+250 722 XXX XXX', email: 'jean@email.com' },
  { id: 'P003', name: 'Esther Mugabo', student: 'Grace Mugabo', phone: '+250 733 XXX XXX', email: 'esther@email.com' },
  { id: 'P004', name: 'Patrick Ishimwe', student: 'Diane Ishimwe', phone: '+250 788 XXX XXX', email: 'patrick@email.com' },
];

export default function ParentCommunication() {
  const [selectedParent, setSelectedParent] = useState(parents[0]);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [message, setMessage] = useState(templates[0].content);
  const [sent, setSent] = useState(false);

  const handleTemplateChange = (name: string) => {
    const t = templates.find(t => t.name === name)!;
    setSelectedTemplate(t);
    setMessage(t.content);
  };

  const handleSend = () => {
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Parent Communication</h1>
        <p className="text-gray-500 text-sm mt-1">Send academic updates, alerts, and meeting invitations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-navy text-sm">Parents</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {parents.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedParent(p)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${selectedParent.id === p.id ? 'bg-amber/5 border-l-2 border-amber' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold">
                    {p.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{p.name}</p>
                    <p className="text-xs text-gray-400">Parent of: {p.student}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 mt-4">
            <h3 className="font-semibold text-navy text-sm mb-3">Communication Channels</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm hover:bg-blue-50 transition-colors">
                <Phone size={14} className="text-blue-500" /> SMS
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm hover:bg-blue-50 transition-colors">
                <Mail size={14} className="text-blue-500" /> Email
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm hover:bg-green-50 transition-colors">
                <MessageSquare size={14} className="text-green-500" /> WhatsApp
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm hover:bg-amber/10 transition-colors">
                <Bell size={14} className="text-amber" /> Push Notification
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <h3 className="font-semibold text-navy mb-4">
              Message to {selectedParent.name}
              <span className="text-sm font-normal text-gray-400 ml-2">(Parent of {selectedParent.student})</span>
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Template</label>
              <select
                value={selectedTemplate.name}
                onChange={e => handleTemplateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none"
              >
                {templates.map(t => <option key={t.name}>{t.name}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => setMessage(message + '\n\n---\nAcademic Performance Report Attached')} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200 transition-colors">
                  <FileText size={12} /> Attach Report
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200 transition-colors">
                  <Calendar size={12} /> Schedule Meeting
                </button>
              </div>
              <div className="flex items-center gap-2">
                {sent && (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle size={16} /> Sent successfully
                  </span>
                )}
                <button onClick={handleSend} className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
                  <Send size={16} /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
