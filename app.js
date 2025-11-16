// アプリケーション状態管理
class DramaNotifierApp {
    constructor() {
        this.dramas = [];
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.reminderInterval = null;
        this.init();
    }

    init() {
        this.loadDramas();
        this.setupEventListeners();
        this.renderDramaList();
        this.renderCalendar();
        this.renderUpcoming();
        this.updateNotificationStatus();
        this.startReminderChecker();
    }

    // イベントリスナーの設定
    setupEventListeners() {
        const form = document.getElementById('addDramaForm');
        form.addEventListener('submit', (e) => this.handleAddDrama(e));

        const notificationBtn = document.getElementById('enableNotificationBtn');
        notificationBtn.addEventListener('click', () => this.requestNotificationPermission());

        // カレンダー制御
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.renderCalendar();
        });
    }

    // ドラマ登録処理
    handleAddDrama(e) {
        e.preventDefault();

        const title = document.getElementById('dramaTitle').value.trim();
        const year = document.getElementById('dramaYear').value.trim();
        const rerunDate = document.getElementById('rerunDate').value;
        const notes = document.getElementById('dramaNotes').value.trim();

        if (!title) {
            alert('ドラマタイトルを入力してください');
            return;
        }

        const newDrama = {
            id: Date.now(),
            title: title,
            year: year,
            rerunDate: rerunDate || null,
            notes: notes,
            createdAt: new Date().toISOString(),
            notified: false
        };

        this.dramas.push(newDrama);
        this.saveDramas();
        this.renderDramaList();
        this.renderCalendar();
        this.renderUpcoming();

        // フォームをリセット
        e.target.reset();
        document.getElementById('dramaTitle').focus();

        // 登録完了メッセージ
        this.showNotification('登録完了', `「${title}」を登録しました！`);
    }

    // ドラマ削除処理
    deleteDrama(id) {
        const drama = this.dramas.find(d => d.id === id);
        if (!drama) return;

        if (confirm(`「${drama.title}」を削除しますか？`)) {
            this.dramas = this.dramas.filter(d => d.id !== id);
            this.saveDramas();
            this.renderDramaList();
            this.renderCalendar();
            this.renderUpcoming();
            this.showNotification('削除完了', `「${drama.title}」を削除しました`);
        }
    }

    // カレンダー描画
    renderCalendar() {
        const calendarEl = document.getElementById('calendar');
        const monthEl = document.getElementById('currentMonth');

        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        monthEl.textContent = `${this.currentYear}年 ${monthNames[this.currentMonth]}`;

        // 月の最初と最後の日
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        // 前月の日数
        const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0);
        const prevMonthDays = prevMonthLastDay.getDate();

        // カレンダーHTML生成
        let html = '<div class="calendar-header">';
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        dayNames.forEach(day => {
            html += `<div class="calendar-day-name">${day}</div>`;
        });
        html += '</div><div class="calendar-grid">';

        // 前月の日付
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthDays - i;
            html += `<div class="calendar-day other-month"><span class="calendar-day-number">${day}</span></div>`;
        }

        // 今月の日付
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(this.currentYear, this.currentMonth, day);
            const dateStr = this.formatDateOnly(currentDate);
            const events = this.getDramasByDate(dateStr);

            let classes = 'calendar-day';
            if (this.isSameDay(currentDate, today)) {
                classes += ' today';
            }
            if (events.length > 0) {
                classes += ' has-event';
            }

            html += `<div class="${classes}">`;
            html += `<span class="calendar-day-number">${day}</span>`;
            if (events.length > 0) {
                html += `<div class="calendar-day-events">${events.length}件</div>`;
            }
            html += '</div>';
        }

        // 次月の日付
        const remainingDays = 42 - (startDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingDays; day++) {
            html += `<div class="calendar-day other-month"><span class="calendar-day-number">${day}</span></div>`;
        }

        html += '</div>';
        calendarEl.innerHTML = html;
    }

    // 直近の予定を描画
    renderUpcoming() {
        const upcomingEl = document.getElementById('upcomingDramas');
        const dramasWithDates = this.dramas.filter(d => d.rerunDate);

        if (dramasWithDates.length === 0) {
            upcomingEl.innerHTML = '<p class="empty-message">再放送予定が登録されていません</p>';
            return;
        }

        // 日付でソート（近い順）
        const sorted = [...dramasWithDates].sort((a, b) =>
            new Date(a.rerunDate) - new Date(b.rerunDate)
        );

        // 今日から30日以内のもののみ表示
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const upcoming = sorted.filter(d => {
            const rerunDate = new Date(d.rerunDate);
            return rerunDate >= now && rerunDate <= thirtyDaysLater;
        });

        if (upcoming.length === 0) {
            upcomingEl.innerHTML = '<p class="empty-message">今後30日以内の予定はありません</p>';
            return;
        }

        upcomingEl.innerHTML = upcoming.map(drama => {
            const rerunDate = new Date(drama.rerunDate);
            const daysUntil = Math.ceil((rerunDate - now) / (1000 * 60 * 60 * 24));
            const isSoon = daysUntil <= 3;

            return `
                <div class="upcoming-item ${isSoon ? 'soon' : ''}">
                    <div class="upcoming-date">
                        ${this.formatDateTime(drama.rerunDate)}
                        ${daysUntil === 0 ? '(今日!)' : daysUntil === 1 ? '(明日)' : `(${daysUntil}日後)`}
                    </div>
                    <div class="upcoming-title">${this.escapeHtml(drama.title)}</div>
                    ${drama.notes ? `<div class="upcoming-time">📝 ${this.escapeHtml(drama.notes)}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    // ドラマリストの描画
    renderDramaList() {
        const listContainer = document.getElementById('dramaList');
        const countElement = document.getElementById('dramaCount');

        countElement.textContent = this.dramas.length;

        if (this.dramas.length === 0) {
            listContainer.innerHTML = '<p class="empty-message">まだドラマが登録されていません。</p>';
            return;
        }

        // 再放送日時でソート（日時が近い順、日時なしは最後）
        const sortedDramas = [...this.dramas].sort((a, b) => {
            if (!a.rerunDate && !b.rerunDate) return new Date(b.createdAt) - new Date(a.createdAt);
            if (!a.rerunDate) return 1;
            if (!b.rerunDate) return -1;
            return new Date(a.rerunDate) - new Date(b.rerunDate);
        });

        listContainer.innerHTML = sortedDramas.map(drama => `
            <div class="drama-item">
                <div class="drama-header">
                    <div>
                        <div class="drama-title">
                            ${this.escapeHtml(drama.title)}
                            ${drama.year ? `<span class="drama-year">${this.escapeHtml(drama.year)}</span>` : ''}
                        </div>
                    </div>
                    <button class="btn btn-delete" onclick="app.deleteDrama(${drama.id})">削除</button>
                </div>
                ${drama.rerunDate ? `<div class="rerun-datetime">📅 再放送: ${this.formatDateTime(drama.rerunDate)}</div>` : ''}
                ${drama.notes ? `<div class="drama-notes">📝 ${this.escapeHtml(drama.notes)}</div>` : ''}
                <div class="drama-date">登録日: ${this.formatDate(drama.createdAt)}</div>
            </div>
        `).join('');
    }

    // リマインダーチェッカーを開始
    startReminderChecker() {
        // 1分ごとにチェック
        this.reminderInterval = setInterval(() => {
            this.checkReminders();
        }, 60000);

        // 初回実行
        this.checkReminders();
    }

    // リマインダーをチェック
    checkReminders() {
        if (Notification.permission !== 'granted') return;

        const now = new Date();
        const dramasWithDates = this.dramas.filter(d => d.rerunDate && !d.notified);

        dramasWithDates.forEach(drama => {
            const rerunDate = new Date(drama.rerunDate);
            const timeDiff = rerunDate - now;
            const minutesUntil = Math.floor(timeDiff / (1000 * 60));
            const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));

            // 1時間前、30分前、10分前、開始時刻に通知
            if (minutesUntil === 60 || minutesUntil === 30 || minutesUntil === 10 || minutesUntil === 0) {
                let message = '';
                if (minutesUntil === 60) message = '1時間後に再放送があります！';
                else if (minutesUntil === 30) message = '30分後に再放送があります！';
                else if (minutesUntil === 10) message = 'まもなく（10分後）再放送が始まります！';
                else message = '再放送が始まりました！';

                this.showNotification(`📺 ${drama.title}`, message);
            }

            // 再放送が終了したらnotifiedフラグを立てる
            if (timeDiff < -60 * 60 * 1000) { // 1時間経過
                drama.notified = true;
                this.saveDramas();
            }
        });
    }

    // 指定日付のドラマを取得
    getDramasByDate(dateStr) {
        return this.dramas.filter(d => {
            if (!d.rerunDate) return false;
            return this.formatDateOnly(new Date(d.rerunDate)) === dateStr;
        });
    }

    // 同じ日かチェック
    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    // ローカルストレージへの保存
    saveDramas() {
        try {
            localStorage.setItem('tvDramas', JSON.stringify(this.dramas));
        } catch (error) {
            console.error('保存に失敗しました:', error);
            alert('データの保存に失敗しました');
        }
    }

    // ローカルストレージからの読み込み
    loadDramas() {
        try {
            const saved = localStorage.getItem('tvDramas');
            if (saved) {
                this.dramas = JSON.parse(saved);
            }
        } catch (error) {
            console.error('読み込みに失敗しました:', error);
            this.dramas = [];
        }
    }

    // 通知権限のリクエスト
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert('このブラウザは通知機能に対応していません');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            this.updateNotificationStatus();

            if (permission === 'granted') {
                this.showNotification('通知が有効になりました', 'ドラマの再放送情報をお知らせします');
            } else if (permission === 'denied') {
                alert('通知が拒否されました。ブラウザの設定から許可してください。');
            }
        } catch (error) {
            console.error('通知権限のリクエストに失敗しました:', error);
        }
    }

    // 通知ステータスの更新
    updateNotificationStatus() {
        const statusElement = document.getElementById('notificationStatus');
        const btn = document.getElementById('enableNotificationBtn');

        if (!('Notification' in window)) {
            statusElement.textContent = '⚠️ このブラウザは通知機能に対応していません';
            btn.disabled = true;
            return;
        }

        const permission = Notification.permission;

        if (permission === 'granted') {
            statusElement.textContent = '✅ 通知が有効です（1時間前・30分前・10分前・開始時刻にお知らせ）';
            statusElement.style.color = '#4caf50';
            btn.disabled = true;
            btn.textContent = '通知は有効です';
        } else if (permission === 'denied') {
            statusElement.textContent = '❌ 通知が拒否されています';
            statusElement.style.color = '#f44336';
            btn.disabled = true;
        } else {
            statusElement.textContent = '通知はまだ有効になっていません';
            statusElement.style.color = '#ff9800';
        }
    }

    // 通知の表示
    showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '📺',
                badge: '📺'
            });
        }
    }

    // ユーティリティ: HTML エスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ユーティリティ: 日付フォーマット
    formatDate(isoString) {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    // ユーティリティ: 日付のみフォーマット（YYYY-MM-DD）
    formatDateOnly(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ユーティリティ: 日時フォーマット
    formatDateTime(isoString) {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }
}

// アプリケーション起動
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DramaNotifierApp();
});
