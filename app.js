// アプリケーション状態管理
class DramaNotifierApp {
    constructor() {
        this.dramas = [];
        this.init();
    }

    init() {
        this.loadDramas();
        this.setupEventListeners();
        this.renderDramaList();
        this.updateNotificationStatus();
    }

    // イベントリスナーの設定
    setupEventListeners() {
        const form = document.getElementById('addDramaForm');
        form.addEventListener('submit', (e) => this.handleAddDrama(e));

        const notificationBtn = document.getElementById('enableNotificationBtn');
        notificationBtn.addEventListener('click', () => this.requestNotificationPermission());
    }

    // ドラマ登録処理
    handleAddDrama(e) {
        e.preventDefault();

        const title = document.getElementById('dramaTitle').value.trim();
        const year = document.getElementById('dramaYear').value.trim();
        const notes = document.getElementById('dramaNotes').value.trim();

        if (!title) {
            alert('ドラマタイトルを入力してください');
            return;
        }

        const newDrama = {
            id: Date.now(),
            title: title,
            year: year,
            notes: notes,
            createdAt: new Date().toISOString()
        };

        this.dramas.push(newDrama);
        this.saveDramas();
        this.renderDramaList();

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
            this.showNotification('削除完了', `「${drama.title}」を削除しました`);
        }
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

        // 新しい順にソート
        const sortedDramas = [...this.dramas].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

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
                ${drama.notes ? `<div class="drama-notes">📝 ${this.escapeHtml(drama.notes)}</div>` : ''}
                <div class="drama-date">登録日: ${this.formatDate(drama.createdAt)}</div>
            </div>
        `).join('');
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
            statusElement.textContent = '✅ 通知が有効です';
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
}

// アプリケーション起動
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DramaNotifierApp();
});
