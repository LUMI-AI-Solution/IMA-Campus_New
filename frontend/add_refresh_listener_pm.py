import re

with open('/root/IMA-Campus/frontend/src/components/common/PaymentManagement.jsx', 'r') as f:
    content = f.read()

listener_code = """
  // Global Refresh Listener
  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchPayments();
      fetchSummary();
      fetchSettings();
    };
    window.addEventListener('global-refresh', handleGlobalRefresh);
    return () => window.removeEventListener('global-refresh', handleGlobalRefresh);
  }, []);
"""

content = content.replace("useEffect(() => {\n        fetchPayments();\n        fetchSummary();\n        fetchSettings();\n    }, []);", listener_code + "\n    useEffect(() => {\n        fetchPayments();\n        fetchSummary();\n        fetchSettings();\n    }, []);")

with open('/root/IMA-Campus/frontend/src/components/common/PaymentManagement.jsx', 'w') as f:
    f.write(content)
