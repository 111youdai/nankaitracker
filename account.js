'use strict';
(() => {
    const worker = window.TRACKER_LOG_WORKER_URL;
    const storageKey = 'nankaiTrackerAccountToken';
    let token = localStorage.getItem(storageKey) || '';
    let currentUser = null;

    const byId = id => document.getElementById(id);
    const authGate = byId('authGate');
    const appShell = byId('appShell');
    const message = byId('authMessage');

    window.getTrackerAccountToken = () => token;
    window.getTrackerAccountUser = () => currentUser;

    async function api(path, options = {}) {
        const response = await fetch(`${worker}${path}`, {
            ...options,
            headers: {
                ...options.headers,
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            signal: AbortSignal.timeout(30000)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        return data;
    }

    function setMessage(text, isError = false) {
        message.textContent = text || '';
        message.classList.toggle('error', isError);
    }

    function switchAuth(mode) {
        const register = mode === 'register';
        byId('accountLogin').hidden = register;
        byId('accountRegister').hidden = !register;
        byId('showLogin').classList.toggle('active', !register);
        byId('showRegister').classList.toggle('active', register);
        setMessage('');
    }

    function sendTokenToRecords() {
        const frame = byId('recordsFrame');
        if (!frame?.contentWindow || !token) return;
        frame.contentWindow.postMessage(
            { type: 'nankai-tracker-auth', token },
            new URL(worker).origin
        );
    }

    function showApp(user) {
        currentUser = user;
        authGate.hidden = true;
        appShell.hidden = false;
        const name = user.displayName || user.email;
        byId('accountInitial').textContent = [...name][0]?.toUpperCase() || 'U';
        byId('accountDisplayName').textContent = name;
        byId('accountEmail').textContent = user.email;
        byId('accountRole').textContent = user.role === 'owner' ? '管理者' : 'メンバー';
        byId('adminPanel').hidden = user.role !== 'owner';
        window.dispatchEvent(new CustomEvent('nankai-account-ready', { detail: user }));
        window.setTimeout(sendTokenToRecords, 300);
    }

    function showAuth(reason = '') {
        currentUser = null;
        appShell.hidden = true;
        authGate.hidden = false;
        if (reason) setMessage(reason, true);
    }

    async function acceptSession(data) {
        token = data.token;
        localStorage.setItem(storageKey, token);
        showApp(data.user);
    }

    async function verifyStoredSession() {
        if (!token) {
            showAuth();
            return;
        }
        try {
            const data = await api('/api/account/me');
            showApp(data.user);
        } catch {
            token = '';
            localStorage.removeItem(storageKey);
            showAuth('ログインの有効期限が切れました。もう一度ログインしてください。');
        }
    }

    async function updateSetupStatus() {
        try {
            const data = await api('/api/account/setup-status');
            byId('setupCodeField').hidden = !data.needsOwner;
            byId('setupCode').required = !!data.needsOwner;
            if (data.needsOwner) switchAuth('register');
        } catch (error) {
            setMessage(error.message, true);
        }
    }

    function userRow(user) {
        const row = document.createElement('article');
        row.className = `user-row ${user.status}`;
        const copy = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = user.displayName;
        const email = document.createElement('span');
        email.textContent = user.email;
        const status = document.createElement('small');
        status.textContent = {
            pending: '承認待ち', approved: '利用中', rejected: '拒否済み', disabled: '停止中'
        }[user.status] || user.status;
        copy.append(title, email, status);
        row.append(copy);

        if (user.role !== 'owner') {
            const actions = document.createElement('div');
            actions.className = 'user-actions';
            const choices = user.status === 'pending'
                ? [['承認', 'approved'], ['拒否', 'rejected']]
                : user.status === 'approved'
                    ? [['利用停止', 'disabled']]
                    : [['再承認', 'approved']];
            for (const [label, value] of choices) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.className = value === 'approved' ? 'approve' : 'reject';
                button.addEventListener('click', async () => {
                    button.disabled = true;
                    try {
                        await api(`/api/account/admin/users/${user.id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: value })
                        });
                        await loadUsers();
                    } catch (error) {
                        setMessage(error.message, true);
                    } finally {
                        button.disabled = false;
                    }
                });
                actions.append(button);
            }
            row.append(actions);
        }
        return row;
    }

    async function loadUsers() {
        const list = byId('userList');
        list.textContent = '読み込み中…';
        try {
            const data = await api('/api/account/admin/users');
            list.replaceChildren(...data.items.map(userRow));
        } catch (error) {
            list.textContent = error.message;
        }
    }

    function logout() {
        token = '';
        currentUser = null;
        localStorage.removeItem(storageKey);
        const modal = byId('accountModal');
        if (modal?.open) modal.close();
        showAuth('ログアウトしました。');
    }

    byId('showLogin').addEventListener('click', () => switchAuth('login'));
    byId('showRegister').addEventListener('click', () => switchAuth('register'));

    byId('accountLogin').addEventListener('submit', async event => {
        event.preventDefault();
        const button = event.submitter;
        button.disabled = true;
        setMessage('ログインしています…');
        try {
            const data = await api('/api/account/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: byId('loginEmail').value,
                    password: byId('loginPassword').value
                })
            });
            byId('loginPassword').value = '';
            await acceptSession(data);
        } catch (error) {
            setMessage(error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    byId('accountRegister').addEventListener('submit', async event => {
        event.preventDefault();
        const button = event.submitter;
        button.disabled = true;
        setMessage('登録しています…');
        try {
            const data = await api('/api/account/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: byId('registerName').value,
                    email: byId('registerEmail').value,
                    password: byId('registerPassword').value,
                    setupCode: byId('setupCode').value
                })
            });
            byId('registerPassword').value = '';
            byId('setupCode').value = '';
            if (data.approved) {
                await acceptSession(data);
            } else {
                switchAuth('login');
                setMessage(data.message || '登録申請を受け付けました。');
            }
        } catch (error) {
            setMessage(error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    byId('accountBtn').addEventListener('click', () => {
        byId('accountModal').showModal();
        if (currentUser?.role === 'owner') void loadUsers();
    });
    byId('closeAccountModal').addEventListener('click', () => byId('accountModal').close());
    byId('refreshUsers').addEventListener('click', () => void loadUsers());
    byId('accountLogout').addEventListener('click', logout);

    byId('recordsFrame').addEventListener('load', sendTokenToRecords);
    window.addEventListener('message', event => {
        if (event.origin !== new URL(worker).origin) return;
        if (event.data?.type === 'nankai-tracker-logout') logout();
    });

    void updateSetupStatus();
    void verifyStoredSession();
})();
