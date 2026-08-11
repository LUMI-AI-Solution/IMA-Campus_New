with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'r') as f:
    content = f.read()

content = content.replace("toast.success('Live Data Refreshed!', { position: 'top-left' });", "toast.success('Live Data Refreshed!', { position: 'top-right' });")

with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'w') as f:
    f.write(content)
