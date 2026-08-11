import re

with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'r') as f:
    content = f.read()

listener_code = """
  // Global Refresh Listener
  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchPendingSlips();
      if (bulkStatus?.isRunning) {
        pollBulkStatus();
      }
    };
    window.addEventListener('global-refresh', handleGlobalRefresh);
    return () => window.removeEventListener('global-refresh', handleGlobalRefresh);
  }, [bulkStatus]);
"""

# Insert it before the first useEffect
content = content.replace("useEffect(() => {\n        fetchPendingSlips();\n    }, []);", listener_code + "\n    useEffect(() => {\n        fetchPendingSlips();\n    }, []);")

with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'w') as f:
    f.write(content)
