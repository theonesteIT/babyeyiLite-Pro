import { useState } from 'react';
import { Trophy, Medal, TrendingUp, TrendingDown } from 'lucide-react';

const rankings = [
  { rank: 1, name: 'Grace Mugabo', class: 'Senior 3A', average: 91, trend: 'up', previousRank: 2 },
  { rank: 2, name: 'Jean Baptiste', class: 'Senior 3A', average: 85, trend: 'up', previousRank: 3 },
  { rank: 3, name: 'Marie Claire', class: 'Senior 3B', average: 82, trend: 'down', previousRank: 1 },
  { rank: 4, name: 'Diane Ishimwe', class: 'Senior 3B', average: 78, trend: 'stable', previousRank: 4 },
  { rank: 5, name: 'Peter Kagame', class: 'Senior 3B', average: 73, trend: 'up', previousRank: 7 },
  { rank: 6, name: 'Alice Uwimana', class: 'Senior 3A', average: 72, trend: 'down', previousRank: 5 },
  { rank: 7, name: 'Patrick Habimana', class: 'Senior 3A', average: 67, trend: 'stable', previousRank: 7 },
  { rank: 8, name: 'John Mugisha', class: 'Senior 3B', average: 55, trend: 'up', previousRank: 10 },
  { rank: 9, name: 'Eric Hakizimana', class: 'Senior 3A', average: 45, trend: 'down', previousRank: 8 },
  { rank: 10, name: 'Angelique Uwase', class: 'Senior 3B', average: 42, trend: 'down', previousRank: 9 },
];

export default function Rankings() {
  const [view, setView] = useState<'all' | 'top' | 'bottom'>('all');

  const displayData = view === 'all' ? rankings : view === 'top' ? rankings.slice(0, 5) : rankings.slice(-5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Student Rankings</h1>
        <p className="text-gray-500 text-sm mt-1">Class rankings with position tracking</p>
      </div>

      <div className="flex gap-2">
        {(['all', 'top', 'bottom'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === v ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {v === 'all' ? 'All Students' : v === 'top' ? 'Top 5' : 'Bottom 5'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 w-16">Rank</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Student</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Class</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Average</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Trend</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map(student => (
                <tr key={student.rank} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-center">
                    {student.rank <= 3 ? (
                      <div className="flex justify-center">
                        {student.rank === 1 ? <Trophy size={20} className="text-amber" /> :
                         student.rank === 2 ? <Medal size={20} className="text-gray-400" /> :
                         <Medal size={20} className="text-orange-500" />}
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-gray-500">#{student.rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-navy">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{student.class}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold">{student.average}%</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {student.trend === 'up' ? <TrendingUp size={14} className="text-green-500" /> :
                       student.trend === 'down' ? <TrendingDown size={14} className="text-red-500" /> :
                       <span className="w-3 h-0.5 bg-gray-300 inline-block" />}
                      <span className="text-xs text-gray-400">#{student.previousRank}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
