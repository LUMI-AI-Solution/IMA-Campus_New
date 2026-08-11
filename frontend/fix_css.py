with open('/root/IMA-Campus/frontend/src/index.css', 'r') as f:
    content = f.read()

content = content.replace('.modal-content, [role="dialog"] > div, .fixed.inset-0 > div > div {', '.modal-content, [role="dialog"] > div {')

with open('/root/IMA-Campus/frontend/src/index.css', 'w') as f:
    f.write(content)
