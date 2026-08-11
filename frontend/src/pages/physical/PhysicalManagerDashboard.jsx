import React from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import OverviewTab from './OverviewTab';
import StudentRegistration from '../PhysicalCRM/StudentRegistration';
import ClassTeacherManagement from '../PhysicalCRM/ClassTeacherManagement';
import AttendancePortal from '../PhysicalCRM/AttendancePortal';
import CashFlowPortal from '../PhysicalCRM/CashFlowPortal';
import PhysicalTimetable from '../PhysicalCRM/PhysicalTimetable';

export default function PhysicalManagerDashboard() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'overview';
  
  return (
    <div className="h-full w-full flex animate-fade-in relative">
      
      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative no-scrollbar bg-black/5 rounded-3xl shadow-inner m-2">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'registration' && <StudentRegistration />}
          {activeTab === 'staff' && <ClassTeacherManagement />}
          {activeTab === 'attendance' && <AttendancePortal />}
          {activeTab === 'finance' && <CashFlowPortal />}
          {activeTab === 'timetable' && <PhysicalTimetable />}
      </div>
      
    </div>
  );
}
