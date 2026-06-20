import re

with open('src/components/common/StaffManagement.jsx', 'r') as f:
    content = f.read()

content = content.replace("const allRoles = ['System Admin', 'Director', 'Manager', 'Ass Manager', 'Coordinator', 'Staff'];", "const allRoles = ['System Admin', 'Director', 'Manager', 'Ass Manager', 'Coordinator', 'Caller', 'Staff'];")

def repl_role_change(match):
    return """  const handleRoleChange = (newRole) => {
    let newDept = formData.department;
    if (newRole === 'System Admin' || newRole === 'Director') {
        newDept = ''; 
    } else if (newRole === 'Coordinator') {
        newDept = 'Class Coordination';
    } else if (newRole === 'Caller') {
        newDept = 'Call Center';
    } else if (newRole === 'Staff') {
        newDept = staffDepts.includes(newDept) ? newDept : staffDepts[0];
    } else if ((newRole === 'Manager' || newRole === 'Ass Manager') && !newDept) {
        newDept = allDepts[0];
    }
    setFormData({ ...formData, role: newRole, department: newDept });
  };"""

content = re.sub(r"const handleRoleChange = \(newRole\) => \{.*?\};", repl_role_change, content, flags=re.DOTALL)

def repl_dept_change(match):
    return """  const handleDeptChange = (newDept) => {
    let newRole = formData.role;
    if (newDept === 'Class Coordination' && (newRole === 'Staff' || newRole === 'Caller')) {
        newRole = 'Coordinator';
    } else if (newDept === 'Call Center' && (newRole === 'Staff' || newRole === 'Coordinator')) {
        newRole = 'Caller';
    } else if (newDept !== 'Class Coordination' && newRole === 'Coordinator') {
        newRole = 'Staff';
    } else if (newDept !== 'Call Center' && newRole === 'Caller') {
        newRole = 'Staff';
    }
    setFormData({ ...formData, department: newDept, role: newRole });
  };"""

content = re.sub(r"const handleDeptChange = \(newDept\) => \{.*?\};", repl_dept_change, content, flags=re.DOTALL)

content = content.replace("disabled={!isAdmin || formData.role === 'Coordinator'}", "disabled={!isAdmin || formData.role === 'Coordinator' || formData.role === 'Caller'}")

with open('src/components/common/StaffManagement.jsx', 'w') as f:
    f.write(content)
