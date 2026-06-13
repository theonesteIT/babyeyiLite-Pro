import { useState } from 'react';
import { Brain, X, Send, Sparkles } from 'lucide-react';

const suggestions = [
  'Why is Class 2B performing poorly?',
  'Which students need urgent intervention?',
  'Generate lesson revision plan',
  'Predict exam pass rate',
  'Suggest remediation activities for CBC',
];

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const responses: Record<string, string> = {
  'why is class 2b performing poorly?': '**Class 2B Performance Analysis**\n\n📉 **Key Issues Identified:**\n- Low attendance rate (62%)\n- Weak Algebra mastery (45% average)\n- 6 at-risk learners identified\n\n📊 **Comparison with Class 2A:**\n- 2B average: 58% vs 2A average: 74%\n- Pass rate: 52% vs 78%\n\n✅ **Recommendations:**\n1. Conduct remedial classes for Algebra\n2. Implement attendance tracking system\n3. Parent meetings for at-risk students',
  'which students need urgent intervention?': '**Urgent Intervention Required**\n\n🔴 **High Risk Students:**\n1. **David Niyonzima** - Avg: 38%, Attendance: 60%\n2. **Samuel Nkundiye** - Avg: 35%, Attendance: 45%\n3. **Eric Hakizimana** - Avg: 45%, Attendance: 78%\n\n🟡 **Medium Risk:**\n4. **Angelique Uwase** - Avg: 42%, Attendance: 70%\n\n⚡ **Recommended Actions:**\n- Immediate parent meetings\n- Weekly progress monitoring\n- Peer tutoring program',
  'generate lesson revision plan': '**Revision Plan Generator**\n\n📚 **Recommended Revision Schedule:**\n\n**Week 1: Foundation Review**\n- Key concepts from Term 1\n- Practice exercises\n\n**Week 2: Weak Areas Focus**\n- Algebra (target: 45%→65%)\n- Problem-solving techniques\n\n**Week 3: Exam Preparation**\n- Past paper practice\n- Time management skills\n\n**Assessment:** End of week test to measure improvement',
  'predict exam pass rate': '**Pass Rate Prediction**\n\n📊 **Current Trend Analysis:**\n- Term 1: 72%\n- Term 2: 76%\n- Term 3: 81%\n\n🔮 **Predicted End-Term Pass Rate: 78-84%**\n\n⚠️ **Risk Factors:**\n- 7 students below 40% need intervention\n- Attendance decline in 2B class\n\n✅ **To improve prediction:**\n- Increase revision sessions\n- Target bottom 10 students',
  'suggest remediation activities for cbc': '**CBC Remediation Activities**\n\n🧠 **Competency-Based Interventions:**\n\n**1. Critical Thinking**\n- Group debates on topics\n- Case study analysis\n\n**2. Communication**\n- Presentation exercises\n- Peer teaching sessions\n\n**3. Problem Solving**\n- Project-based learning\n- Real-world problem scenarios\n\n📋 **Tracking:** Competency rubric assessment every 2 weeks',
};

export default function AIAssistant({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hello! I\'m your AI Teaching Assistant. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (text: string) => {
    const userMsg = text.trim();
    if (!userMsg) return;

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    setTimeout(() => {
      const response = responses[userMsg.toLowerCase()] || 'I\'ll analyze that for you. Could you provide more details? You can ask about class performance, at-risk students, revision plans, exam predictions, or CBC activities.';
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    }, 800);
  };

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between p-4 border-b bg-navy text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-amber" />
          <span className="font-semibold">AI Teaching Assistant</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-amber text-navy rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
              {msg.text.split('\n').map((line, j) => {
                const rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return <p key={j} dangerouslySetInnerHTML={{ __html: rendered || '\u00A0' }} />;
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t bg-gray-50 rounded-b-2xl">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-full hover:bg-amber/10 hover:border-amber/30 transition-colors text-gray-600"
            >
              <Sparkles size={10} className="inline mr-1 text-amber" />
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask anything..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber/50"
          />
          <button
            onClick={() => handleSend(input)}
            className="p-2 bg-navy text-white rounded-lg hover:bg-navy-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
