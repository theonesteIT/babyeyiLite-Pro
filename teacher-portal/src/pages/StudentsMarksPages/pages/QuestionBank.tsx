import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

const questions = [
  { id: 'Q001', subject: 'Mathematics', topic: 'Algebra', type: 'Recall', difficulty: 'Medium', question: 'Solve for x: 2x + 5 = 13', class: 'Senior 3' },
  { id: 'Q002', subject: 'Mathematics', topic: 'Geometry', type: 'Application', difficulty: 'Hard', question: 'Calculate the area of a circle with radius 7cm', class: 'Senior 3' },
  { id: 'Q003', subject: 'English', topic: 'Grammar', type: 'Recall', difficulty: 'Easy', question: 'Identify the verb in the sentence', class: 'Senior 3' },
  { id: 'Q004', subject: 'Physics', topic: 'Mechanics', type: 'Analysis', difficulty: 'Hard', question: 'Explain how Newton\'s laws apply to this scenario', class: 'Senior 3' },
  { id: 'Q005', subject: 'Chemistry', topic: 'Reactions', type: 'Application', difficulty: 'Medium', question: 'Balance the chemical equation', class: 'Senior 3' },
];

export default function QuestionBank() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Question Bank</h1>
          <p className="text-gray-500 text-sm mt-1">Build and manage assessment questions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
          <Plus size={16} /> Add Question
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search questions..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none" />
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
            <option>All Subjects</option>
            <option>Mathematics</option>
            <option>English</option>
            <option>Physics</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
            <option>All Types</option>
            <option>Recall</option>
            <option>Application</option>
            <option>Analysis</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
            <option>All Difficulty</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map(q => (
          <div key={q.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 bg-navy text-white rounded-full">{q.subject}</span>
                  <span className="text-xs px-2 py-0.5 bg-amber/10 text-amber rounded-full">{q.topic}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{q.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    q.difficulty === 'Easy' ? 'bg-green-50 text-green-600' :
                    q.difficulty === 'Medium' ? 'bg-amber/10 text-amber' :
                    'bg-red-50 text-red-600'
                  }`}>{q.difficulty}</span>
                </div>
                <p className="text-sm font-medium text-navy">{q.question}</p>
                <p className="text-xs text-gray-400 mt-1">{q.class}</p>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 size={14} className="text-gray-400" /></button>
                <button className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-gray-400" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
