import React from 'react';

export default function CustomCard({ title, value, info, icon, trendPositive = true, children }) {
    return (
        <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#F0EBE1] p-5 m-3 flex flex-col transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 relative overflow-hidden group min-w-[280px]">
            {/* Subtle left accent bar on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8D6E63] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-2">
                <p className="text-[#8C7A70] text-sm font-semibold uppercase tracking-wider">{title}</p>
                {icon && <div className="text-[#D7CCC8] text-2xl group-hover:text-[#8D6E63] transition-colors">{icon}</div>}
            </div>
            
            {value && <p className="text-[#3E2723] font-extrabold text-3xl mb-1">{value}</p>}
            
            {info && (
                <div className="flex items-center mt-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${trendPositive ? 'bg-green-50 text-green-700' : 'bg-[#FFF8F8] text-[#D32F2F]'}`}>
                        {trendPositive ? '↑' : '↓'}
                    </span>
                    <p className="text-[#A1887F] text-xs ml-2 font-medium">{info}</p>
                </div>
            )}
            
            {children && <div className="mt-4">{children}</div>}
        </div>
    )
}