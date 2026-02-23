// assets/js/game.js

class WormGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // إعدادات اللعبة (تتحمل من الإعدادات)
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // حالة اللعبة
        this.snake = [{x: 10, y: 10}];
        this.direction = {x: 0, y: 0};
        this.food = {};
        this.score = 0;
        this.earnings = 0;
        this.clickCount = 0;
        this.adCounter = 10; // يتحمل من الإعدادات
        this.gameRunning = false;
        this.gameInterval = null;
        
        // الأسعار (تتحمل من قاعدة البيانات)
        this.clickValue = 0.00006; // القيمة الافتراضية
        this.adInterval = 10; // كل 10 نقرات
        
        this.loadSettings();
        this.init();
    }
    
    async loadSettings() {
        try {
            const response = await fetch('/api/get-settings.php');
            const settings = await response.json();
            
            this.clickValue = parseFloat(settings.game_click_rate);
            this.adInterval = parseInt(settings.game_ad_interval);
            this.adCounter = this.adInterval;
            
            document.getElementById('clickValue').textContent = this.clickValue;
            document.getElementById('adInterval').textContent = this.adInterval;
            
            // تخزين أكواد الإعلانات
            this.interstitialAdCode = settings.bitmedia_interstitial_code;
            this.rewardedAdCode = settings.bitmedia_rewarded_code;
            
        } catch (error) {
            console.error('Error loading game settings:', error);
        }
    }
    
    init() {
        this.placeFood();
        this.draw();
        this.setupControls();
        this.updateDisplay();
    }
    
    placeFood() {
        this.food = {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount)
        };
        
        // تأكد أن الطعام ليس مكان الثعبان
        for (let segment of this.snake) {
            if (segment.x === this.food.x && segment.y === this.food.y) {
                this.placeFood();
                break;
            }
        }
    }
    
    draw() {
        // تنظيف الكانفاس
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // رسم الثعبان
        this.ctx.fillStyle = '#4CAF50';
        this.snake.forEach(segment => {
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 2,
                this.gridSize - 2
            );
        });
        
        // رسم الرأس بلون مختلف
        if (this.snake.length > 0) {
            this.ctx.fillStyle = '#8BC34A';
            this.ctx.fillRect(
                this.snake[0].x * this.gridSize,
                this.snake[0].y * this.gridSize,
                this.gridSize - 2,
                this.gridSize - 2
            );
        }
        
        // رسم الطعام
        this.ctx.fillStyle = '#FF5252';
        this.ctx.beginPath();
        this.ctx.arc(
            this.food.x * this.gridSize + this.gridSize/2,
            this.food.y * this.gridSize + this.gridSize/2,
            this.gridSize/2 - 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }
    
    update() {
        if (!this.gameRunning) return;
        
        // حركة الثعبان
        const head = {
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y
        };
        
        // التحقق من الجدران (تخرج من جهة وتدخل من الأخرى)
        if (head.x < 0) head.x = this.tileCount - 1;
        if (head.x >= this.tileCount) head.x = 0;
        if (head.y < 0) head.y = this.tileCount - 1;
        if (head.y >= this.tileCount) head.y = 0;
        
        // التحقق من أكل الطعام
        if (head.x === this.food.x && head.y === this.food.y) {
            // زيادة النقاط والأرباح
            this.score++;
            this.clickCount++;
            this.earnings += this.clickValue;
            this.adCounter--;
            
            // تحديث العرض
            this.updateDisplay();
            
            // إضافة الرصيد عبر API
            this.addEarnings(this.clickValue, 'game_click');
            
            // إنشاء طعام جديد
            this.placeFood();
            
            // التحقق من ظهور إعلان
            if (this.clickCount % this.adInterval === 0) {
                this.showForcedAd();
            }
        } else {
            // إزالة الذيل
            this.snake.pop();
        }
        
        // إضافة الرأس الجديد
        this.snake.unshift(head);
        
        // التحقق من اصطدام الثعبان بنفسه
        for (let i = 1; i < this.snake.length; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                this.gameOver();
                break;
            }
        }
        
        this.draw();
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('earnings').textContent = this.earnings.toFixed(5);
        document.getElementById('adCounter').textContent = this.adCounter;
    }
    
    async addEarnings(amount, source) {
        const user = JSON.parse(localStorage.getItem('profitclick_user'));
        if (!user) return;
        
        try {
            await fetch('/api/add-earnings.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: user.id,
                    amount: amount,
                    source: source
                })
            });
        } catch (error) {
            console.error('Error adding earnings:', error);
        }
    }
    
    showForcedAd() {
        this.gameRunning = false;
        clearInterval(this.gameInterval);
        
        const adContainer = document.getElementById('adContainer');
        adContainer.innerHTML = `
            <div class="forced-ad-overlay">
                <div class="forced-ad-content">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <h3>إعلان إجباري</h3>
                    <p>يجب مشاهدة هذا الإعلان لمواصلة اللعب</p>
                    <div id="bitmedia-ad"></div>
                    <button class="btn-continue" onclick="game.resumeAfterAd()" style="display:none;" id="continueBtn">
                        <i class="fa-solid fa-play"></i>
                        متابعة اللعب
                    </button>
                </div>
            </div>
        `;
        
        // وضع كود إعلان Bitmedia
        if (this.interstitialAdCode) {
            document.getElementById('bitmedia-ad').innerHTML = this.interstitialAdCode;
            
            // محاكاة انتهاء الإعلان (في الواقع Bitmedia ترسل إشارة عند الانتهاء)
            setTimeout(() => {
                document.getElementById('continueBtn').style.display = 'block';
            }, 5000); // 5 ثوانٍ افتراضية
        }
        
        this.adCounter = this.adInterval;
        this.updateDisplay();
    }
    
    resumeAfterAd() {
        document.getElementById('adContainer').innerHTML = '';
        this.gameRunning = true;
        this.start();
    }
    
    gameOver() {
        this.gameRunning = false;
        clearInterval(this.gameInterval);
        
        // حفظ الجلسة
        this.saveGameSession();
        
        // عرض رسالة game over
        alert(`اللعبة انتهت! النقاط: ${this.score} - الأرباح: $${this.earnings.toFixed(5)}`);
        
        // إعادة تعيين اللعبة
        this.reset();
    }
    
    reset() {
        this.snake = [{x: 10, y: 10}];
        this.direction = {x: 0, y: 0};
        this.score = 0;
        this.earnings = 0;
        this.clickCount = 0;
        this.adCounter = this.adInterval;
        this.gameRunning = false;
        
        this.placeFood();
        this.draw();
        this.updateDisplay();
    }
    
    async saveGameSession() {
        const user = JSON.parse(localStorage.getItem('profitclick_user'));
        if (!user || this.score === 0) return;
        
        try {
            await fetch('/api/save-game-session.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: user.id,
                    clicks: this.score,
                    earnings: this.earnings,
                    adsShown: Math.floor(this.score / this.adInterval)
                })
            });
        } catch (error) {
            console.error('Error saving game session:', error);
        }
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning) return;
            
            switch(e.key) {
                case 'ArrowUp':
                    if (this.direction.y === 0) {
                        this.direction = {x: 0, y: -1};
                    }
                    break;
                case 'ArrowDown':
                    if (this.direction.y === 0) {
                        this.direction = {x: 0, y: 1};
                    }
                    break;
                case 'ArrowLeft':
                    if (this.direction.x === 0) {
                        this.direction = {x: -1, y: 0};
                    }
                    break;
                case 'ArrowRight':
                    if (this.direction.x === 0) {
                        this.direction = {x: 1, y: 0};
                    }
                    break;
            }
        });
        
        // للتحكم باللمس في الموبايل
        const upBtn = document.getElementById('upBtn');
        const downBtn = document.getElementById('downBtn');
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        
        if (upBtn) {
            upBtn.addEventListener('click', () => {
                if (this.gameRunning && this.direction.y === 0) {
                    this.direction = {x: 0, y: -1};
                }
            });
        }
        
        if (downBtn) {
            downBtn.addEventListener('click', () => {
                if (this.gameRunning && this.direction.y === 0) {
                    this.direction = {x: 0, y: 1};
                }
            });
        }
        
        if (leftBtn) {
            leftBtn.addEventListener('click', () => {
                if (this.gameRunning && this.direction.x === 0) {
                    this.direction = {x: -1, y: 0};
                }
            });
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('click', () => {
                if (this.gameRunning && this.direction.x === 0) {
                    this.direction = {x: 1, y: 0};
                }
            });
        }
    }
    
    start() {
        if (!this.gameRunning) {
            this.gameRunning = true;
            this.gameInterval = setInterval(() => this.update(), 100);
        }
    }
    
    pause() {
        this.gameRunning = false;
        clearInterval(this.gameInterval);
    }
}

// تهيئة اللعبة
const game = new WormGame();

// دوال عامة للتحكم
function startGame() {
    game.start();
}

function pauseGame() {
    game.pause();
}

function resetGame() {
    game.reset();
}
