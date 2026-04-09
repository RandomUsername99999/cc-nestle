import { BiAlarmExclamation } from "react-icons/bi";
import CustomCard from "../UIComponents/Card";

const itemsList = [
    { title: 'Low Stock SKUs', desc: 'SKU 5674 - 120 units' },
    { title: 'Nercaf: Zone 3', desc: 'Chiller Bay A - Humidity Alert' },
    { title: 'Rising Temperatures', desc: 'Expiry Alert' },
]

function Dashboard() {
    return (
        <>
            <p className='ml-5 font-extrabold text-xl'>Logistics Operations Centralized Dashboard</p>
            <div className='flex flex-row'>
        <CustomCard title={"Total Pallets Staged"} value={775} info={"+12.5% this week"} />
        <CustomCard title = "Inventory Accuracy" value = "99.8%" info = "On Target" />
        <CustomCard title={"Average Drivers"} value={"18 min"} info={"On Target"} />
        <CustomCard title = "Averaged Drivers" value = "18 min" info = "18 min vs avg" />
    </div>
            <div className='flex flex-row'>
                <div className='flex flex-col'>
            <CustomCard title={"Loading Bay Monitor"} width="600px" height="24rem" />
            <CustomCard title={"Picker Performance"} width="600px" height="24rem" />
        </div>
                <div className='flex flex-col'>
                    <ScrollingFrame title={"Inventory Alerts"} items={itemsList} />
                    <ScrollingFrame title={"Cold Chain Warnings"} />
                    <ScrollingFrame title={"Route Progress"} />
                </div>
            </div>
        </>
    )
}

function ScrollingFrame({ title, items }) {
    const itemFrames = items?.map((item) =>
        <InventoryAlertFrame title={item.title} desc={item.desc} />
    );
    return (<>
        <div className='overflow-auto bg-white border-amber-950 border-2 w-[425px] h-52 rounded-lg justify-start pl-2 m-4'>
            <p className='font-extrabold text-xl'>{title}</p>
            {itemFrames}
        </div>
    </>)
}

function InventoryAlertFrame({ title, desc }) {
    return (
        <div className="shadow-md shadow-gray-400 p-4 flex flex-row">
            <div className="text-2xl pr-5 mr-2 bg-orange-200 h-1/2 w-6 rounded-md items-center justify-center">
                <div className="justify-center">{<BiAlarmExclamation />}</div>
            </div>
            <div className="w-4/5">
                <p className="font-bold">{title}</p>
                <p className="font-extralight">{desc}</p>
            </div>
            <div className="items-end self-end">
                <button className="bg-slate-200 text-amber-900 border-amber-900 border-2 rounded-md p-[2px] hover:bg-white">Button</button>
            </div>
        </div>
    )
}

export default Dashboard