import CustomCard from "../UIComponents/Card";
import { MdLocalShipping, MdWarning, MdMap, MdOutlinePayments } from "react-icons/md";
import { GiBoxUnpacking, GiPathDistance } from "react-icons/gi";

export default function Dashboard() {
    return (<div className="space-y-8 animate-fade-in pb-10">
        
        {/* Header Title Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h1 className="text-3xl font-black text-coffee-900 tracking-tight">Operations Headquarters</h1>
                <p className="text-coffee-500 font-medium mt-1">Real-time logistics intelligence and live asset orchestration.</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="bg-white border border-coffee-100 px-4 py-2 rounded-2xl shadow-sm flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-coffee-600 font-mono">System Live</span>
                </div>
            </div>
        </div>


        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Delivery Assignment Kanban Placeholders */}
            <div className="xl:col-span-2 bg-white rounded-[32px] shadow-2xl shadow-coffee-100/20 border border-coffee-100 flex flex-col min-h-[500px] overflow-hidden">
                <div className="p-6 border-b border-coffee-50 flex justify-between items-center bg-coffee-50/10">
                    <h3 className="text-lg font-black text-coffee-950 flex items-center"><GiBoxUnpacking className="mr-3 text-coffee-500 text-2xl"/> Active Routing Board</h3>
                    <button className="text-xs font-black uppercase tracking-widest text-coffee-400 hover:text-coffee-700 transition-colors">Manifest Hub →</button>
                </div>
                
                <div className="p-5 flex-1 overflow-x-auto">
                    <div className="flex gap-4 min-w-max h-full">
                        
                        {/* Column 1 */}
                        <div className="w-72 flex flex-col bg-coffee-50/30 rounded-2xl border border-coffee-100/50 p-4">
                            <div className="flex justify-between items-center mb-4 px-1">
                                <span className="text-[10px] font-black text-coffee-400 uppercase tracking-widest">Pending Sync (12)</span>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-coffee-100/50 mb-3 hover:shadow-xl hover:-translate-y-0.5 cursor-grab transition-all border-l-4 border-l-amber-400 group">
                                <p className="text-[9px] text-coffee-300 font-black mb-1.5 uppercase tracking-tighter">ORD-9482</p>
                                <p className="text-sm font-black text-coffee-900 group-hover:text-coffee-600 transition-colors">12 Pallets Electronics</p>
                                <p className="text-[11px] text-coffee-400 mt-3 flex items-center font-bold font-mono"><MdMap className="mr-2 text-lg text-coffee-200"/> TO: BERLIN HQ</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-coffee-100/50 mb-3 hover:shadow-xl hover:-translate-y-0.5 cursor-grab transition-all border-l-4 border-l-amber-400 group">
                                <p className="text-[9px] text-coffee-300 font-black mb-1.5 uppercase tracking-tighter">ORD-9485</p>
                                <p className="text-sm font-black text-coffee-900 group-hover:text-coffee-600 transition-colors">Medical Supplies</p>
                                <p className="text-[11px] text-coffee-400 mt-3 flex items-center font-bold font-mono"><MdMap className="mr-2 text-lg text-coffee-200"/> TO: PARIS CLINIC</p>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="w-64 flex flex-col bg-[#FDFBF7] rounded-xl border border-[#F0EBE1] p-3">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <span className="text-xs font-bold text-[#5D4037] uppercase tracking-wide">Assigned (5)</span>
                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-[#EAE3D9] mb-2 hover:shadow-md cursor-grab transition-shadow border-l-4 border-l-blue-400">
                                <p className="text-[10px] text-[#A1887F] font-bold mb-1">ORD-9477</p>
                                <p className="text-[13px] font-bold text-[#3E2723]">Lumber & Steel</p>
                                <div className="mt-2 pt-2 border-t border-[#F0EBE1] flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-[#5D4037] bg-[#F5F0EB] px-2 py-0.5 rounded">T-800 Heavy</span>
                                    <div className="w-5 h-5 rounded-full bg-[#D7CCC8] flex items-center justify-center text-[8px] font-bold text-white">JD</div>
                                </div>
                            </div>
                        </div>

                        {/* Column 3 */}
                        <div className="w-64 flex flex-col bg-[#FDFBF7] rounded-xl border border-[#F0EBE1] p-3">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <span className="text-xs font-bold text-[#3E2723] uppercase tracking-wide">In Transit (8)</span>
                                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-[#EAE3D9] mb-2 hover:shadow-md cursor-grab transition-shadow border-l-4 border-l-indigo-400">
                                <p className="text-[10px] text-[#A1887F] font-bold mb-1">ORD-9450</p>
                                <p className="text-[13px] font-bold text-[#3E2723]">Consumer Goods</p>
                                <div className="mt-2 bg-gray-100 rounded-full h-1 overflow-hidden">
                                     <div className="bg-indigo-500 h-1 w-[60%]"></div>
                                </div>
                                <p className="text-[9px] text-[#8C7A70] mt-1 text-right">ETA: 2h 15m</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Map Nav UI Placeholder */}
            <div className="xl:col-span-1 bg-white rounded-[32px] shadow-2xl shadow-coffee-100/20 border border-coffee-100 p-8 h-[500px] relative overflow-hidden flex flex-col group transition-all hover:border-coffee-300">
                <div className="absolute inset-0 bg-coffee-50/40 z-0"></div>
                <div className="absolute inset-0 flex items-center justify-center z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#795548 1.5px, transparent 1px)', backgroundSize: '30px 30px' }}>
                   <MdMap className="text-[15rem] text-coffee-900 transform rotate-12 group-hover:scale-110 transition-transform duration-[5s] ease-linear"/>
                </div>
                
                <h3 className="text-lg font-black text-coffee-950 mb-2 z-10 flex items-center"><MdMap className="mr-3 text-coffee-500 text-2xl"/> Live Map Tracker</h3>
                <p className="text-xs text-coffee-400 font-bold uppercase tracking-widest z-10 mb-6">Tracking 44 active units</p>
 
                {/* Fake route cards floating on map */}
                <div className="relative z-10 flex-1">
                    <div className="absolute top-[20%] left-[15%] w-4 h-4 bg-coffee-600 rounded-full ring-8 ring-coffee-500/20 animate-pulse"></div>
                    <div className="absolute top-[50%] right-[25%] w-4 h-4 bg-emerald-500 rounded-full ring-8 ring-emerald-500/20 animate-pulse" style={{animationDelay: "1s"}}></div>
                    <div className="absolute bottom-[25%] left-[35%] w-4 h-4 bg-rose-500 rounded-full ring-8 ring-rose-500/20 animate-pulse" style={{animationDelay: "2s"}}></div>
                </div>

                <div className="relative z-10 mt-auto flex flex-wrap gap-3">
                    <button className="bg-white/90 backdrop-blur px-5 py-2.5 shadow-lg rounded-xl text-xs font-black uppercase tracking-widest text-coffee-700 border border-coffee-100 hover:bg-coffee-50 transition-all hover:-translate-y-1 active:translate-y-0">📍 Assets</button>
                    <button className="bg-white/90 backdrop-blur px-5 py-2.5 shadow-lg rounded-xl text-xs font-black uppercase tracking-widest text-rose-600 border border-rose-100 hover:bg-rose-50 transition-all hover:-translate-y-1 active:translate-y-0">⚠️ Alerts</button>
                </div>
            </div>
        </div>
    </div>)
}