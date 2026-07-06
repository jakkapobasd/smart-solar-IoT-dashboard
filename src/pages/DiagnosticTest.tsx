import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Lightbulb, 
  Moon, 
  Play, 
  StopCircle, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  Sliders, 
  X, 
  Activity, 
  AlertCircle, 
  CheckCircle2,
  Terminal,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import DeviceService from '../services/DeviceService';
import { motion, AnimatePresence } from 'motion/react';
import { recordTestStart, recordTestStop } from '../lib/testHistory';

interface Group {
  id: string;
  name: string;
  description?: string;
  mcAddr?: string;
}

interface Device {
  devEui: string;
  name: string;
  lastSeenAt?: string;
}

const DiagnosticTest: React.FC = () => {
  const requestRunIdRef = useRef<number>(0);
  const { user } = useAuth();
  
  // Data states
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Configuration states
  const [testType, setTestType] = useState<'on' | 'off'>('on');
  const [durationPreset, setDurationPreset] = useState<'1' | '5' | '10' | 'custom'>('5');
  const [customDuration, setCustomDuration] = useState<number>(3); // minutes
  const [originalDuration, setOriginalDuration] = useState<number>(300); // duration in seconds

  // Flow & Modal states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(100); // percentage for countdown
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [commandPending, setCommandPending] = useState(false);

  // Logs / Console Output
  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs(prev => [...prev, { time: timeStr, text, type }]);
  };

  // Fetch groups
  const fetchGroups = async () => {
    if (!user?.applicationId) return;
    setLoadingGroups(true);
    try {
      const res = await api.get('/multicast-groups', {
        params: { applicationId: user.applicationId, limit: 100 }
      });
      const fetchedGroups = res.data.result || [];
      setGroups(fetchedGroups);
      if (fetchedGroups.length > 0) {
        const savedGroupId = localStorage.getItem('lastDiagnosticGroupId');
        const matched = fetchedGroups.find(g => g.id === savedGroupId);
        setSelectedGroup(matched || fetchedGroups[0]);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch multicast groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch devices inside selected group
  const fetchGroupDevices = async (groupId: string) => {
    setLoadingDevices(true);
    try {
      const res = await api.get('/devices', {
        params: { 
          applicationId: user?.applicationId, 
          multicastGroupId: groupId,
          limit: 100 
        }
      });
      setDevices(res.data.result || []);
    } catch (err) {
      console.error("Fetch group devices error:", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupDevices(selectedGroup.id);
    } else {
      setDevices([]);
    }
  }, [selectedGroup]);

  // Terminal scroll to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Restore active test on mount
  useEffect(() => {
    const storedTest = localStorage.getItem('activeDiagnosticTest');
    if (storedTest) {
      try {
        const parsed = JSON.parse(storedTest);
        const elapsedSecs = Math.floor((Date.now() - parsed.startTime) / 1000);
        if (elapsedSecs < parsed.duration) {
          const remaining = parsed.duration - elapsedSecs;
          setOriginalDuration(parsed.duration);
          setIsTestRunning(true);
          setTimeLeft(remaining);
          setTestType(parsed.type);
          const progress = Math.round((remaining / parsed.duration) * 100);
          setTestProgress(progress);
          
          addLog(`🔄 Resumed diagnostic monitoring for group: [${parsed.groupName}]`, 'info');
          addLog(`⏱️ Remaining time: ${remaining} วินาที (${Math.floor(remaining / 60)} นาที ${remaining % 60} วินาที)`, 'info');
        } else {
          localStorage.removeItem('activeDiagnosticTest');
        }
      } catch (e) {
        console.error("Failed to parse active diagnostic test", e);
      }
    }
  }, []);

  // Get cumulative duration in minutes
  const getTestDurationMinutes = (): number => {
    if (durationPreset === '1') return 1;
    if (durationPreset === '5') return 5;
    if (durationPreset === '10') return 10;
    return customDuration;
  };

  // Pre-test preview triggers
  const handleOpenPreview = () => {
    if (!selectedGroup) {
      showToast('error', 'กรุณาเลือกกลุ่มที่จะทดสอบก่อน');
      return;
    }
    setIsPreviewOpen(true);
  };

  // Staggered trigger flow similar to triggerDeviceCommandSeq
  const handleStartTest = async () => {
    if (!selectedGroup) return;
    setIsPreviewOpen(false);
    setIsTestRunning(true);
    setCommandPending(true);
    setLogs([]);

    const durationMins = getTestDurationMinutes();
    const durationSecs = durationMins * 60;
    setOriginalDuration(durationSecs);
    setTimeLeft(durationSecs);
    setTestProgress(100);

    const level = testType === 'on' ? 100 : 0;
    addLog(`🔄 Initiation requested: Group [${selectedGroup.name}]`, 'info');
    addLog(`⏱️ Configured parameters: Mode=${testType.toUpperCase()} (Brightness ${level}%), Duration=${durationSecs} วินาที (${durationMins} นาที)`, 'info');
    addLog(`📡 Target fleet size: ${devices.length} LoRaWAN endpoints`, 'info');

    const currentRunId = Date.now();
    requestRunIdRef.current = currentRunId;

    // Sort devices alphabetically and numerically by name/pole number
    const sortedDevices = [...devices].sort((a, b) => {
      const nameA = a.name || a.devEui || '';
      const nameB = b.name || b.devEui || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

    try {
      if (testType === 'on') {
        addLog(`⚡ เริ่มส่งสัญญาณเปิดไฟแบบหน่วงเวลาทีละ 1 วินาที เรียงตามเสา/ชื่อ...`, 'info');
        
        // Save diagnostic test in localStorage
        const activeTest = {
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          startTime: Date.now(),
          duration: durationSecs,
          type: testType,
          level: level,
          deviceEuis: sortedDevices.map(d => d.devEui)
        };
        localStorage.setItem('activeDiagnosticTest', JSON.stringify(activeTest));

        // Also record the test history for telemetry graphing purposes
        recordTestStart(
          sortedDevices.map(d => d.devEui),
          level,
          durationSecs,
          `Diagnostic Group: ${selectedGroup.name}`,
          testType
        );

        // Turn ON using Multicast Group API
        addLog(`⚡ ส่งสัญญาณเปิดไฟ (Bulk) ไปยังกลุ่ม [${selectedGroup.name}]...`, 'info');
        
        try {
          await DeviceService.setGroupBrightness(selectedGroup.id, {
            brightnessLevel: level,
            duration: durationSecs
          });
          if (requestRunIdRef.current === currentRunId) {
            addLog(`✅ สั่งเปิดไฟ 100% กลุ่ม [${selectedGroup.name}] สำเร็จ`, 'success');
            addLog(`⚡ สั่งเปิดไฟเสร็จสิ้น`, 'success');
          }
        } catch (err: any) {
          if (requestRunIdRef.current === currentRunId) {
            const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error occurred';
            addLog(`❌ ส่งสัญญาณเกิดข้อผิดพลาด: ${errMsg}`, 'error');
          }
        }
      } else {
        // testType === 'off' -> Turn OFF using Multicast Group API
        addLog(`⚡ ส่งสัญญาณปิดไฟ (Bulk) ไปยังกลุ่ม [${selectedGroup.name}]...`, 'info');
        
        try {
          await DeviceService.setGroupBrightness(selectedGroup.id, {
            brightnessLevel: level,
            duration: durationSecs
          });
          if (requestRunIdRef.current === currentRunId) {
            addLog(`✅ สั่งปิดไฟ 0% กลุ่ม [${selectedGroup.name}] สำเร็จ`, 'success');
          }
        } catch (err: any) {
          if (requestRunIdRef.current === currentRunId) {
            const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error occurred';
            addLog(`❌ ส่งสัญญาณเกิดข้อผิดพลาด: ${errMsg}`, 'error');
          }
        }
        
        if (requestRunIdRef.current === currentRunId) {
          // Save diagnostic test in localStorage
          const activeTest = {
            groupId: selectedGroup.id,
            groupName: selectedGroup.name,
            startTime: Date.now(),
            duration: durationSecs,
            type: testType,
            level: level,
            deviceEuis: sortedDevices.map(d => d.devEui)
          };
          localStorage.setItem('activeDiagnosticTest', JSON.stringify(activeTest));

          // Also record the test history for telemetry graphing purposes
          recordTestStart(
            sortedDevices.map(d => d.devEui),
            level,
            durationSecs,
            `Diagnostic Group: ${selectedGroup.name}`,
            testType
          );

          addLog(`⚡ สั่งปิดไฟเสร็จสิ้นครบทุกโคมแล้ว`, 'success');
        }
      }

      if (requestRunIdRef.current === currentRunId) {
        showToast('success', 'เริ่มทำการทดสอบระบบเรียบร้อยเเล้ว');
      }
    } catch (err: any) {
      if (requestRunIdRef.current === currentRunId) {
        const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Unknown network error';
        addLog(`❌ Failed to transmit broadcast payload: ${errMsg}`, 'error');
        showToast('error', `Failed to start test: ${errMsg}`);
      }
    } finally {
      if (requestRunIdRef.current === currentRunId) {
        setCommandPending(false);
      }
    }
  };

  // Timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTestRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          setTestProgress(Math.round((next / originalDuration) * 100));
          
          if (next <= 0) {
            clearInterval(timer);
            setIsTestRunning(false);
            localStorage.removeItem('activeDiagnosticTest');
            recordTestStop(devices.map(d => d.devEui));
            addLog(`⌛ Scheduled testing loop completed naturally. System restored to default routing mode.`, 'info');
            showToast('success', 'สิ้นสุดการทดสอบระบบและคืนค่าเรียบร้อยเเล้ว');
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTestRunning, timeLeft, originalDuration]);

  // Cancel/Stop test early (revert to resting state)
  const handleStopTest = async () => {
    if (!selectedGroup) return;
    setCommandPending(true);
    addLog(`⏹️ Diagnostic cancel sequence initiated by administrator.`, 'warn');
    
    // Abort any currently running test loops instantly
    requestRunIdRef.current = Date.now();

    // Determine target resting level:
    // If testing 'on' (100%), resting state is 0%
    // If testing 'off' (0%), resting state is 100%
    const revertLevel = testType === 'on' ? 0 : 100;
    
    try {
      // Revert group brightness to resting state (using standard duration of 600 seconds to pass backend validation)
      await DeviceService.setGroupBrightness(selectedGroup.id, {
        brightnessLevel: revertLevel,
        duration: 600
      });

      // Stop any active overridden brightness entries
      recordTestStop(devices.map(d => d.devEui));

      addLog(`♻️ Revert signal sent. Group brightness restored to ${revertLevel}% immediately.`, 'success');
      showToast('success', `ยกเลิกการทดสอบและกู้คืนระดับสัญญาณสว่าง ${revertLevel}% เรียบร้อยเเล้ว`);
      setIsTestRunning(false);
      setTimeLeft(0);
      localStorage.removeItem('activeDiagnosticTest');
    } catch (err: any) {
      addLog(`⚠️ Revert transmission warning: ${err.message}`, 'error');
      // Force UI stop even if API complains
      setIsTestRunning(false);
      setTimeLeft(0);
      localStorage.removeItem('activeDiagnosticTest');
    } finally {
      setCommandPending(false);
    }
  };

  // Quick switch active test type or change parameters while testing is running!
  const handleQuickSwitch = async (newType: 'on' | 'off') => {
    if (!selectedGroup) return;
    
    // Stop any currently running sequentials instantly
    const currentRunId = Date.now();
    requestRunIdRef.current = currentRunId;
    
    setCommandPending(true);
    setTestType(newType);
    
    const durationMins = getTestDurationMinutes();
    const durationSecs = durationMins * 60;
    setOriginalDuration(durationSecs);
    setTimeLeft(durationSecs);
    setTestProgress(100);
    
    const level = newType === 'on' ? 100 : 0;
    addLog(`🔄 [Quick Change] สลับสถานะการทดสอบเป็น [${newType === 'on' ? 'เปิดไฟ 100%' : 'ปิดไฟ 0%'}] ทันที (เริ่มจับเวลาใหม่ ${durationMins} นาที)`, 'warn');
    addLog(`📡 Target fleet size: ${devices.length} LoRaWAN endpoints`, 'info');

    // Sort devices alphabetically and numerically
    const sortedDevices = [...devices].sort((a, b) => {
      const nameA = a.name || a.devEui || '';
      const nameB = b.name || b.devEui || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

    try {
      if (newType === 'on') {
        // TURN ON using Multicast Group API
        addLog(`⚡ กำลังส่งสัญญาณควบคุมด่วน (Bulk) สว่าง 100% กลุ่ม [${selectedGroup.name}]...`, 'info');
        try {
          await DeviceService.setGroupBrightness(selectedGroup.id, {
            brightnessLevel: 100,
            duration: durationSecs
          });
          if (requestRunIdRef.current === currentRunId) {
            addLog(`✅ สั่งเปิดไฟด่วน 100% กลุ่ม [${selectedGroup.name}] สำเร็จ`, 'success');
          }
        } catch (err: any) {
          if (requestRunIdRef.current === currentRunId) {
            const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error';
            addLog(`❌ ส่งสัญญาณด่วนเกิดข้อผิดพลาด: ${errMsg}`, 'error');
          }
        }
      } else {
        // TURN OFF using Multicast Group API
        addLog(`⚡ กำลังส่งสัญญาณควบคุมด่วน (Bulk) ปิดไฟ 0% กลุ่ม [${selectedGroup.name}]...`, 'info');
        try {
          await DeviceService.setGroupBrightness(selectedGroup.id, {
            brightnessLevel: 0,
            duration: durationSecs
          });
          if (requestRunIdRef.current === currentRunId) {
            addLog(`✅ สั่งปิดไฟด่วน 0% กลุ่ม [${selectedGroup.name}] สำเร็จ`, 'success');
          }
        } catch (err: any) {
          if (requestRunIdRef.current === currentRunId) {
            const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error';
            addLog(`❌ ส่งสัญญาณด่วนเกิดข้อผิดพลาด: ${errMsg}`, 'error');
          }
        }
      }

      if (requestRunIdRef.current === currentRunId) {
        // Update localStorage
        const activeTest = {
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          startTime: Date.now(),
          duration: durationSecs,
          type: newType,
          level: level,
          deviceEuis: sortedDevices.map(d => d.devEui)
        };
        localStorage.setItem('activeDiagnosticTest', JSON.stringify(activeTest));

        // Re-record
        recordTestStart(
          sortedDevices.map(d => d.devEui),
          level,
          durationSecs,
          `Diagnostic Group: ${selectedGroup.name}`,
          newType
        );

        addLog(`⚡ สั่งปรับระดับความสว่างต่อเนื่องครบถ้วนทุกดวงเสร็จสิ้น`, 'success');
        showToast('success', `สลับเป็นสถานะ ${newType === 'on' ? 'เปิดไฟ 100%' : 'ปิดไฟ 0%'} เรียบร้อยแล้ว`);
      }
    } catch (err: any) {
      if (requestRunIdRef.current === currentRunId) {
        const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error';
        addLog(`❌ เกิดข้อผิดพลาด: ${errMsg}`, 'error');
        showToast('error', `เปลี่ยนโหมดล้มเหลว: ${errMsg}`);
      }
    } finally {
      if (requestRunIdRef.current === currentRunId) {
        setCommandPending(false);
      }
    }
  };



  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-24 right-8 z-[9999] flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300",
          toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="font-bold text-sm uppercase tracking-tight">{toast.message}</span>
        </div>
      )}



      {!isTestRunning ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
              <h3 className="text-sm font-black text-slate-850 dark:text-gray-100 uppercase tracking-wider flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>1. กำหนดค่าพารามิเตอร์การทดสอบ (Test Parameters)</span>
              </h3>

              {/* Multicast Group Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">เลือกกลุ่มทดสอบ (Multicast Group)</label>
                <div className="relative">
                  <select
                    value={selectedGroup?.id || ''}
                    onChange={(e) => {
                      const grp = groups.find(g => g.id === e.target.value) || null;
                      setSelectedGroup(grp);
                      if (grp) {
                        localStorage.setItem('lastDiagnosticGroupId', grp.id);
                      } else {
                        localStorage.removeItem('lastDiagnosticGroupId');
                      }
                    }}
                    className="w-full bg-slate-50/80 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-750 rounded-2xl pl-12 pr-10 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none shadow-sm"
                  >
                    {groups.length === 0 ? (
                      <option value="">No Groups Found</option>
                    ) : (
                      groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))
                    )}
                  </select>
                  <Users className="absolute left-4.5 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
                  <ChevronDown className="absolute right-4.5 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {selectedGroup && (
                  <p className="text-xs text-slate-500 italic pl-1 mt-1">
                    {selectedGroup.description || 'ไม่มีคำอธิบายสำหรับกลุ่มนี้'} • มีอุปกรณ์ทั้งหมด <span className="font-bold text-blue-600">{devices.length}</span> ตัวในกลุ่ม
                  </p>
                )}
              </div>

              {/* Action Selection (On 100% / Off 0%) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">คำสั่งที่จะทดสอบ (Control Action)</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTestType('on')}
                    className={cn(
                      "flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center group cursor-pointer",
                      testType === 'on' 
                        ? "bg-emerald-500/10 border-emerald-500/80 dark:border-emerald-500 text-emerald-800 dark:text-emerald-400 shadow-sm" 
                        : "bg-slate-50/50 hover:bg-slate-55/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400"
                    )}
                  >
                    <Lightbulb className={cn(
                      "w-8 h-8 mb-2 transition-transform duration-300",
                      testType === 'on' ? "scale-110 text-emerald-500 rotate-12" : "text-slate-400 group-hover:rotate-12"
                    )} />
                    <span className="text-sm font-bold uppercase tracking-tight">สั่งเปิดไฟ 100%</span>
                    <span className="text-[10px] text-slate-400/80 dark:text-slate-500 mt-1">บังคับเปิดหลอดไฟทุกดวงเต็มกำลัง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestType('off')}
                    className={cn(
                      "flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center group cursor-pointer",
                      testType === 'off' 
                        ? "bg-rose-500/10 border-rose-500/80 dark:border-rose-500 text-rose-800 dark:text-rose-400 shadow-sm" 
                        : "bg-slate-50/50 hover:bg-slate-55/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400"
                    )}
                  >
                    <Moon className={cn(
                      "w-8 h-8 mb-2 transition-transform duration-300",
                      testType === 'off' ? "scale-110 text-rose-500 -rotate-12" : "text-slate-400 group-hover:-rotate-12"
                    )} />
                    <span className="text-sm font-bold uppercase tracking-tight">สั่งปิดไฟ 0%</span>
                    <span className="text-[10px] text-slate-400/80 dark:text-slate-500 mt-1">ตัดสัญญาณควบคุม ดับไฟเพื่อทดสอบเสา</span>
                  </button>
                </div>
              </div>

              {/* Duration Configurator */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">ระบุเวลาทดสอบ (Duration Configuration)</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: '1 นาที', value: '1' },
                    { label: '5 นาที', value: '5' },
                    { label: '10 นาที', value: '10' },
                    { label: 'กําหนดเอง (Custom)', value: 'custom' }
                  ].map(item => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setDurationPreset(item.value as any)}
                      className={cn(
                        "px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer border",
                        durationPreset === item.value 
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                          : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-300"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {durationPreset === 'custom' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 mt-3 space-y-3"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">แนะนําตัวเลือกหรือกรอกนาทีที่สมดุล</span>
                      <span className="text-blue-600 font-black uppercase">{customDuration} นาที (Minutes)</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <input 
                        type="range" 
                        min="1" 
                        max="120" 
                        value={customDuration}
                        onChange={(e) => setCustomDuration(parseInt(e.target.value, 10))}
                        className="flex-1 accent-blue-600 cursor-pointer"
                      />
                      <input 
                        type="number"
                        min="1"
                        max="1440"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-20 px-3 py-2 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 italic">ขอบเขต: สัญญาณสามารถคงสถานะต่อเนื่องได้สูงสุด 1,440 นาที (24 ชั่วโมง)</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Information Preview Ticket */}
          <div className="space-y-6">
            <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col h-full justify-between">
              <div className="space-y-5">
                <div className="flex items-center space-x-2 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  <span>สรุปการตั้งค่าทดสอบ (Live Config)</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">เป้าหมายกลุ่ม (Target)</span>
                    <span className="font-bold text-slate-800 dark:text-gray-200">{selectedGroup?.name || 'ไม่ได้เลือก'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">คําสั่งทดสอบ (Action)</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded font-bold text-[10px] uppercase",
                      testType === 'on' 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" 
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                    )}>
                      {testType === 'on' ? 'เปิดไฟ 100%' : 'ปิดไฟ 0%'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">ช่วงเวลาทํางาน (Duration)</span>
                    <span className="font-bold text-slate-800 dark:text-gray-200">{getTestDurationMinutes() * 60} วินาที ({getTestDurationMinutes()} นาที)</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">จํานวนหลอดไฟ (Node Size)</span>
                    <span className="font-bold text-blue-600">{devices.length} หลอด</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  disabled={!selectedGroup || devices.length === 0}
                  className="w-full h-12 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 text-white" />
                  <span>เริ่มตรวจสอบ & ทดสอบระบบ</span>
                </button>
                {!selectedGroup && (
                  <p className="text-[10px] text-center text-rose-500 font-bold mt-2">กรุณาเลือกกลุ่มที่จะทำงานป้อนข้อมูล</p>
                )}
                {selectedGroup && devices.length === 0 && (
                  <p className="text-[10px] text-center text-amber-500 font-bold mt-2">ไม่มีความสัมพันธ์กับอุปกรณ์ใดๆ ในระบบกลุ่มนี้</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Running Test Progress Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
          {/* Main Monitor Card */}
          <div className="lg:col-span-2 card p-8 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-xl flex flex-col justify-between min-h-[460px] relative overflow-hidden">
            
            {/* Top Indicator */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/85 pb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <span className="flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-600"></span>
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight">Active Diagnostic Process running</h4>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider">GROUP: <span className="text-blue-600 font-bold">{selectedGroup?.name}</span></p>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-50/80 dark:bg-blue-952/30 border border-blue-200/50 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase">
                {testType === 'on' ? '💡 สว่าง 100%' : '🌙 ดับ 0%'}
              </span>
            </div>

            {/* Huge Timer Screen */}
            <div className="flex flex-col items-center justify-center my-6 space-y-4">
              <div className="relative w-44 h-44 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-950/40 overflow-hidden shadow-inner">
                {/* SVG Ring Progress */}
                <svg viewBox="0 0 176 176" className="absolute inset-0 w-full h-full transform -rotate-90">
                  {/* Underlay tracking circle filled gray */}
                  <circle 
                    cx="88" 
                    cy="88" 
                    r="78" 
                    fill="transparent" 
                    stroke="#e2e8f0" 
                    strokeWidth="7"
                    className="dark:stroke-slate-800/80"
                  />
                  {/* Foreground progress circle */}
                  <circle 
                    cx="88" 
                    cy="88" 
                    r="78" 
                    fill="transparent" 
                    stroke="url(#blue_gradient)" 
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 78}
                    strokeDashoffset={2 * Math.PI * 78 * (1 - testProgress / 100)}
                    className="transition-all duration-1000 ease-linear"
                  />
                  <defs>
                    <linearGradient id="blue_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-center select-none z-10">
                  <p className="text-3xl font-extrabold font-mono tracking-tight text-slate-950 dark:text-white leading-none">{formatTime(timeLeft)}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1.5">เวลาที่เหลือ</p>
                </div>
              </div>

              {/* Status bar */}
              <div className="w-full max-w-sm">
                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-black mb-1.5">
                  <span className="tracking-wider">Progress Ratio</span>
                  <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{testProgress}% Left</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-850 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${testProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Live Test Quick Controls */}
            <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4.5 space-y-4">
              <div>
                <h4 className="text-xs font-black text-slate-450 dark:text-slate-450 uppercase tracking-widest block mb-2.5">ปรับคำสั่งทำงานทันที (Change Action Instantly)</h4>
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    disabled={commandPending}
                    onClick={() => handleQuickSwitch('on')}
                    className={cn(
                      "flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer",
                      testType === 'on' 
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" 
                        : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-55/80 dark:hover:bg-slate-800"
                    )}
                  >
                    <Lightbulb className="w-4 h-4 shrink-0" />
                    <span>เปลี่ยนมาสั่งเปิดไฟ 100%</span>
                  </button>
                  <button
                    type="button"
                    disabled={commandPending}
                    onClick={() => handleQuickSwitch('off')}
                    className={cn(
                      "flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer",
                      testType === 'off' 
                        ? "bg-rose-500 text-white border-rose-500 shadow-sm" 
                        : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-55/80 dark:hover:bg-slate-800"
                    )}
                  >
                    <Moon className="w-4 h-4 shrink-0" />
                    <span>เปลี่ยนมาสั่งปิดไฟ 0%</span>
                  </button>
                </div>
              </div>


            </div>

            {/* Stop Panel */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-150/60 dark:border-slate-800/60 mt-4">
              <button
                type="button"
                onClick={handleStopTest}
                disabled={commandPending}
                className="w-full md:w-auto shrink-0 px-6 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-red-500/10 flex items-center justify-center space-x-2 cursor-pointer transition-all duration-150 active:scale-[0.98]"
              >
                <StopCircle className="w-4 h-4 shrink-0" />
                <span>
                  {testType === 'on' 
                    ? 'ยกเลิกการทดสอบและสั่งดับไฟ (Turn Off Now)' 
                    : 'ยกเลิกการทดสอบและกลับสู่สว่างปกติ (Turn On / Revert Now)'}
                </span>
              </button>
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-center md:text-left">
                {testType === 'on'
                  ? '*หากกดยกเลิก ระบบจะส่งสัญญาณเพื่อรีเซ็ตอุปกรณ์ปลายทางในกลุ่มให้ดับลง (ความสว่าง 0%) ทันที'
                  : '*หากกดยกเลิก ระบบจะส่งสัญญาณเพื่อรีเซ็ตอุปกรณ์ปลายทางในกลุ่มกลับสู่สถานะส่องสว่างปกติ (ความสว่าง 100%) ทันที'}
              </span>
            </div>
          </div>

          {/* Interactive Console Terminal Output */}
          <div className="flex flex-col h-full min-h-[460px] card bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900 px-5 py-3 border-b border-slate-950 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-black text-slate-300 uppercase tracking-widest">LoRaWAN Beacon Console</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono text-slate-400 tracking-wider">FEEDING</span>
              </div>
            </div>

            {/* Log list area */}
            <div className="flex-1 overflow-y-auto p-5 font-mono text-[10.5px] space-y-2 select-text custom-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic select-none">
                  <span>... Awaiting connection signals ...</span>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2 animate-in fade-in duration-200">
                    <span className="text-slate-500 select-none shrink-0">{log.time}</span>
                    <span className={cn(
                      "break-all",
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'warn' ? 'text-amber-400 font-semibold' :
                      log.type === 'error' ? 'text-rose-500 font-bold' : 'text-slate-300'
                    )}>
                      {log.text}
                    </span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>

            <div className="bg-slate-900/60 px-5 py-2.5 text-[9px] text-slate-500 font-mono tracking-wider border-t border-slate-950 flex justify-between uppercase">
              <span>BaudRate: 115200 bps</span>
              <span>Port: Bulk Comm (Staggered)</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isPreviewOpen && selectedGroup && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">ยืนยันพารามิเตอร์การทดลอง</h3>
                    <p className="text-xs text-slate-500">ตรวจสอบความพร้อมของระบบและจํานวนอุปกรณ์ข่ายสัญญาณ</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  คุณกำลังจะสั่งดำเนินการส่งสัญญาณควบคุมระบบทดสอบเสากลุ่ม โดยอุปกรณ์ทั้งหมดในกลุ่มเป้าหมายจะเพิกเฉยต่อการวัดแสงช่วงเวลาและการสะกดรหัสตารางเวลาปกติชั่วคราว มีสรุปแนะนําดังนี้:
                </p>

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3.5">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">กลุ่มเป้าหมาย</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{selectedGroup.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">การเปลี่ยนเเปลง</p>
                      <p className={cn(
                        "text-sm font-black mt-0.5 uppercase",
                        testType === 'on' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {testType === 'on' ? 'เปิดสว่าง 100%' : 'ปิดสนิท 0%'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-3.5 border-t border-slate-100 dark:border-slate-800/50">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">เวลาทดสอบต่อเนื่อง</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{getTestDurationMinutes()} นาที {(getTestDurationMinutes() * 60)} วินาที</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono font-black">ผลกระทบเครือข่าย</p>
                      <p className="text-sm font-black text-blue-600 mt-0.5">{devices.length} อุปกรณ์</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 text-amber-800 dark:text-amber-400/80 border border-amber-500/10 rounded-xl text-[10.5px] leading-relaxed flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>โปรดประเมินเวลาของระบบ แสงสว่างจะทำงานเต็มกำลังทันทีและอาจมีผลกับการสิ้นเปลืองพลังงานแบตเตอรี่โซลาร์เซลลูล่าร์ของเสาเหล่านี้ในช่วงกำหนดนั้น</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  ย้อนกลับแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleStartTest}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 transition-colors flex items-center space-x-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-white" />
                  <span>ยืนยันเริ่มส่งสัญญาณทดสอบ</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiagnosticTest;
