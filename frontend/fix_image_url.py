import re

with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'r') as f:
    content = f.read()

# The current image logic is:
# import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${slip.slip_image.split(',')[0]}` : `/api/storage/documents/${slip.slip_image.split(',')[0]}`
#
# Let's replace it with a helper function and use that.
# First, insert the helper function right after `const { user } = useAuth();`

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

content = content.replace("const { user } = useAuth();", "const { user } = useAuth();\n" + helper_func)

# Now, replace the usages in the file
# 1. In the pendingSlips map for the image:
# src={import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${slip.slip_image.split(',')[0]}` : `/api/storage/documents/${slip.slip_image.split(',')[0]}`}
pattern1 = r"src=\{import\.meta\.env\.VITE_API_URL \? import\.meta\.env\.VITE_API_URL\.replace\('/api', ''\) \+ `/api/storage/documents/\$\{slip\.slip_image\.split\(\',\', 1\)?\[0\]\}` : `/api/storage/documents/\$\{slip\.slip_image\.split\(\',\', 1\)?\[0\]\}`\}"
# Wait, the regex might be slightly different.
# Let's just do a plain text replace if we can find it.
old_src = "src={import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${slip.slip_image.split(',')[0]}` : `/api/storage/documents/${slip.slip_image.split(',')[0]}`}"
new_src = "src={getImageUrl(slip.slip_image)}"
content = content.replace(old_src, new_src)

# Let's also check for optional chaining `slip.slip_image?.split(',')[0]`
old_src_2 = "src={import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${slip.slip_image?.split(',')[0]}` : `/api/storage/documents/${slip.slip_image?.split(',')[0]}`}"
content = content.replace(old_src_2, new_src)

# Also the onClick window.open
old_onClick = "onClick={() => window.open(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${slip.slip_image?.split(',')[0]}` : `/api/storage/documents/${slip.slip_image?.split(',')[0]}`, '_blank')}"
new_onClick = "onClick={() => window.open(getImageUrl(slip.slip_image), '_blank')}"
content = content.replace(old_onClick, new_onClick)

# What about the verification animation overlay?
# <img src={currentVerifyingSlip.slip_image ? (currentVerifyingSlip.slip_image.startsWith('http') ? currentVerifyingSlip.slip_image : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${currentVerifyingSlip.slip_image.split(',')[0]}` : `/api/storage/documents/${currentVerifyingSlip.slip_image.split(',')[0]}`)) : '/logo.png'}
old_anim_src = "src={currentVerifyingSlip.slip_image ? (currentVerifyingSlip.slip_image.startsWith('http') ? currentVerifyingSlip.slip_image : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${currentVerifyingSlip.slip_image.split(',')[0]}` : `/api/storage/documents/${currentVerifyingSlip.slip_image.split(',')[0]}`)) : '/logo.png'}"
new_anim_src = "src={getImageUrl(currentVerifyingSlip.slip_image)}"
content = content.replace(old_anim_src, new_anim_src)

with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'w') as f:
    f.write(content)

