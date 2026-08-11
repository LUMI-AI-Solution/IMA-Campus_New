with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'r') as f:
    content = f.read()

# Add import toast if not present
if 'import toast from' not in content and 'import { toast }' not in content:
    content = content.replace("import { NavLink, useLocation } from 'react-router-dom';", "import { NavLink, useLocation } from 'react-router-dom';\nimport toast from 'react-hot-toast';")

# Update the button click handler
old_btn = """onClick={() => {
            window.dispatchEvent(new Event('global-refresh'));
            // Optional: you can show a toast here if toast is imported, but let's just dispatch
          }}"""

new_btn = """onClick={(e) => {
            const icon = e.currentTarget.querySelector('svg');
            if(icon) {
              icon.classList.add('animate-spin');
              setTimeout(() => icon.classList.remove('animate-spin'), 1000);
            }
            window.dispatchEvent(new Event('global-refresh'));
            toast.success('Live Data Refreshed!', { position: 'bottom-right' });
          }}"""

content = content.replace(old_btn, new_btn)

with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'w') as f:
    f.write(content)
