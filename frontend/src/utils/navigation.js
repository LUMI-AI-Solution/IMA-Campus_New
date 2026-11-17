export const getDashboardLink = (user) => {
  if (!user) return '/login';

  const rawRole = (user?.role || '').toUpperCase();
  const role = rawRole.replace(/[\s_-]+/g, '_');
  const dept = (user?.department || '').trim();

  if (role === 'STUDENT' || role === 'USER') return '/student/dashboard';

  if (role === 'PAPER_GUIDER') return '/paper-guider/hub';
  if (role === 'PAPER_MARKER') return '/paper-marker/dashboard';

  if (role === 'LECTURE' || role === 'LECTURER') return '/manager/dashboard';

  if (role === 'CALLER') return '/workspace/crm';
  if (role === 'CALL_CENTER_AGENT') return '/call-center/agent/overview';

  if (role === 'COORDINATOR') return '/coordinator/dashboard';

  if (role === 'SOCIAL_MEDIA_MANAGER' || ((role === 'MANAGER' || role === 'ASS_MANAGER') && dept === 'Social Media')) {
    return '/social-media/manager/dashboard';
  }
  if (role === 'SOCIAL_MEDIA_STAFF' || (role === 'STAFF' && dept === 'Social Media')) {
    return '/social-media/staff/dashboard';
  }

  if (dept === 'Call Center') {
    return (role === 'MANAGER' || role === 'ASS_MANAGER' || role === 'SUPER') ? '/call-center/dashboard' : '/call-center/agent/overview';
  }

  const isManager = role === 'MANAGER' || role === 'ASS_MANAGER' || role === 'ASSISTANT_MANAGER' || role === 'ADMIN_MANAGER';

  if (isManager) {
    if (dept === 'Finance') return '/finance/dashboard';
    if (dept === 'Delivery') return '/delivery/dashboard';
    if (dept === 'Physical') return '/physical/dashboard/overview';
    if (dept === 'Administration') return '/admin/dashboard';
    // Class Coordination & general managers load Realtime Overview:
    return '/manager/dashboard';
  }

  if (role === 'STAFF') {
    if (dept === 'Finance') return '/finance/dashboard';
    if (dept === 'Class Coordination') return '/coordinator/dashboard';
    if (dept === 'Technical') return '/technical/dashboard';
    if (dept === 'Delivery') return '/delivery/dashboard';
    if (dept === 'Physical') return '/physical/dashboard/overview';

    return '/manager/dashboard';
  }

  return '/admin/dashboard';
};
