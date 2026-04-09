import os

file_path = "d:/Apiit/Second year/Second Semester/CC/project/Supply-Chain-Visibility/src/dashboards/UserManagement.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Imports
content = content.replace('import api from "../api";', 'import api from "../api";\nimport toast from "react-hot-toast";\nimport ConfirmationModal from "../UIComponents/ConfirmationModal";')

# Alerts
content = content.replace('alert("Authority Created Successfully!");', 'toast.success("Authority Created Successfully!");')
content = content.replace('alert("Error creating user: "', 'toast.error("Error creating user: "')
content = content.replace('alert("User not found");', 'toast.error("User not found");')
content = content.replace('alert(error.message);', 'toast.error(error.message);')
content = content.replace('alert("Role updated successfully!");', 'toast.success("Role updated successfully!");')
content = content.replace('alert("Failed to update user.");', 'toast.error("Failed to update user.");')

# State
content = content.replace("const [editTab, setEditTab] = useState('account');", "const [editTab, setEditTab] = useState('account');\n    const [deleteTarget, setDeleteTarget] = useState(null);")

# Delete confirmation replacement
old_delete = """                                            <button 
                                                onClick={async () => {
                                                    if(window.confirm(`Are you sure you want to delete ${u.username}?`)) {
                                                        await api.delete(`users/${u.id}/`);
                                                        fetchUsers();
                                                    }
                                                }}
                                                className="text-[#D32F2F] bg-white border border-[#FFCDD2] hover:bg-[#FFF8F8] p-2 rounded-lg transition-colors shadow-sm"
                                            >"""
new_delete = """                                            <button 
                                                onClick={() => setDeleteTarget(u)}
                                                className="text-[#D32F2F] bg-white border border-[#FFCDD2] hover:bg-[#FFF8F8] p-2 rounded-lg transition-colors shadow-sm"
                                            >"""

content = content.replace(old_delete, new_delete)

modal_injection = """
            <ConfirmationModal 
                isOpen={!!deleteTarget}
                title="Delete User"
                message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.username}? This action cannot be undone.` : ''}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={async () => {
                    if (deleteTarget) {
                        try {
                            await api.delete(`users/${deleteTarget.id}/`);
                            toast.success("User deleted successfully.");
                            fetchUsers();
                        } catch (err) {
                            toast.error("Failed to delete user.");
                        }
                    }
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />
            {activeAction === 'CREATE_USER'"""

content = content.replace("{activeAction === 'CREATE_USER'", modal_injection)

# Deactivated label
content = content.replace("{u.status === 'active' ? 'bg-green-50 text-green-700", "{u.status === 'active' ? 'bg-green-50 text-green-700")

# Wait, replace the render of u.status
content = content.replace("</span> {u.status}", "</span> {u.status === 'inactive' ? 'Deactivated' : u.status}")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
