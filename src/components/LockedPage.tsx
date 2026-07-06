import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldAlert, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LockedPageProps {
  requiredPermission?: string;
  pageName?: string;
}

const LockedPage: React.FC<LockedPageProps> = ({ 
  requiredPermission = 'Tenant Admin ขึ้นไป', 
  pageName = 'หน้านี้ทำงานเฉพาะผู้ดูแลระบบ' 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg p-8 md:p-10 text-center shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Shimmer Light Gradients for premium look */}
        <div className="absolute top-0 left-12 right-12 h-[3px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Padlock Illustration with Glow rings */}
        <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-500/15 dark:bg-amber-550/10 rounded-full animate-ping duration-[3000ms]" />
          <div className="absolute inset-2 bg-gradient-to-tr from-amber-500 to-yellow-400 opacity-20 rounded-full blur-sm" />
          <div className="relative bg-gradient-to-br from-amber-500 to-yellow-500 text-white p-5 rounded-3xl shadow-lg shadow-amber-500/20 transform hover:rotate-12 transition-transform duration-300">
            <Lock className="w-10 h-10 stroke-[2.5]" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-900 dark:bg-slate-100 p-1.5 rounded-xl text-white dark:text-slate-900 shadow-md">
            <KeyRound className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-sans">
          สิทธิ์การเข้าถึงถูกจำกัด
        </h2>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mt-1">
          Access Denied • {pageName}
        </p>

        {/* Divider */}
        <div className="my-6 border-t border-dashed border-slate-200 dark:border-slate-800" />

        {/* Role & Permission Description */}
        <div className="space-y-4 text-left">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5 leading-relaxed font-semibold">
              <p className="text-slate-800 dark:text-slate-250">
                เนื่องจากประเภทบัญชีของคุณมีระดับสิทธิ์ไม่เหมาะสมในการเปิดใช้งานเครื่องมือนี้:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-bold">
                <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase block tracking-wider font-extrabold">สิทธิ์ของคุณ</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {user?.isAdmin ? "Super Admin" :
                     user?.isTenantAdmin ? "Tenant Admin" :
                     "Viewer Only"}
                  </span>
                </div>
                <div className="p-2 bg-amber-500/10 dark:bg-amber-950/20 rounded-lg border border-amber-500/20">
                  <span className="text-[10px] text-amber-500 dark:text-amber-400 uppercase block tracking-wider font-extrabold">สิทธิ์ขั้นต่ำ</span>
                  <span className="text-amber-600 dark:text-amber-400">{requiredPermission}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-sans text-center">
            ระบบความปลอดภัย Smart Control ล็อกไว้สำหรับผู้ที่มีสิทธิ์จัดการอุปกรณ์ และกำหนดค่าเซนเซอร์กลุ่มเท่านั้น กรุณาติดต่อหัวหน้าโครงการหรือผู้ดูแลระดับสูง (Super Admin) หากจำเป็นต้องการขยายสิทธิ์พิกัดอุปกรณ์ของคุณ
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ย้อนกลับไปก่อนหน้า</span>
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg shadow-indigo-500/10 transition-transform active:scale-[0.98]"
          >
            <span>กลับสู่หน้าแดชบอร์ด</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default LockedPage;
