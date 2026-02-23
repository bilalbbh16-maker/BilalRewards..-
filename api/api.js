// assets/js/api.js

// ضع بيانات Supabase هنا
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// تهيئة اتصال Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// دوال المستخدمين
// ==========================================

// تسجيل مستخدم جديد
async function registerUser(email, password, username, referralCode = null) {
    try {
        // 1. إنشاء حساب في Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        });
        
        if (authError) throw authError;
        
        // 2. إنشاء كود إحالة فريد
        const newReferralCode = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // 3. إضافة المستخدم لجدول users
        const { error: userError } = await supabase
            .from('users')
            .insert([{
                id: authData.user.id,
                username: username,
                email: email,
                referral_code: newReferralCode,
                referred_by: referralCode ? await getUserIdByReferral(referralCode) : null,
                created_at: new Date()
            }]);
        
        if (userError) throw userError;
        
        return { success: true, user: authData.user };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// تسجيل الدخول
async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // جلب بيانات المستخدم من جدول users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
        
        if (userError) throw userError;
        
        // تخزين بيانات المستخدم في localStorage
        localStorage.setItem('profitclick_user', JSON.stringify(userData));
        
        return { success: true, user: userData };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// تسجيل الخروج
async function logoutUser() {
    await supabase.auth.signOut();
    localStorage.removeItem('profitclick_user');
    window.location.href = '/';
}

// جلب بيانات المستخدم الحالي
function getCurrentUser() {
    const user = localStorage.getItem('profitclick_user');
    return user ? JSON.parse(user) : null;
}

// ==========================================
// دوال الإعدادات (الأسعار)
// ==========================================

// جلب الإعدادات من قاعدة البيانات
async function getSettings() {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error) throw error;
        
        return { success: true, settings: data };
        
    } catch (error) {
        console.error('Error fetching settings:', error);
        return { success: false, error: error.message };
    }
}

// تحديث الإعدادات (للمشرف فقط)
async function updateSettings(settingsData) {
    try {
        const { error } = await supabase
            .from('settings')
            .update({
                ...settingsData,
                updated_at: new Date()
            })
            .eq('id', 1);
        
        if (error) throw error;
        
        return { success: true };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// دوال الأرباح
// ==========================================

// إضافة ربح للمستخدم
async function addEarning(userId, amount, source, referenceId = null) {
    try {
        // الحصول على IP ومعلومات الجهاز
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();
        
        const { error } = await supabase
            .from('earnings')
            .insert([{
                user_id: userId,
                amount: amount,
                source: source,
                reference_id: referenceId,
                ip_address: ip,
                user_agent: navigator.userAgent
            }]);
        
        if (error) throw error;
        
        // تحديث رصيد المستخدم في localStorage
        const user = getCurrentUser();
        if (user && user.id === userId) {
            user.balance = (parseFloat(user.balance) + parseFloat(amount)).toFixed(4);
            user.total_earned = (parseFloat(user.total_earned) + parseFloat(amount)).toFixed(4);
            localStorage.setItem('profitclick_user', JSON.stringify(user));
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Error adding earning:', error);
        return { success: false, error: error.message };
    }
}

// جلب أرباح المستخدم
async function getUserEarnings(userId, limit = 50) {
    try {
        const { data, error } = await supabase
            .from('earnings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        return { success: true, earnings: data };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// دوال السحب
// ==========================================

// طلب سحب
async function requestWithdrawal(userId, amount, method, walletAddress) {
    try {
        const user = getCurrentUser();
        
        // التحقق من الرصيد
        if (parseFloat(user.balance) < amount) {
            throw new Error('الرصيد غير كافٍ');
        }
        
        // التحقق من الحد الأدنى للسحب حسب الطريقة
        const { settings } = await getSettings();
        
        if (method === 'faucetpay' && amount < settings.min_withdraw_faucetpay) {
            throw new Error(`الحد الأدنى للسحب ${settings.min_withdraw_faucetpay}$`);
        }
        
        if (method === 'visa' && amount < settings.min_withdraw_visa) {
            throw new Error(`الحد الأدنى للاستبدال ${settings.min_withdraw_visa}$`);
        }
        
        // إنشاء طلب السحب
        const { data, error } = await supabase
            .from('withdrawals')
            .insert([{
                user_id: userId,
                amount: amount,
                method: method,
                wallet_address: walletAddress,
                status: 'pending',
                created_at: new Date()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // تحديث الرصيد في localStorage
        user.balance = (parseFloat(user.balance) - parseFloat(amount)).toFixed(4);
        user.total_withdrawn = (parseFloat(user.total_withdrawn) + parseFloat(amount)).toFixed(4);
        localStorage.setItem('profitclick_user', JSON.stringify(user));
        
        return { success: true, withdrawal: data };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// جلب سحوبات المستخدم
async function getUserWithdrawals(userId) {
    try {
        const { data, error } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return { success: true, withdrawals: data };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// دوال لعبة الدودة
// ==========================================

// حفظ جلسة لعبة
async function saveGameSession(userId, clicks, earnings, adsShown) {
    try {
        const { error } = await supabase
            .from('game_sessions')
            .insert([{
                user_id: userId,
                clicks: clicks,
                earnings: earnings,
                ads_shown: adsShown,
                ended_at: new Date()
            }]);
        
        if (error) throw error;
        
        return { success: true };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// دوال الروابط الذكية
// ==========================================

// تسجيل نقرة على رابط ذكي
async function recordSmartLinkClick(userId, linkUrl, earnings) {
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();
        
        const { error } = await supabase
            .from('smart_link_clicks')
            .insert([{
                user_id: userId,
                link_url: linkUrl,
                earnings: earnings,
                ip_address: ip,
                completed: true
            }]);
        
        if (error) throw error;
        
        return { success: true };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// دوال الإحالة
// ==========================================

// جلب ID المستخدم من كود الإحالة
async function getUserIdByReferral(referralCode) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', referralCode)
            .single();
        
        if (error) return null;
        
        return data.id;
        
    } catch (error) {
        return null;
    }
}

// جلب المدعوين
async function getReferrals(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username, created_at, total_earned')
            .eq('referred_by', userId);
        
        if (error) throw error;
        
        return { success: true, referrals: data };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// دوال إعلانات المعلنين
// ==========================================

// جلب الإعلانات النشطة
async function getActiveCampaigns() {
    try {
        const { data, error } = await supabase
            .from('advertiser_campaigns')
            .select('*')
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString());
        
        if (error) throw error;
        
        return { success: true, campaigns: data };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// إكمال مهمة إعلانية
async function completeTask(campaignId, userId, screenshotUrl) {
    try {
        // التحقق من عدم تكرار المستخدم
        const { data: existing } = await supabase
            .from('task_completions')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('user_id', userId)
            .single();
        
        if (existing) {
            throw new Error('لقد أكملت هذه المهمة مسبقاً');
        }
        
        // جلب معلومات الحملة
        const { data: campaign } = await supabase
            .from('advertiser_campaigns')
            .select('price_per_action')
            .eq('id', campaignId)
            .single();
        
        const { error } = await supabase
            .from('task_completions')
            .insert([{
                campaign_id: campaignId,
                user_id: userId,
                screenshot_url: screenshotUrl,
                reward: campaign.price_per_action,
                status: 'pending'
            }]);
        
        if (error) throw error;
        
        return { success: true };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// دوال عامة
// ==========================================

// تحديث آخر نشاط للمستخدم
async function updateLastActive(userId) {
    try {
        await supabase
            .from('users')
            .update({ last_active: new Date() })
            .eq('id', userId);
    } catch (error) {
        console.error('Error updating last active:', error);
    }
}

// جلب إحصائيات سريعة للصفحة الرئيسية
async function getSiteStats() {
    try {
        const { data: usersCount } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true });
        
        const { data: earningsSum } = await supabase
            .from('earnings')
            .select('amount');
        
        const totalPaid = earningsSum?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
        
        const { data: settings } = await supabase
            .from('settings')
            .select('min_withdraw_faucetpay')
            .eq('id', 1)
            .single();
        
        return {
            success: true,
            stats: {
                totalUsers: usersCount?.count || 0,
                totalPaid: totalPaid.toFixed(2),
                minWithdraw: settings?.min_withdraw_faucetpay || 0.5
            }
        };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}
