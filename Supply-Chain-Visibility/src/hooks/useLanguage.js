import { useState, useEffect } from 'react';

const TRANSLATIONS = {
    en: {
        dashboard: "Dashboard",
        orders: "Order Management",
        shipments: "Shipment Manifests",
        management: "Delivery Mgmt",
        tracker: "Live Tracker",
        dispatch: "Dispatch Planning",
        users: "User Management",
        vehicles: "Vehicle Mgmt",
        audit: "Audit Logs",
        inbound: "Inbound Proc.",
        search: "Advanced Search",
        reports: "Reports",
        profile: "My Profile",
        settings: "Settings",
        logout: "Sign Out",
        systemOverview: "System Overview",
        managerConsole: "Manager Console",
        dispatchDashboard: "Dispatch Dashboard",
        driverPortal: "Driver Portal",
        welcome: "Welcome",
    },
    fr: {
        dashboard: "Tableau de bord",
        orders: "Gestion des commandes",
        shipments: "Manifestes d'expédition",
        management: "Gestion des livraisons",
        tracker: "Suivi en direct",
        dispatch: "Planification des expéditions",
        users: "Gestion des utilisateurs",
        vehicles: "Gestion des véhicules",
        audit: "Journaux d'audit",
        inbound: "Approvisionnement entrant",
        search: "Recherche avancée",
        reports: "Rapports",
        profile: "Mon profil",
        settings: "Paramètres",
        logout: "Se déconnecter",
        systemOverview: "Aperçu du système",
        managerConsole: "Console du gestionnaire",
        dispatchDashboard: "Tableau de bord d'expédition",
        driverPortal: "Portail du conducteur",
        welcome: "Bienvenue",
    },
    de: {
        dashboard: "Armaturenbrett",
        orders: "Auftragsverwaltung",
        shipments: "Versandmanifeste",
        management: "Liefermanagement",
        tracker: "Live-Tracker",
        dispatch: "Versandplanung",
        users: "Benutzerverwaltung",
        vehicles: "Fahrzeugverwaltung",
        audit: "Prüfprotokolle",
        inbound: "Eingehende Beschaffung",
        search: "Erweiterte Suche",
        reports: "Berichte",
        profile: "Mein Profil",
        settings: "Einstellungen",
        logout: "Abmelden",
        systemOverview: "Systemübersicht",
        managerConsole: "Manager-Konsole",
        dispatchDashboard: "Versand-Dashboard",
        driverPortal: "Fahrerportal",
        welcome: "Willkommen",
    },
    si: {
        dashboard: "උපකරණ පුවරුව",
        orders: "ඇණවුම් කළමනාකරණය",
        shipments: "නැව්ගත කිරීම්",
        management: "බෙදාහැරීමේ කළමනාකරණය",
        tracker: "සජීවී ට්රැකර්",
        dispatch: "පිටත් කිරීම සැලසුම් කිරීම",
        users: "පරිශීලක කළමනාකරණය",
        vehicles: "වාහන කළමනාකරණය",
        audit: "විගණන වාර්තා",
        inbound: "ගබඩා එකතු කිරීම්",
        search: "උසස් සෙවීම",
        reports: "වාර්තා",
        profile: "මගේ පැතිකඩ",
        settings: "සැකසුම්",
        logout: "ඉවත් වන්න",
        systemOverview: "පද්ධති දළ විශ්ලේෂණය",
        managerConsole: "කළමනාකරු කොන්සෝලය",
        dispatchDashboard: "පිටත් කිරීමේ උපකරණ පුවරුව",
        driverPortal: "රියදුරු ද්වාරය",
        welcome: "සාදරයෙන් පිළිගනිමු",
    },
    ar: {
        dashboard: "لوحة القيادة",
        orders: "إدارة الطلبات",
        shipments: "بيانات الشحن",
        management: "إدارة التوصيل",
        tracker: "متتبع مباشر",
        dispatch: "تخطيط الإرسال",
        users: "إدارة المستخدمين",
        vehicles: "إدارة المركبات",
        audit: "سجلات التدقيق",
        inbound: "المشتريات الواردة",
        search: "بحث متقدم",
        reports: "التقارير",
        profile: "ملفي الشخصي",
        settings: "الإعدادات",
        logout: "تسجيل خروج",
        systemOverview: "نظرة عامة على النظام",
        managerConsole: "وحدة تحكم المدير",
        dispatchDashboard: "لوحة القيادة الإرسال",
        driverPortal: "بوابة السائق",
        welcome: "مرحباً",
    }
};

export const useLanguage = () => {
    const [lang, setLang] = useState('en');

    useEffect(() => {
        const updateLang = () => {
            try {
                const raw = localStorage.getItem('logistics_settings');
                if (raw) {
                    const settings = JSON.parse(raw);
                    if (settings.appearance?.language) {
                        setLang(settings.appearance.language);
                    }
                }
            } catch (e) {
                // ignore
            }
        };
        
        updateLang();
        window.addEventListener('settings_updated', updateLang);
        return () => window.removeEventListener('settings_updated', updateLang);
    }, []);

    const t = (key) => {
        const dictionary = TRANSLATIONS[lang] || TRANSLATIONS.en;
        return dictionary[key] || TRANSLATIONS.en[key] || key;
    };

    return { lang, t };
};
