import re

with open('/root/IMA-Campus/backend/controllers/deliveryController.js', 'r') as f:
    content = f.read()

# Update 1: add `group: true` to the include
old_include = """include: { student: true, batch: true }"""
new_include = """include: { student: true, batch: true, group: true }"""
content = content.replace(old_include, new_include)

# Update 2: add `groupName: d.payment?.group?.name || 'No Group',` to the mapping
old_mapping = """                batchName: d.payment?.batch?.name || 'Batch Not Assigned',
                items: d.items.map(item => {"""
new_mapping = """                batchName: d.payment?.batch?.name || 'Batch Not Assigned',
                groupName: d.payment?.group?.name || 'No Group',
                items: d.items.map(item => {"""
content = content.replace(old_mapping, new_mapping)

with open('/root/IMA-Campus/backend/controllers/deliveryController.js', 'w') as f:
    f.write(content)
