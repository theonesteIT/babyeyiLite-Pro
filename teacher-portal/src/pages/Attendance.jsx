import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SourceAttendance from '../../../teacher-portal/frontend/src/pages/Attendance.jsx';

export default function Attendance() {
  const navigate = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Route the existing in-row "TeacherAttendance" toggle to the dedicated page.
    const onClickCapture = (event) => {
      const target = event.target;
      const btn = target instanceof Element ? target.closest('button') : null;
      if (!btn) return;
      const label = (btn.textContent || '').replace(/\s+/g, '').toLowerCase();
      if (label === 'teacherattendance') {
        event.preventDefault();
        event.stopPropagation();
        navigate('/teacher-attendance');
      }
    };

    root.addEventListener('click', onClickCapture, true);
    return () => root.removeEventListener('click', onClickCapture, true);
  }, [navigate]);

  return (
    <div ref={rootRef}>
      <SourceAttendance />
    </div>
  );
}
