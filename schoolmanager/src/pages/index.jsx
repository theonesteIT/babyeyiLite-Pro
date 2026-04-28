import React from 'react';
import { Link } from 'react-router-dom';

const AppTile = ({ iconUrl, label, path = '#' }) => (
  <Link to={path} className="group flex flex-col items-center gap-2 cursor-pointer w-28 no-underline">
    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-accent/10 group-hover:-translate-y-1.5 group-hover:border-accent/20">
      <img src={iconUrl} alt={label} className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110" />
    </div>
    <span className="text-primary font-semibold text-xs text-center leading-tight group-hover:text-accent transition-colors duration-200 text-nowrap">
      {label}
    </span>
  </Link>
);

export default function Home() {
  const apps = [
    { iconUrl: 'https://img.icons8.com/color/48/dashboard-layout.png', label: 'Dashboards' },
    { iconUrl: 'https://img.icons8.com/color/48/combo-chart--v1.png', label: 'Student Dashboard', path: '/students/dashboard' },
    { iconUrl: 'https://img.icons8.com/color/48/chat--v1.png', label: 'Chat Center', path: '/communication/chat' },
    { iconUrl: 'https://img.icons8.com/color/48/studying.png', label: 'Students', path: '/students' },
    { iconUrl: 'https://img.icons8.com/stickers/100/conference-background-selected.png', label: 'HR Central', path: '/staff' },
    { iconUrl: 'https://img.icons8.com/fluency/48/checked-user-male--v1.png', label: 'Attendance', path: '/attendance' },
    { iconUrl: 'https://img.icons8.com/fluency/48/timetable.png', label: 'Timetable', path: '/academic/timetable' },
    { iconUrl: 'https://img.icons8.com/office/40/money--v1.png', label: 'Shule Avance' },
    { iconUrl: 'https://img.icons8.com/external-itim2101-flat-itim2101/64/external-payroll-calculate-itim2101-flat-itim2101.png', label: 'Payroll' },
    { iconUrl: 'https://img.icons8.com/fluency/96/moms.png', label: 'Parents', path: '/students/parents' },
    { iconUrl: 'https://img.icons8.com/fluency/96/communication--v2.png', label: 'Babyeyi' },
    { iconUrl: 'https://img.icons8.com/3d-fluency/94/move-by-trolley.png', label: 'Stock & Inventory' },
    { iconUrl: 'https://img.icons8.com/ios/50/test-results.png', label: 'Student Marks & ...' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col justify-between">
      <div className="py-20 flex justify-center flex-grow">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-10 gap-y-12 max-w-6xl px-6 h-fit">
          {apps.map((app, index) => (
            <AppTile key={index} {...app} />
          ))}
        </div>
      </div>
      
      <footer className="w-full py-16 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-primary/20"></div>
            <div className="flex items-center gap-2">
              <span className="text-primary/40 text-[10px] uppercase tracking-[0.2em] font-bold">Managed by</span>
              <span className="text-primary font-black tracking-tighter text-lg flex items-center">
                EDU<span className="text-accent">POTO</span>
              </span>
            </div>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-primary/20"></div>
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <p className="text-primary/60 text-[11px] font-medium tracking-wide uppercase">
              Elevating Education through Technology
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="w-1 h-1 rounded-full bg-accent/40"></span>
              <p className="text-primary/30 text-[9px] font-medium tracking-widest uppercase">
                © {new Date().getFullYear()} Edupoto Global. All rights reserved.
              </p>
              <span className="w-1 h-1 rounded-full bg-accent/40"></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
