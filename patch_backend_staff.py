import re

with open('backend/controllers/staffController.js', 'r') as f:
    content = f.read()

content = content.replace("role === 'Coordinator' ? 'Class Coordination' : department", "(role === 'Coordinator' ? 'Class Coordination' : (role === 'Caller' ? 'Call Center' : department))")
content = content.replace("department === 'Class Coordination' || role === 'Coordinator'", "department === 'Class Coordination' || role === 'Coordinator' || department === 'Call Center' || role === 'Caller'")

with open('backend/controllers/staffController.js', 'w') as f:
    f.write(content)
