import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import OverviewTab from './OverviewTab';
import StudentRegistration from '../PhysicalCRM/StudentRegistration';
import ClassTeacherManagement from '../PhysicalCRM/ClassTeacherManagement';
import AttendancePortal from '../PhysicalCRM/AttendancePortal';
import CashFlowPortal from '../PhysicalCRM/CashFlowPortal';
import PhysicalTimetable from '../PhysicalCRM/PhysicalTimetable';
import FinancialReports from '../PhysicalCRM/FinancialReports';
import LecturerReports from '../PhysicalCRM/LecturerReports';
import StudentReports from '../PhysicalCRM/StudentReports';
import ClassComparisonReport from '../PhysicalCRM/ClassComparisonReport';

export default function PhysicalManagerDashboard() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'overview';

  const tabTitles = {
    registration: 'Student Registration',
    staff: 'Teachers & Classes',
    attendance: 'Student Attendance Portal',
    'student-reports': 'Student Reports & Attendance Matrix',
    'class-compare': 'Class Comparison & Overlap Reports',
    finance: 'Cash Flow Portal',
    timetable: 'Class Timetable',
    reports: 'Financial Reports & Analytics',
    'lecturer-reports': 'Lecturer Reports & Monthly Invoices'
  };

  return (
    <div className="h-full w-full flex flex-col animate-fade-in relative">
      {activeTab !== 'overview' && (
        <div className="px-4 pt-3 md:px-6 flex items-center justify-between z-20 shrink-0 mb-1">
          <button
            onClick={() => navigate('/physical/dashboard/overview')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-lg backdrop-blur-md transition-all active:scale-95 group cursor-pointer"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-red-400" />
            <span>Back to Physical Overview</span>
          </button>

          <span className="text-xs font-bold text-white/60 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
            Physical Hub • {tabTitles[activeTab] || activeTab}
          </span>
        </div>
      )}
      
      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative no-scrollbar bg-black/5 rounded-3xl shadow-inner m-2">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'registration' && <StudentRegistration />}
          {activeTab === 'staff' && <ClassTeacherManagement />}
          {activeTab === 'attendance' && <AttendancePortal />}
          {activeTab === 'student-reports' && <StudentReports />}
          {activeTab === 'class-compare' && <ClassComparisonReport />}
          {activeTab === 'finance' && <CashFlowPortal />}
          {activeTab === 'timetable' && <PhysicalTimetable />}
          {activeTab === 'reports' && <FinancialReports />}
          {activeTab === 'lecturer-reports' && <LecturerReports />}
      </div>
      
    </div>
  );
}


