import { useState, useEffect } from "react";
import api from "../api";
import {
    BiBell, BiLockAlt, BiPalette, BiShieldQuarter,
    BiCheck, BiLoaderAlt, BiMoon, BiSun, BiGlobe,
    BiSave, BiCheckCircle
} from "react-icons/bi";
import { toast } from "react-hot-toast";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'logistics_settings';

const loadSettings = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

const saveSettings = (settings) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        window.dispatchEvent(new Event('settings_updated'));
    } catch { /* ignore */ }
};

const DEFAULT_SETTINGS = {
    notifications: {
        deliveryAlerts:       true,
        systemUpdates:        true,
        auditNotifications:   false,
        driverReports:        true,
    },
    appearance: {
        theme:       'light',
        language:    'en',
        compactMode: false,
    },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const ToggleSwitch = ({ enabled, onChange, id }) => (
    <button
        id={id}
        type="button"
        onClick={() => onChange(!enabled)}
        aria-checked={enabled}
        role="switch"
        className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-coffee-500/20 ${enabled ? 'bg-coffee-700' : 'bg-coffee-100'}`}
    >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${enabled ? 'left-7' : 'left-1'}`} />
    </button>
);

const SettingRow = ({ label, description, children }) => (
    <div className="flex items-center justify-between py-5 border-b border-coffee-50 last:border-0">
        <div className="pr-8">
            <p className="text-sm font-bold text-coffee-900">{label}</p>
            {description && <p className="text-[11px] text-coffee-400 font-medium mt-0.5">{description}</p>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

const SectionCard = ({ icon, title, description, children, badge }) => (
    <div className="bg-white rounded-[28px] p-8 border border-coffee-100 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
                <div className="w-11 h-11 bg-coffee-50 rounded-2xl flex items-center justify-center text-coffee-600 text-xl border border-coffee-100">
                    {icon}
                </div>
                <div>
                    <h2 className="text-base font-black text-coffee-950 tracking-tight">{title}</h2>
                    <p className="text-[11px] text-coffee-400 font-medium mt-0.5">{description}</p>
                </div>
            </div>
            {badge}
        </div>
        {children}
    </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const Settings = () => {

    // ── Load persisted settings ──────────────────────────────────────────────
    const persisted = loadSettings();
    const [notifications, setNotifications] = useState(
        persisted?.notifications ?? DEFAULT_SETTINGS.notifications
    );
    const [appearance, setAppearance] = useState(
        persisted?.appearance ?? DEFAULT_SETTINGS.appearance
    );
    const [notifSaved, setNotifSaved] = useState(false);

    // ── Password state ───────────────────────────────────────────────────────
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: "", newPass: "", confirm: "" });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    // ── Persist settings whenever they change ────────────────────────────────
    useEffect(() => {
        saveSettings({ notifications, appearance });
    }, [notifications, appearance]);

    // ── Notification handlers ────────────────────────────────────────────────
    const handleNotifChange = (key) => (val) => {
        setNotifications(prev => ({ ...prev, [key]: val }));
    };

    const handleSaveNotifications = () => {
        saveSettings({ notifications, appearance });
        setNotifSaved(true);
        toast.success("Notification preferences saved.");
        setTimeout(() => setNotifSaved(false), 2500);
    };

    // ── Password change handler ──────────────────────────────────────────────
    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (!passwordData.current) {
            toast.error("Please enter your current password.");
            return;
        }
        if (passwordData.newPass !== passwordData.confirm) {
            toast.error("New passwords do not match.");
            return;
        }
        if (passwordData.newPass.length < 6) {
            toast.error("New password must be at least 6 characters.");
            return;
        }
        if (passwordData.newPass === passwordData.current) {
            toast.error("New password must differ from your current password.");
            return;
        }

        setPasswordLoading(true);
        try {
            await api.post('change-password/', {
                old_password: passwordData.current,
                new_password: passwordData.newPass,
            });
            toast.success("Password updated successfully. Please log in again.");
            setPasswordData({ current: "", newPass: "", confirm: "" });
            setIsChangingPassword(false);
            // Force re-auth since Django session/JWT won't auto-refresh after password change
            setTimeout(() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/';
            }, 2000);
        } catch (error) {
            const msg = error?.response?.data?.detail || "Password update failed. Please try again.";
            toast.error(msg);
        } finally {
            setPasswordLoading(false);
        }
    };

    // ── Appearance handler ───────────────────────────────────────────────────
    const handleSaveAppearance = () => {
        saveSettings({ notifications, appearance });
        toast.success("Appearance preferences saved.");
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-fade-in max-w-3xl mx-auto pb-10">

            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-black text-coffee-900 tracking-tight">System Settings</h1>
                <p className="text-coffee-500 font-medium mt-1">Configure your preferences and account security parameters.</p>
            </div>

            {/* ── Notifications ─────────────────────────────────────────────── */}
            <SectionCard
                icon={<BiBell />}
                title="Notification Center"
                description="Manage incoming alert preferences and escalation pipelines."
                badge={
                    <button
                        id="save-notifications-btn"
                        onClick={handleSaveNotifications}
                        className={`flex items-center space-x-1.5 text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border ${
                            notifSaved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-coffee-50 text-coffee-600 border-coffee-100 hover:bg-coffee-100'
                        }`}
                    >
                        {notifSaved ? <><BiCheckCircle /><span>Saved</span></> : <><BiSave /><span>Save</span></>}
                    </button>
                }
            >
                <SettingRow label="Delivery Alerts" description="Real-time updates on active shipment milestones.">
                    <ToggleSwitch id="toggle-delivery-alerts" enabled={notifications.deliveryAlerts} onChange={handleNotifChange('deliveryAlerts')} />
                </SettingRow>
                <SettingRow label="System Broadcasts" description="Maintenance notifications and version deployments.">
                    <ToggleSwitch id="toggle-system-updates" enabled={notifications.systemUpdates} onChange={handleNotifChange('systemUpdates')} />
                </SettingRow>
                <SettingRow label="Audit Events" description="Receive notifications on policy or access changes.">
                    <ToggleSwitch id="toggle-audit-notifs" enabled={notifications.auditNotifications} onChange={handleNotifChange('auditNotifications')} />
                </SettingRow>
                <SettingRow label="Driver Activity Reports" description="Weekly summaries from field asset operations.">
                    <ToggleSwitch id="toggle-driver-reports" enabled={notifications.driverReports} onChange={handleNotifChange('driverReports')} />
                </SettingRow>
            </SectionCard>

            {/* ── Security / Password ───────────────────────────────────────── */}
            <SectionCard
                icon={<BiLockAlt />}
                title="Security Override"
                description="Update your authentication key and access control parameters."
            >
                {!isChangingPassword ? (
                    <div className="flex items-center justify-between bg-coffee-50/50 p-5 rounded-2xl border border-coffee-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-coffee-100 rounded-xl flex items-center justify-center">
                                <BiShieldQuarter className="text-coffee-700 text-lg" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-coffee-900">Password Protected</p>
                                <p className="text-[11px] text-coffee-400 font-medium mt-0.5">Your account is secured with a hashed credential.</p>
                            </div>
                        </div>
                        <button
                            id="change-password-btn"
                            onClick={() => setIsChangingPassword(true)}
                            className="text-[11px] font-black uppercase tracking-widest text-coffee-600 hover:text-coffee-900 transition-all border border-coffee-200 px-4 py-2 rounded-xl hover:bg-coffee-50"
                        >
                            Change Key
                        </button>
                    </div>
                ) : (
                    <form id="password-change-form" onSubmit={handlePasswordChange} className="space-y-5 animate-fade-in">
                        {/* Current Password */}
                        <div>
                            <label className="block text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-1.5">
                                Current Password
                            </label>
                            <input
                                id="current-password-input"
                                type={showPasswords ? "text" : "password"}
                                placeholder="Your existing password"
                                value={passwordData.current}
                                onChange={e => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                                className="w-full bg-coffee-50/30 border border-coffee-100 rounded-xl px-4 py-3 text-sm font-medium text-coffee-900 focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-500 outline-none transition-all placeholder-coffee-200"
                                required
                            />
                        </div>

                        {/* New Password */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-1.5">
                                    New Password
                                </label>
                                <input
                                    id="new-password-input"
                                    type={showPasswords ? "text" : "password"}
                                    placeholder="Min. 6 characters"
                                    value={passwordData.newPass}
                                    onChange={e => setPasswordData(prev => ({ ...prev, newPass: e.target.value }))}
                                    className="w-full bg-coffee-50/30 border border-coffee-100 rounded-xl px-4 py-3 text-sm font-medium text-coffee-900 focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-500 outline-none transition-all placeholder-coffee-200"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-1.5">
                                    Confirm New Password
                                </label>
                                <input
                                    id="confirm-password-input"
                                    type={showPasswords ? "text" : "password"}
                                    placeholder="Repeat new password"
                                    value={passwordData.confirm}
                                    onChange={e => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                                    className={`w-full bg-coffee-50/30 border rounded-xl px-4 py-3 text-sm font-medium text-coffee-900 focus:ring-4 outline-none transition-all placeholder-coffee-200 ${
                                        passwordData.confirm && passwordData.newPass !== passwordData.confirm
                                            ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400'
                                            : 'border-coffee-100 focus:ring-coffee-500/10 focus:border-coffee-500'
                                    }`}
                                    required
                                />
                                {passwordData.confirm && passwordData.newPass !== passwordData.confirm && (
                                    <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">Passwords do not match</p>
                                )}
                            </div>
                        </div>

                        {/* Password strength indicator */}
                        {passwordData.newPass && (
                            <div className="space-y-1.5 animate-fade-in">
                                <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest">Password Strength</p>
                                <div className="flex space-x-1">
                                    {[
                                        { min: 1,  color: 'bg-rose-400' },
                                        { min: 4,  color: 'bg-amber-400' },
                                        { min: 6,  color: 'bg-yellow-400' },
                                        { min: 8,  color: 'bg-emerald-400' },
                                        { min: 10, color: 'bg-emerald-600' },
                                    ].map((seg, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                passwordData.newPass.length >= seg.min ? seg.color : 'bg-coffee-100'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-[10px] text-coffee-400 font-medium">
                                    {passwordData.newPass.length < 4  ? 'Too short' :
                                     passwordData.newPass.length < 6  ? 'Weak' :
                                     passwordData.newPass.length < 8  ? 'Fair' :
                                     passwordData.newPass.length < 10 ? 'Strong' : 'Very Strong'}
                                </p>
                            </div>
                        )}

                        {/* Show passwords toggle */}
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="show-passwords"
                                checked={showPasswords}
                                onChange={e => setShowPasswords(e.target.checked)}
                                className="w-4 h-4 rounded border-coffee-300 text-coffee-700 focus:ring-coffee-500 cursor-pointer"
                            />
                            <label htmlFor="show-passwords" className="text-[11px] font-bold text-coffee-500 cursor-pointer select-none">
                                Show passwords
                            </label>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-2 border-t border-coffee-50">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsChangingPassword(false);
                                    setPasswordData({ current: "", newPass: "", confirm: "" });
                                    setShowPasswords(false);
                                }}
                                className="px-5 py-2.5 text-sm font-bold text-coffee-400 hover:bg-coffee-50 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                id="submit-password-btn"
                                type="submit"
                                disabled={passwordLoading}
                                className="flex items-center space-x-2 bg-coffee-700 hover:bg-coffee-800 text-white px-7 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-coffee-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                            >
                                {passwordLoading
                                    ? <><BiLoaderAlt className="animate-spin" /><span>Updating...</span></>
                                    : <><BiCheck /><span>Update Password</span></>
                                }
                            </button>
                        </div>
                    </form>
                )}
            </SectionCard>

            {/* ── Appearance ────────────────────────────────────────────────── */}
            <SectionCard
                icon={<BiPalette />}
                title="Interface Preferences"
                description="Customize your visual workspace and display preferences."
                badge={
                    <button
                        id="save-appearance-btn"
                        onClick={handleSaveAppearance}
                        className="flex items-center space-x-1.5 text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border bg-coffee-50 text-coffee-600 border-coffee-100 hover:bg-coffee-100 transition-all"
                    >
                        <BiSave /><span>Save</span>
                    </button>
                }
            >
                <SettingRow label="Theme Mode" description="Toggle between light and dark interface rendering.">
                    <div className="flex items-center space-x-1 bg-coffee-50 rounded-2xl p-1 border border-coffee-100">
                        {[
                            { key: 'light', icon: <BiSun />, label: 'Light' },
                            { key: 'dark',  icon: <BiMoon />, label: 'Dark' },
                        ].map(opt => (
                            <button
                                key={opt.key}
                                id={`theme-${opt.key}`}
                                onClick={() => setAppearance(p => ({ ...p, theme: opt.key }))}
                                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                    appearance.theme === opt.key
                                        ? opt.key === 'dark'
                                            ? 'bg-coffee-900 shadow-sm text-white'
                                            : 'bg-white shadow-sm text-coffee-900 border border-coffee-100'
                                        : 'text-coffee-400 hover:text-coffee-600'
                                }`}
                            >
                                {opt.icon}<span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </SettingRow>

                <SettingRow label="Compact Mode" description="Reduce spacing for a denser information display.">
                    <ToggleSwitch
                        id="toggle-compact-mode"
                        enabled={appearance.compactMode}
                        onChange={(val) => setAppearance(p => ({ ...p, compactMode: val }))}
                    />
                </SettingRow>

                <SettingRow label="Language" description="Set your preferred interface language.">
                    <div className="flex items-center space-x-2">
                        <BiGlobe className="text-coffee-400 text-lg" />
                        <select
                            id="language-select"
                            value={appearance.language}
                            onChange={e => setAppearance(p => ({ ...p, language: e.target.value }))}
                            className="bg-coffee-50 border border-coffee-100 rounded-xl px-3 py-2 text-[11px] font-black text-coffee-800 outline-none focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-500 transition-all cursor-pointer"
                        >
                            <option value="en">English (US)</option>
                            <option value="si">Sinhala</option>
                            <option value="fr">Français</option>
                            <option value="de">Deutsch</option>
                            <option value="ar">Arabic</option>
                        </select>
                    </div>
                </SettingRow>
            </SectionCard>
        </div>
    );
};

export default Settings;
