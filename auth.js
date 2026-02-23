// assets/js/auth.js

class AuthSystem {
    constructor() {
        this.supabase = supabase.createClient(
            'https://your-project.supabase.co',
            'your-anon-key'
        );
        this.init();
    }
    
    init() {
        this.checkSession();
        this.setupEventListeners();
        this.createModalHTML();
    }
    
    createModalHTML() {
        const modalHTML = `
            <div id="loginModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="auth.closeModal()">&times;</span>
                    
                    <div class="modal-header">
                        <i class="fa-solid fa-circle-user"></i>
                        <h2>مرحباً بك في ProfitClick</h2>
                    </div>
                    
                    <div class="tab-buttons">
                        <button class="tab-btn active" onclick="auth.switchTab('login')" id="loginTab">
                            <i class="fa-solid fa-right-to-bracket"></i> دخول
                        </button>
                        <button class="tab-btn" onclick="auth.switchTab('signup')" id="signupTab">
                            <i class="fa-solid fa-user-plus"></i> حساب جديد
                        </button>
                    </div>
                    
                    <!-- نموذج تسجيل الدخول -->
                    <div id="loginForm" class="form-container active">
                        <div class="input-group">
                            <i class="fa-solid fa-envelope"></i>
                            <input type="email" id="loginEmail" placeholder="البريد الإلكتروني" required>
                        </div>
                        
                        <div class="input-group">
                            <i class="fa-solid fa-lock"></i>
                            <input type="password" id="loginPassword" placeholder="كلمة المرور" required>
                            <i class="fa-solid fa-eye toggle-password" onclick="auth.togglePassword('loginPassword')"></i>
                        </div>
                        
                        <div class="remember-forgot">
                            <label class="checkbox-label">
                                <input type="checkbox" id="rememberMe">
                                <span>تذكرني</span>
                            </label>
                            <a href="#" onclick="auth.showForgotPassword()">نسيت كلمة المرور؟</a>
                        </div>
                        
                        <button class="btn-login-submit" onclick="auth.handleLogin()">
                            <span>تسجيل الدخول</span>
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        
                        <div class="social-login">
                            <p>أو الدخول عبر</p>
                            <div class="social-icons">
                                <button onclick="auth.socialLogin('google')" class="social-btn google">
                                    <i class="fa-brands fa-google"></i>
                                </button>
                                <button onclick="auth.socialLogin('facebook')" class="social-btn facebook">
                                    <i class="fa-brands fa-facebook-f"></i>
                                </button>
                                <button onclick="auth.socialLogin('twitter')" class="social-btn twitter">
                                    <i class="fa-brands fa-twitter"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- نموذج إنشاء حساب جديد -->
                    <div id="signupForm" class="form-container">
                        <div class="input-group">
                            <i class="fa-solid fa-user"></i>
                            <input type="text" id="signupName" placeholder="الاسم الكامل" required>
                        </div>
                        
                        <div class="input-group">
                            <i class="fa-solid fa-envelope"></i>
                            <input type="email" id="signupEmail" placeholder="البريد الإلكتروني" required>
                        </div>
                        
                        <div class="input-group">
                            <i class="fa-solid fa-lock"></i>
                            <input type="password" id="signupPassword" placeholder="كلمة المرور" required>
                            <span class="password-strength" id="passwordStrength"></span>
                        </div>
                        
                        <div class="input-group">
                            <i class="fa-solid fa-lock"></i>
                            <input type="password" id="signupConfirmPassword" placeholder="تأكيد كلمة المرور" required>
                        </div>
                        
                        <div class="input-group">
                            <i class="fa-solid fa-gift"></i>
                            <input type="text" id="referralCode" placeholder="كود الإحالة (اختياري)">
                        </div>
                        
                        <div class="terms">
                            <label class="checkbox-label">
                                <input type="checkbox" id="agreeTerms" checked>
                                <span>أوافق على <a href="#" onclick="auth.showTerms()">الشروط والأحكام</a></span>
                            </label>
                        </div>
                        
                        <button class="btn-signup-submit" onclick="auth.handleSignup()">
                            <span>إنشاء حساب جديد</span>
                            <i class="fa-solid fa-user-plus"></i>
                        </button>
                        
                        <div class="form-footer">
                            <p>لديك حساب بالفعل؟ <a href="#" onclick="auth.switchTab('login')">سجل دخولك</a></p>
                        </div>
                    </div>
                    
                    <!-- نموذج استعادة كلمة المرور -->
                    <div id="forgotForm" class="form-container">
                        <p class="info-text">أدخل بريدك الإلكتروني لإرسال رابط استعادة كلمة المرور</p>
                        
                        <div class="input-group">
                            <i class="fa-solid fa-envelope"></i>
                            <input type="email" id="resetEmail" placeholder="البريد الإلكتروني" required>
                        </div>
                        
                        <button class="btn-reset-submit" onclick="auth.handlePasswordReset()">
                            <span>إرسال رابط الاستعادة</span>
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                        
                        <div class="form-footer">
                            <p><a href="#" onclick="auth.switchTab('login')">العودة لتسجيل الدخول</a></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
            .modal {
                display: none;
                position: fixed;
                z-index: 2000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(5px);
                animation: fadeIn 0.3s;
                overflow-y: auto;
            }
            
            .modal-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 5% auto;
                padding: 30px;
                width: 90%;
                max-width: 450px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                position: relative;
                animation: slideUp 0.4s;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .close {
                position: absolute;
                left: 20px;
                top: 20px;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
                color: #fff;
                opacity: 0.7;
                transition: opacity 0.3s;
            }
            
            .close:hover {
                opacity: 1;
            }
            
            .modal-header {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .modal-header i {
                font-size: 60px;
                color: #ffd700;
                margin-bottom: 10px;
            }
            
            .modal-header h2 {
                color: #fff;
                font-size: 24px;
            }
            
            .tab-buttons {
                display: flex;
                gap: 10px;
                margin-bottom: 30px;
                background: rgba(255,255,255,0.1);
                padding: 5px;
                border-radius: 50px;
            }
            
            .tab-btn {
                flex: 1;
                padding: 12px;
                border: none;
                background: transparent;
                color: #fff;
                font-weight: 600;
                border-radius: 50px;
                cursor: pointer;
                transition: all 0.3s;
                font-family: 'Cairo', sans-serif;
                font-size: 16px;
            }
            
            .tab-btn.active {
                background: #ffd700;
                color: #764ba2;
            }
            
            .form-container {
                display: none;
            }
            
            .form-container.active {
                display: block;
                animation: slideIn 0.3s;
            }
            
            @keyframes slideIn {
                from { transform: translateX(20px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .input-group {
                position: relative;
                margin-bottom: 20px;
            }
            
            .input-group i:first-child {
                position: absolute;
                right: 15px;
                top: 50%;
                transform: translateY(-50%);
                color: #ffd700;
                font-size: 18px;
            }
            
            .input-group input {
                width: 100%;
                padding: 15px 45px 15px 45px;
                border: 2px solid rgba(255,255,255,0.2);
                background: rgba(255,255,255,0.1);
                border-radius: 50px;
                font-size: 16px;
                color: #fff;
                transition: all 0.3s;
                font-family: 'Cairo', sans-serif;
            }
            
            .input-group input:focus {
                outline: none;
                border-color: #ffd700;
                background: rgba(255,255,255,0.15);
            }
            
            .input-group input::placeholder {
                color: rgba(255,255,255,0.6);
            }
            
            .toggle-password {
                position: absolute;
                left: 15px;
                top: 50%;
                transform: translateY(-50%);
                cursor: pointer;
                color: #ffd700;
                font-size: 18px;
            }
            
            .password-strength {
                position: absolute;
                left: 15px;
                bottom: -20px;
                font-size: 12px;
            }
            
            .remember-forgot {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 15px 0;
                color: #fff;
            }
            
            .remember-forgot a {
                color: #ffd700;
                text-decoration: none;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }
            
            .checkbox-label input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .btn-login-submit, .btn-signup-submit, .btn-reset-submit {
                width: 100%;
                padding: 15px;
                border: none;
                border-radius: 50px;
                font-size: 18px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                font-family: 'Cairo', sans-serif;
                margin: 20px 0;
            }
            
            .btn-login-submit {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #764ba2;
            }
            
            .btn-signup-submit {
                background: linear-gradient(135deg, #4CAF50, #81c784);
                color: white;
            }
            
            .btn-reset-submit {
                background: linear-gradient(135deg, #2196F3, #64b5f6);
                color: white;
            }
            
            .btn-login-submit:hover, .btn-signup-submit:hover, .btn-reset-submit:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            }
            
            .terms {
                margin: 15px 0;
                color: #fff;
            }
            
            .terms a {
                color: #ffd700;
                text-decoration: none;
            }
            
            .social-login {
                text-align: center;
                margin-top: 25px;
            }
            
            .social-login p {
                color: #fff;
                margin-bottom: 15px;
                position: relative;
            }
            
            .social-login p::before,
            .social-login p::after {
                content: "";
                position: absolute;
                top: 50%;
                width: 30%;
                height: 1px;
                background: rgba(255,255,255,0.3);
            }
            
            .social-login p::before {
                right: 0;
            }
            
            .social-login p::after {
                left: 0;
            }
            
            .social-icons {
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            
            .social-btn {
                width: 50px;
                height: 50px;
                border: none;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.3s;
                color: #fff;
            }
            
            .social-btn:hover {
                transform: translateY(-3px);
            }
            
            .google { background: #DB4437; }
            .facebook { background: #4267B2; }
            .twitter { background: #1DA1F2; }
            
            .form-footer {
                text-align: center;
                color: #fff;
                margin-top: 20px;
            }
            
            .form-footer a {
                color: #ffd700;
                text-decoration: none;
                font-weight: 600;
            }
            
            .info-text {
                color: #fff;
                text-align: center;
                margin-bottom: 20px;
            }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    setupEventListeners() {
        // التحقق من قوة كلمة المرور
        document.getElementById('signupPassword')?.addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });
    }
    
    checkPasswordStrength(password) {
        const strengthEl = document.getElementById('passwordStrength');
        if (!strengthEl) return;
        
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]+/)) strength++;
        if (password.match(/[A-Z]+/)) strength++;
        if (password.match(/[0-9]+/)) strength++;
        if (password.match(/[$@#&!]+/)) strength++;
        
        const strengths = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
        const colors = ['#ff4444', '#ff7744', '#ffaa44', '#44ff44', '#00ff00'];
        
        strengthEl.textContent = strengths[strength];
        strengthEl.style.color = colors[strength];
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        if (!email || !password) {
            this.showNotification('error', 'الرجاء إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password,
                options: {
                    shouldRemember: rememberMe
                }
            });
            
            if (error) throw error;
            
            // جلب بيانات المستخدم من قاعدة البيانات
            const { data: userData, error: userError } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();
            
            if (userError) throw userError;
            
            // تخزين بيانات المستخدم
            localStorage.setItem('profitclick_user', JSON.stringify(userData));
            
            this.showNotification('success', 'تم تسجيل الدخول بنجاح');
            this.closeModal();
            
            // تحديث واجهة المستخدم
            window.location.reload();
            
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }
    
    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const referralCode = document.getElementById('referralCode').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        
        // التحقق من المدخلات
        if (!name || !email || !password || !confirmPassword) {
            this.showNotification('error', 'الرجاء ملء جميع الحقول');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showNotification('error', 'كلمات المرور غير متطابقة');
            return;
        }
        
        if (password.length < 6) {
            this.showNotification('error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }
        
        if (!agreeTerms) {
            this.showNotification('error', 'يجب الموافقة على الشروط والأحكام');
            return;
        }
        
        try {
            // إنشاء الحساب في Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });
            
            if (authError) throw authError;
            
            // البحث عن كود الإحالة إذا وجد
            let referredBy = null;
            if (referralCode) {
                const { data: referrer } = await this.supabase
                    .from('users')
                    .select('id')
                    .eq('referral_code', referralCode)
                    .single();
                
                if (referrer) {
                    referredBy = referrer.id;
                }
            }
            
            // إنشاء كود إحالة للمستخدم الجديد
            const newReferralCode = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // إضافة المستخدم إلى جدول users
            const { error: userError } = await this.supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    username: name,
                    email: email,
                    balance: 0,
                    total_earned: 0,
                    total_withdrawn: 0,
                    referral_code: newReferralCode,
                    referred_by: referredBy,
                    created_at: new Date(),
                    is_active: true
                }]);
            
            if (userError) throw userError;
            
            // إذا كان هناك من دعاه، أضف مكافأة الإحالة
            if (referredBy) {
                await this.supabase.rpc('add_referral_bonus', {
                    referrer_id: referredBy,
                    bonus_amount: 0.1 // 0.1$ مكافأة للإحالة
                });
            }
            
            this.showNotification('success', 'تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن');
            this.switchTab('login');
            
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }
    
    async handlePasswordReset() {
        const email = document.getElementById('resetEmail').value;
        
        if (!email) {
            this.showNotification('error', 'الرجاء إدخال البريد الإلكتروني');
            return;
        }
        
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://yoursite.com/reset-password'
            });
            
            if (error) throw error;
            
            this.showNotification('success', 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني');
            
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }
    
    async socialLogin(provider) {
        try {
            const { error } = await this.supabase.auth.signInWithOAuth({
                provider: provider
            });
            
            if (error) throw error;
            
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }
    
    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            localStorage.removeItem('profitclick_user');
            this.showNotification('success', 'تم تسجيل الخروج بنجاح');
            window.location.reload();
            
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }
    
    async checkSession() {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            // تحديث آخر نشاط
            await this.supabase
                .from('users')
                .update({ last_active: new Date() })
                .eq('id', session.user.id);
        }
    }
    
    switchTab(tab) {
        // تحديث الأزرار
        document.getElementById('loginTab').classList.toggle('active', tab === 'login');
        document.getElementById('signupTab').classList.toggle('active', tab === 'signup');
        
        // تحديث النماذج
        document.getElementById('loginForm').classList.toggle('active', tab === 'login');
        document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
        document.getElementById('forgotForm')?.classList.remove('active');
    }
    
    showForgotPassword() {
        document.querySelectorAll('.form-container').forEach(f => f.classList.remove('active'));
        document.getElementById('forgotForm').classList.add('active');
    }
    
    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
    }
    
    openModal() {
        document.getElementById('loginModal').style.display = 'block';
        this.switchTab('login');
    }
    
    closeModal() {
        document.getElementById('loginModal').style.display = 'none';
    }
    
    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    showTerms() {
        window.open('/terms.html', '_blank');
    }
}

// تهيئة نظام المصادقة
const auth = new AuthSystem();

// دوال عامة للاستخدام من HTML
function openLoginModal() {
    auth.openModal();
}

function openSignupModal() {
    auth.openModal();
    auth.switchTab('signup');
}

function logout() {
    auth.logout();
}
