import os

files = [
    '/root/IMA-Campus/frontend/src/pages/student/components/SecureYoutubePlayer.jsx',
    '/root/IMA-Campus/frontend/src/pages/test/SecureYoutubePlayerTest.jsx'
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    if "origin: window.location.origin" not in content:
        content = content.replace("iv_load_policy: 3", "iv_load_policy: 3,\n            origin: window.location.origin")
        
        with open(file, 'w') as f:
            f.write(content)

print("Added origin to playerVars to prevent bot issue!")
