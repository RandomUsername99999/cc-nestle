import React, { useState, useEffect } from 'react';
import api from '../api';
import { BiHistory, BiFilterAlt, BiDownload, BiSearch } from 'react-icons/bi';
import toast from 'react-hot-toast';

export default function Reports() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('audit-logs/');
      setLogs(response.data);
    } catch (err) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 bg-[#FAFAF8] min-h-screen flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#3E2723]">System Reports & Audit Logs</h1>
          <p className="text-sm text-[#8D6E63]">Track all administrative and system actions for security auditing.</p>
        </div>
        <button onClick={fetchLogs} className="bg-white border border-[#EAE3D9] p-2 rounded-lg text-[#5D4037] hover:bg-[#F5F0EB]">
           <BiHistory className={loading ? "animate-spin" : ""} size={20} />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE3D9] overflow-hidden">
        <div className="p-5 border-b border-[#F0EBE1] flex flex-col md:flex-row justify-between gap-4 bg-[#FCF9F6]">
           <div className="relative flex-1 max-w-md">
              <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BCAAA4]" />
              <input 
                type="text" 
                placeholder="Search logs by action, resource or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#EAE3D9] rounded-xl text-sm focus:ring-[#8D6E63] focus:border-[#8D6E63]"
              />
           </div>
           <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EAE3D9] rounded-xl text-sm text-[#5D4037] hover:bg-[#F5F0EB]">
                <BiFilterAlt /> Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#3E2723] text-white rounded-xl text-sm font-bold hover:bg-[#5D4037]">
                <BiDownload /> Export CSV
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#FAF9F6] text-[#A1887F] font-bold border-b border-[#F0EBE1]">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Action</th>
                <th className="py-4 px-6">Resource</th>
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.log_id} className="border-b border-[#FDFBF7] hover:bg-[#FAF9F6] transition-colors">
                  <td className="py-4 px-6 text-[#8D6E63] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      log.action.startsWith('CREATE') ? 'bg-green-100 text-green-700' :
                      log.action.startsWith('DELETE') ? 'bg-red-100 text-red-700' :
                      log.action.startsWith('UPDATE') ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-semibold text-[#3E2723]">
                    {log.resource_type} <span className="text-[10px] text-[#A1887F]">#{log.resource_id}</span>
                  </td>
                  <td className="py-4 px-6 text-[#5D4037]">
                    {log.user || <span className="italic text-[#BCAAA4]">System</span>}
                  </td>
                  <td className="py-4 px-6 text-[#795548] max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-[#BCAAA4]">
                    <BiHistory className="mx-auto text-4xl mb-2 opacity-20" />
                    No audit logs found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
