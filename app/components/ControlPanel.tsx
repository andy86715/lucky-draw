'use client';

import { useState, useRef } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import { readExcel } from '../utils/readExcel';
import { Upload, Plus, Settings, Play, ChevronUp, ChevronDown, Trash2, Users, Gift, MonitorPlay, FileDown, Database } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { defaultParticipants, defaultPrizes } from '../data/initialData';

type Tab = 'CONTROL' | 'PRIZES' | 'PARTICIPANTS' | 'SYSTEM';

export default function ControlPanel() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prizeFileInputRef = useRef<HTMLInputElement>(null); // Added this
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('CONTROL');

    // Local state for forms
    const [newPrizeName, setNewPrizeName] = useState('');
    const [newPrizeCount, setNewPrizeCount] = useState(1);
    const [newPartName, setNewPartName] = useState('');
    const [newPartDept, setNewPartDept] = useState('');
    const [newPartId, setNewPartId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [filterType, setFilterType] = useState<string>('ALL');

    // Store actions
    const {
        participants,
        prizes,
        addPrize,
        removePrize,
        setParticipants,
        addParticipant,
        removeParticipant,
        reset,
        mode,
        setMode,
        currentPrizeId,
        setCurrentPrize,
    } = useLuckyDrawStore();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'PARTICIPANTS' | 'PRIZES') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const result = await readExcel(file);
            let msg: string[] = [];

            if (type === 'PARTICIPANTS') {
                if (result.participants.length > 0) {
                    setParticipants(result.participants);
                    msg.push(`成功匯入 ${result.participants.length} 筆名單`);
                } else {
                    alert('檔案中未發現有效名單資料');
                    return;
                }
            } else if (type === 'PRIZES') {
                if (result.prizes.length > 0) {
                    // Overwrite prizes: Clear first then add
                    useLuckyDrawStore.setState({ prizes: [] });
                    result.prizes.forEach(p => addPrize(p.name, p.count));
                    msg.push(`成功匯入 ${result.prizes.length} 筆獎項 (已覆蓋原有獎項)`);
                } else {
                    alert('檔案中未發現有效獎項資料');
                    return;
                }
            }

            if (msg.length > 0) alert(msg.join('，'));

        } catch (err) {
            alert('匯入失敗，請檢查檔案格式。');
            console.error(err);
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (prizeFileInputRef.current) prizeFileInputRef.current.value = '';
        }
    };

    const handleDownloadTemplate = (type: 'PARTICIPANTS' | 'PRIZES') => {
        const wb = XLSX.utils.book_new();

        if (type === 'PARTICIPANTS') {
            const listData = [
                ['姓名', '部門', '員工編號'],
                ['王大明', '4B', 'F8291'],
                ['李小花', '嬰兒室', '91039'],
            ];
            const wsList = XLSX.utils.aoa_to_sheet(listData);
            XLSX.utils.book_append_sheet(wb, wsList, "名單 (Participants)");
            XLSX.writeFile(wb, '名單範本_Participants.xlsx');
        } else {
            const prizeData = [
                ['獎項名稱', '名額'],
                ['頭獎 - 東京雙人來回機票', 1],
                ['二獎 - Dyson 吹風機', 2],
            ];
            const wsPrizes = XLSX.utils.aoa_to_sheet(prizeData);
            XLSX.utils.book_append_sheet(wb, wsPrizes, "獎項 (Prizes)");
            XLSX.writeFile(wb, '獎項範本_Prizes.xlsx');
        }
    };

    const handleAddPrize = () => {
        if (!newPrizeName) return;
        addPrize(newPrizeName, newPrizeCount);
        setNewPrizeName('');
        setNewPrizeCount(1);
    };

    const handleAddParticipant = () => {
        if (!newPartName || !newPartId) {
            alert('請輸入姓名和員工編號');
            return;
        }
        // Validation: Letter + 4 digits or 5 digits
        const idRegex = /^[A-Za-z]\d{4}$/;
        const idRegex2 = /^\d{5}$/;
        if (!idRegex.test(newPartId) && !idRegex2.test(newPartId)) {
            alert('員工編號格式錯誤！必須為 1 英文 + 4 數字 (例如: A1234) 或 5 數字 (例如: 12345)');
            return;
        }

        addParticipant(newPartName, newPartDept, newPartId);
        setNewPartName('');
        setNewPartDept('');
        setNewPartId('');
    };

    const handleLoadDefault = () => {
        if (confirm('確定要載入預設資料嗎？這將會覆蓋現有設定。')) {
            setParticipants(defaultParticipants.map(p => ({
                ...p,
                id: crypto.randomUUID(),
                department: p.department || 'General',
                isWinner: false,
                disqualified: false
            })));

            // Clear prizes first then add
            useLuckyDrawStore.setState({ prizes: [] });
            defaultPrizes.forEach(p => addPrize(p.name, p.count));

            alert('已載入預設資料！');
        }
    };

    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Winners
        const winners = participants.filter(p => p.isWinner).map(p => {
            const prize = prizes.find(pz => pz.id === p.wonPrizeId);
            return {
                '姓名': p.name,
                '部門': p.department,
                '員編': p.employeeId,
                '獎項': prize?.name || 'Unknown'
            };
        });
        const wsWinners = XLSX.utils.json_to_sheet(winners);
        XLSX.utils.book_append_sheet(wb, wsWinners, "得獎名單");

        // Sheet 2: All Participants
        const all = participants.map(p => ({
            '姓名': p.name,
            '部門': p.department,
            '員編': p.employeeId,
            '狀態': p.isWinner ? '中獎' : p.disqualified ? '取消資格' : '未中獎',
            '獲得獎項': prizes.find(pz => pz.id === p.wonPrizeId)?.name || ''
        }));
        const wsAll = XLSX.utils.json_to_sheet(all);
        XLSX.utils.book_append_sheet(wb, wsAll, "所有名單");

        XLSX.writeFile(wb, `抽獎結果_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className={clsx(
            "fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out bg-white/95 backdrop-blur-xl shadow-[0_-5px_30px_rgba(255,183,197,0.4)] border-t-4 border-sakura-pink flex flex-col max-h-[80vh]",
            isOpen ? "translate-y-0" : "translate-y-[calc(100%-3rem)]"
        )}>
            {/* Toggle Handle */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-sakura-pink text-white px-8 py-2 rounded-t-2xl cursor-pointer font-bold flex items-center gap-2 hover:bg-sakura-dark transition-colors shadow-lg"
            >
                <span className="drop-shadow-md tracking-wider">控制面板</span>
                {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </div>

            {/* Tabs Header */}
            <div className="flex shrink-0 border-b border-gray-100/50 px-6 pt-2 overflow-x-auto relative z-10">
                {[
                    { id: 'CONTROL', label: '抽獎模式', icon: MonitorPlay },
                    { id: 'PRIZES', label: '獎項管理', icon: Gift },
                    { id: 'PARTICIPANTS', label: '名單管理', icon: Users },
                    { id: 'SYSTEM', label: '系統設定', icon: Settings },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-4 font-bold transition-all relative whitespace-nowrap",
                            activeTab === tab.id ? "text-sakura-dark" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-sakura-pink rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-sakura-light/30">
                <div className="max-w-6xl mx-auto h-full">

                    {/* --- TAB: CONTROL --- */}
                    {activeTab === 'CONTROL' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                            <div className="space-y-4">
                                <label className="text-lg font-bold text-gray-700 flex items-center gap-2">
                                    1. 選擇模式
                                </label>
                                <div className="flex gap-3">
                                    {(['SLOT', 'ROULETTE', 'ID_DRAW', 'DEPT_DRAW'] as const).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setMode(m)}
                                            className={clsx(
                                                "flex-1 py-4 text-sm font-bold rounded-2xl transition-all border-2 flex flex-col items-center gap-2",
                                                mode === m
                                                    ? "bg-sakura-pink text-white border-sakura-pink shadow-lg scale-105"
                                                    : "bg-white text-gray-400 border-transparent hover:border-sakura-pink/30"
                                            )}
                                        >
                                            <span className="text-2xl">
                                                {m === 'ROULETTE' ? '🎡' : m === 'SLOT' ? '🎰' : m === 'ID_DRAW' ? '🔢' : '🏢'}
                                            </span>
                                            {m === 'ROULETTE' ? '轉盤' : m === 'SLOT' ? '拉霸機' : m === 'ID_DRAW' ? '員編抽獎' : '部門抽獎'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-lg font-bold text-gray-700 flex items-center gap-2">
                                    2. 選擇獎項 & 開始
                                </label>
                                <select
                                    className="w-full px-4 py-3 rounded-2xl bg-white outline-none border-2 border-transparent focus:border-sakura-pink font-bold text-lg shadow-sm"
                                    onChange={(e) => setCurrentPrize(e.target.value)}
                                    value={currentPrizeId || ''}
                                >
                                    <option value="" disabled>請選擇要抽的獎項...</option>
                                    {prizes.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (剩餘名額: {p.count - p.winners.length})
                                        </option>
                                    ))}
                                </select>


                            </div>
                        </div>
                    )}

                    {/* --- TAB: PRIZES --- */}
                    {activeTab === 'PRIZES' && (
                        <div className="flex flex-col h-full gap-6">
                            {/* Toolbar (Import/Export + Add) */}
                            <div className="flex gap-4 items-end bg-white p-4 rounded-2xl shadow-sm flex-wrap">
                                {/* Import/Export Group */}
                                <button
                                    onClick={() => prizeFileInputRef.current?.click()}
                                    className="px-4 py-2 bg-sakura-light text-sakura-dark font-bold rounded-xl hover:bg-sakura-pink hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <Upload size={18} /> 匯入 Excel
                                </button>
                                <button
                                    onClick={() => handleDownloadTemplate('PRIZES')}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <FileDown size={18} /> 下載範本
                                </button>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    ref={prizeFileInputRef}
                                    onChange={(e) => handleUpload(e, 'PRIZES')}
                                    className="hidden"
                                />

                                <div className="w-px h-10 bg-gray-200 mx-2" />

                                {/* Manual Add Group (Moved here to match Participants layout) */}
                                <div className="flex-1 flex gap-2 w-full md:w-auto items-end">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs font-bold text-gray-500 ml-1">獎項名稱</label>
                                        <input
                                            value={newPrizeName}
                                            onChange={e => setNewPrizeName(e.target.value)}
                                            placeholder="例如: 院長加碼獎"
                                            className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-sakura-pink outline-none"
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-xs font-bold text-gray-500 ml-1">名額</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={newPrizeCount}
                                            onChange={e => setNewPrizeCount(Number(e.target.value))}
                                            className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-sakura-pink outline-none text-center"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddPrize}
                                        className="bg-sakura-pink text-white p-3 rounded-xl hover:bg-sakura-dark transition-colors mb-[1px]" // align adjustment
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm p-2">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-white border-b border-gray-100 text-gray-400 text-sm">
                                        <tr>
                                            <th className="p-3">名稱</th>
                                            <th className="p-3">總名額</th>
                                            <th className="p-3">已抽出</th>
                                            <th className="p-3 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prizes.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-400">目前沒有獎項</td>
                                            </tr>
                                        )}
                                        {prizes.map(p => (
                                            <tr key={p.id} className="border-b border-gray-50 hover:bg-sakura-light/20">
                                                <td className="p-3 font-bold">{p.name}</td>
                                                <td className="p-3 font-mono">{p.count}</td>
                                                <td className="p-3 font-mono text-sakura-dark">{p.winners.length}</td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => { if (confirm('確定刪除此獎項？')) removePrize(p.id) }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: PARTICIPANTS --- */}
                    {activeTab === 'PARTICIPANTS' && (
                        <div className="flex flex-col h-full gap-6">
                            <div className="flex gap-4 items-end bg-white p-4 rounded-2xl shadow-sm flex-wrap">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-sakura-light text-sakura-dark font-bold rounded-xl hover:bg-sakura-pink hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <Upload size={18} /> 匯入 Excel
                                </button>
                                <button
                                    onClick={() => handleDownloadTemplate('PARTICIPANTS')}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <FileDown size={18} /> 下載範本
                                </button>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    ref={fileInputRef}
                                    onChange={(e) => handleUpload(e, 'PARTICIPANTS')}
                                    className="hidden"
                                />

                                <div className="w-px h-10 bg-gray-200 mx-2" />

                                {/* Filter Dropdown */}
                                <div className="flex-1">
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-sakura-pink outline-none font-bold text-gray-600"
                                    >
                                        <option value="ALL">📋 全部名單 ({participants.length})</option>
                                        <option value="NON_WINNER">🍀 尚未中獎 ({participants.filter(p => !p.isWinner && !p.disqualified).length})</option>
                                        <option disabled>──────────</option>
                                        {prizes.map(p => (
                                            <option key={p.id} value={p.id}>🏆 獲得: {p.name} ({p.winners.length})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="w-px h-10 bg-gray-200 mx-2" />

                                {/* Manual Add */}
                                <div className="flex gap-2 w-full md:w-auto">
                                    <input
                                        value={newPartName}
                                        onChange={e => setNewPartName(e.target.value)}
                                        placeholder="姓名"
                                        className="w-24 md:w-32 px-4 py-2 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-sakura-pink outline-none"
                                    />
                                    <input
                                        value={newPartDept}
                                        onChange={e => setNewPartDept(e.target.value)}
                                        placeholder="部門"
                                        className="w-24 md:w-32 px-4 py-2 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-sakura-pink outline-none"
                                    />
                                    <input
                                        value={newPartId}
                                        onChange={e => setNewPartId(e.target.value)}
                                        placeholder="員編"
                                        className="w-28 md:w-36 px-4 py-2 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-sakura-pink outline-none uppercase"
                                        maxLength={5}
                                    />
                                    <button
                                        onClick={handleAddParticipant}
                                        className="bg-sakura-pink text-white p-3 rounded-xl hover:bg-sakura-dark transition-colors"
                                    >
                                        <Plus />
                                    </button>
                                </div>
                            </div>

                            {/* Filter Logic */}
                            {(() => {
                                const filteredParticipants = participants.filter(p => {
                                    if (filterType === 'ALL') return true;
                                    if (filterType === 'NON_WINNER') return !p.isWinner && !p.disqualified;
                                    return p.wonPrizeId === filterType;
                                });

                                return (
                                    <>
                                        <div className="flex justify-between items-center px-2">
                                            <span className="text-gray-500 font-bold">
                                                顯示: {filteredParticipants.length} / 總數: {participants.length}
                                            </span>
                                        </div>

                                        <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm p-2">
                                            <table className="w-full text-left">
                                                <thead className="sticky top-0 bg-white border-b border-gray-100 text-gray-500 font-bold text-base z-10">
                                                    <tr>
                                                        <th className="p-4">姓名</th>
                                                        <th className="p-4">部門</th>
                                                        <th className="p-4">員編</th>
                                                        <th className="p-4">狀態</th>
                                                        <th className="p-4 text-right">操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredParticipants.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="p-8 text-center text-gray-400 text-lg">此條件下沒有名單</td>
                                                        </tr>
                                                    )}
                                                    {filteredParticipants.map(p => (
                                                        <tr key={p.id} className="border-b border-gray-50 hover:bg-sakura-light/20 transition-colors">
                                                            <td className="p-4 text-xl font-bold text-gray-800">{p.name}</td>
                                                            <td className="p-4 text-gray-600">{p.department}</td>
                                                            <td className="p-4 text-gray-600 font-mono text-lg">{p.employeeId}</td>
                                                            <td className="p-4">
                                                                {p.isWinner && (
                                                                    <span className="bg-sakura-pink text-white text-base px-3 py-1.5 rounded-full mr-2 shadow-sm font-bold">
                                                                        🏆 {prizes.find(pz => pz.id === p.wonPrizeId)?.name || '已中獎'}
                                                                    </span>
                                                                )}
                                                                {p.disqualified && <span className="bg-gray-200 text-gray-500 text-sm px-3 py-1.5 rounded-full font-bold">🚫 已取消</span>}
                                                                {!p.isWinner && !p.disqualified && <span className="text-gray-300 text-sm font-mono">•</span>}
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <button
                                                                    onClick={() => { if (confirm('確定刪除此人？')) removeParticipant(p.id) }}
                                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* --- TAB: SYSTEM --- */}
                    {activeTab === 'SYSTEM' && (
                        <div className="flex flex-col items-center justify-center h-full gap-6">
                            <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md border border-gray-100 space-y-4 w-full">
                                <h3 className="text-2xl font-bold text-gray-700 mb-2">系統操作</h3>

                                <button
                                    onClick={handleLoadDefault}
                                    className="w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <Database size={20} /> 載入預設資料 (Load Default)
                                </button>

                                <button
                                    onClick={handleExport}
                                    className="w-full py-3 bg-green-50 text-green-600 font-bold rounded-xl hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <FileDown size={20} /> 匯出結果 (Export Excel)
                                </button>

                                <div className="h-px bg-gray-200 my-4" />

                                <button
                                    onClick={() => { if (confirm('⚠️ 警告：這將會清除所有資料！確定要重置嗎？')) reset() }}
                                    className="w-full py-3 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={20} /> 全部重置 (Reset All)
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
