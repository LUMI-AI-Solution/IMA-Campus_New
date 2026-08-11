with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'r') as f:
    content = f.read()

helper_func = """
  const getImageUrl = (filename) => {
    if (!filename) return '/logo.png';
    const file = filename.split(',')[0].trim();
    if (file.startsWith('http')) return file;
    return window.location.protocol === 'https:'
            ? `https://${window.location.hostname}/api/storage/documents/${file}`
            : `http://${window.location.hostname}:5000/api/storage/documents/${file}`;
  };
"""

content = content.replace("export default function AISlipVerification({ loggedInUser }) {", "export default function AISlipVerification({ loggedInUser }) {\n" + helper_func)

with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'w') as f:
    f.write(content)
