// Toast Notification Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'danger') icon = 'fa-triangle-exclamation';
    if (type === 'warning') icon = 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Router and Global State
const App = (() => {
    let currentUser = null;
    let activePath = '/dashboard';

    // Page templates mapping
    const routes = {
        '/dashboard': renderDashboard,
        '/students': renderStudents,
        '/subjects': renderSubjects,
        '/schedules': renderSchedules,
        '/sessions': renderSessions,
        '/recap': renderRecap
    };

    function init() {
        setupAuthListeners();
        setupNavigationListeners();
        
        if (API.isAuthenticated()) {
            currentUser = API.getCurrentUser();
            showAppLayout();
            navigate(window.location.pathname === '/' ? '/dashboard' : window.location.pathname);
        } else {
            showAuthLayout();
        }
    }

    function showAppLayout() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        // Update teacher profile info
        if (currentUser) {
            document.getElementById('teacher-name').innerText = currentUser.name;
            document.getElementById('teacher-email').innerText = currentUser.email;
        }
    }

    function showAuthLayout() {
        document.getElementById('app').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('auth-subtitle').innerText = 'Masuk untuk mengelola les privat Anda';
    }

    function setupAuthListeners() {
        // Switch form links
        document.getElementById('switch-to-register').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
            document.getElementById('auth-subtitle').innerText = 'Daftar akun guru baru';
        });

        document.getElementById('switch-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('auth-subtitle').innerText = 'Masuk untuk mengelola les privat Anda';
        });

        // Submit forms
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                const data = await API.login(email, password);
                currentUser = data.user;
                showToast('Login berhasil! Selamat datang kembali.');
                showAppLayout();
                navigate('/dashboard');
            } catch (err) {
                showToast(err.message, 'danger');
            }
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            
            try {
                const data = await API.register(name, email, password);
                currentUser = data.user;
                showToast('Registrasi berhasil! Akun Anda siap digunakan.');
                showAppLayout();
                navigate('/dashboard');
            } catch (err) {
                showToast(err.message, 'danger');
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            API.logout();
            currentUser = null;
            showToast('Anda telah keluar dari aplikasi.');
            showAuthLayout();
        });
    }

    function setupNavigationListeners() {
        // Intercept link clicks with data-link
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('[data-link]');
            if (link) {
                e.preventDefault();
                navigate(link.getAttribute('href'));
            }
        });

        // Browser back/forward button navigation
        window.addEventListener('popstate', () => {
            navigate(window.location.pathname);
        });

        // Mobile responsive sidebar menu toggle
        const sidebar = document.querySelector('.sidebar');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Close sidebar on click inside content for mobile
        document.querySelector('.main-container').addEventListener('click', () => {
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    }

    function navigate(path) {
        // If route not found, default to dashboard
        if (!routes[path]) {
            path = '/dashboard';
        }
        
        activePath = path;
        window.history.pushState(null, null, path);
        
        // Update sidebar links active status
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
            if (link.getAttribute('href') === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Close sidebar on navigate (on mobile view)
        document.querySelector('.sidebar').classList.remove('open');

        // Render target page
        const contentArea = document.getElementById('app-content');
        contentArea.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><h3>Memuat Halaman...</h3></div>';
        routes[path](contentArea);
    }

    // ==========================================================================
    // VIEW RENDERERS
    // ==========================================================================

    /* --------------------------------------------------------------------------
       1. DASHBOARD PAGE
       -------------------------------------------------------------------------- */
    async function renderDashboard(container) {
        try {
            // Load dashboard data from recap and sessions API
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const dateStr = today.toISOString().split('T')[0];
            
            // Parallel API calls
            const [recap, sessionsToday] = await Promise.all([
                API.get(`/recap/monthly?year=${year}&month=${month}`),
                API.get(`/sessions?start_date=${dateStr}&end_date=${dateStr}`)
            ]);

            const formattedEarnings = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(recap.total_earnings);

            container.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <h1>Dashboard</h1>
                        <p>Ringkasan performa bimbingan belajar privat Anda</p>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon primary"><i class="fa-solid fa-graduation-cap"></i></div>
                        <div class="stat-info">
                            <h3>${recap.students ? recap.students.length : 0}</h3>
                            <p>Total Murid</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon success"><i class="fa-solid fa-chalkboard-user"></i></div>
                        <div class="stat-info">
                            <h3>${recap.completed_sessions}</h3>
                            <p>Sesi Selesai Bulan Ini</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon warning"><i class="fa-solid fa-wallet"></i></div>
                        <div class="stat-info">
                            <h3>${formattedEarnings}</h3>
                            <p>Pendapatan Bulan Ini</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon danger"><i class="fa-solid fa-circle-xmark"></i></div>
                        <div class="stat-info">
                            <h3>${recap.cancelled_sessions}</h3>
                            <p>Sesi Batal Bulan Ini</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Jadwal & Sesi Mengajar Hari Ini</h3>
                            <span class="badge badge-primary">${today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                        </div>
                        
                        <div class="list-container" id="today-sessions-list">
                            ${renderSessionsTodayList(sessionsToday)}
                        </div>
                    </div>

                    <div class="card">
                        <h3 class="card-title" style="margin-bottom: 20px;">Aksi Cepat</h3>
                        <div class="list-container">
                            <button class="btn btn-primary btn-block" id="btn-quick-add-session">
                                <i class="fa-solid fa-plus"></i> Tambah Sesi Ad-Hoc
                            </button>
                            <button class="btn btn-secondary btn-block" id="btn-quick-generate-sessions">
                                <i class="fa-solid fa-gears"></i> Generate Sesi Rutin
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Dashboard event listeners
            document.getElementById('btn-quick-add-session').addEventListener('click', () => openSessionModal());
            document.getElementById('btn-quick-generate-sessions').addEventListener('click', () => openGenerateSessionsModal());
            setupSessionRowListeners(sessionsToday);

        } catch (err) {
            container.innerHTML = `<div class="empty-state danger"><i class="fa-solid fa-circle-exclamation"></i><h3>Gagal Memuat Dashboard</h3><p>${err.message}</p></div>`;
        }
    }

    function renderSessionsTodayList(sessions) {
        if (!sessions || sessions.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fa-solid fa-calendar-check"></i>
                    <h3>Tidak ada sesi hari ini</h3>
                    <p>Santai saja atau tambahkan sesi tambahan.</p>
                </div>
            `;
        }

        return sessions.map(s => {
            const timeRange = `${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}`;
            let statusBadge = '';
            
            if (s.status === 'completed') statusBadge = `<span class="badge badge-success">Selesai</span>`;
            else if (s.status === 'cancelled') statusBadge = `<span class="badge badge-danger">Batal</span>`;
            else statusBadge = `<span class="badge badge-warning">Reschedule</span>`;

            return `
                <div class="list-item" data-session-id="${s.id}">
                    <div class="item-left">
                        <div class="item-avatar">${s.student_name[0]}</div>
                        <div class="item-details">
                            <h4>${s.student_name}</h4>
                            <p>${s.subject_name} • <span class="text-primary-cell">${timeRange}</span></p>
                        </div>
                    </div>
                    <div class="item-right">
                        ${statusBadge}
                        <button class="btn-icon btn-action-edit-session" title="Edit Sesi"><i class="fa-solid fa-pen-to-square"></i></button>
                        ${s.status === 'completed' 
                            ? `<button class="btn btn-secondary btn-write-report" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fa-solid fa-file-invoice"></i> Report</button>` 
                            : ''
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    /* --------------------------------------------------------------------------
       2. KELOLA MURID PAGE
       -------------------------------------------------------------------------- */
    async function renderStudents(container) {
        try {
            const students = await API.get('/students');

            container.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <h1>Kelola Murid</h1>
                        <p>Daftar lengkap murid bimbingan belajar beserta data orangtua</p>
                    </div>
                    <button class="btn btn-primary" id="btn-add-student">
                        <i class="fa-solid fa-user-plus"></i> Tambah Murid
                    </button>
                </div>

                <div class="card" style="padding: 0; overflow: hidden;">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama Murid</th>
                                    <th>Sekolah & Kelas</th>
                                    <th>Orang Tua</th>
                                    <th>Mata Pelajaran</th>
                                    <th>Fee Model & Jumlah</th>
                                    <th style="text-align: right;">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderStudentsTableRows(students)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            document.getElementById('btn-add-student').addEventListener('click', () => openStudentModal());
            setupStudentTableListeners(students);

        } catch (err) {
            container.innerHTML = `<div class="empty-state danger"><i class="fa-solid fa-circle-exclamation"></i><h3>Gagal Memuat Murid</h3><p>${err.message}</p></div>`;
        }
    }

    function renderStudentsTableRows(students) {
        if (!students || students.length === 0) {
            return `<tr><td colspan="6" style="text-align: center; padding: 40px;"><div class="empty-state"><i class="fa-solid fa-users-slash"></i><h3>Belum ada murid terdaftar</h3><p>Klik tombol 'Tambah Murid' untuk menambahkan murid baru.</p></div></td></tr>`;
        }

        return students.map(s => {
            const parentName = s.parent ? `${s.parent.father_name || ''} / ${s.parent.mother_name || ''}`.replace(/^\s*\/|\/\s*$/, '') : '-';
            const subjectsList = s.subjects && s.subjects.length > 0 
                ? s.subjects.map(sub => `<span class="badge badge-primary" style="margin-right: 4px; text-transform:none;">${sub.name}</span>`).join('')
                : '<span class="badge badge-secondary">Belum ada</span>';
            
            let modelLabel = '';
            if (s.fee_model === 'per_session') modelLabel = 'Per Sesi';
            else if (s.fee_model === 'monthly') modelLabel = 'Bulanan Flat';
            else modelLabel = 'Per Jam';

            const feeFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(s.fee_amount);

            return `
                <tr data-student-id="${s.id}">
                    <td class="text-primary-cell">${s.full_name}</td>
                    <td>${s.school || '-'} (Kelas ${s.grade || '-'})</td>
                    <td>${parentName}</td>
                    <td>${subjectsList}</td>
                    <td><span class="text-primary-cell">${feeFormatted}</span> <span class="badge badge-secondary" style="font-size:0.65rem;">${modelLabel}</span></td>
                    <td style="text-align: right;">
                        <div style="display:inline-flex; gap: 8px; justify-content: flex-end;">
                            <button class="btn-icon btn-edit-student" title="Edit"><i class="fa-solid fa-user-pen"></i></button>
                            <button class="btn-icon btn-delete-student" style="color:var(--danger)" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /* --------------------------------------------------------------------------
       3. MATA PELAJARAN PAGE
       -------------------------------------------------------------------------- */
    async function renderSubjects(container) {
        try {
            const subjects = await API.get('/subjects');

            container.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <h1>Mata Pelajaran</h1>
                        <p>Daftar mata pelajaran yang Anda ajarkan</p>
                    </div>
                    <button class="btn btn-primary" id="btn-add-subject">
                        <i class="fa-solid fa-plus"></i> Tambah Pelajaran
                    </button>
                </div>

                <div class="card" style="padding: 0; overflow: hidden; max-width: 600px;">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama Pelajaran</th>
                                    <th style="text-align: right; width: 120px;">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderSubjectsRows(subjects)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            document.getElementById('btn-add-subject').addEventListener('click', () => openSubjectModal());
            setupSubjectTableListeners(subjects);

        } catch (err) {
            container.innerHTML = `<div class="empty-state danger"><i class="fa-solid fa-circle-exclamation"></i><h3>Gagal Memuat Mata Pelajaran</h3><p>${err.message}</p></div>`;
        }
    }

    function renderSubjectsRows(subjects) {
        if (!subjects || subjects.length === 0) {
            return `<tr><td colspan="2" style="text-align: center; padding: 40px;"><div class="empty-state"><i class="fa-solid fa-book-open"></i><h3>Belum ada mata pelajaran</h3><p>Klik tombol untuk menambahkan mata pelajaran baru.</p></div></td></tr>`;
        }

        return subjects.map(s => `
            <tr data-subject-id="${s.id}">
                <td class="text-primary-cell">${s.name}</td>
                <td style="text-align: right;">
                    <div style="display:inline-flex; gap: 8px; justify-content: flex-end;">
                        <button class="btn-icon btn-edit-subject" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-icon btn-delete-subject" style="color:var(--danger)" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /* --------------------------------------------------------------------------
       4. JADWAL RUTIN PAGE
       -------------------------------------------------------------------------- */
    async function renderSchedules(container) {
        try {
            const schedules = await API.get('/schedules');
            const dayLabels = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

            container.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <h1>Jadwal Rutin Mingguan</h1>
                        <p>Kalender jadwal rutin tetap mengajar Anda tiap minggunya</p>
                    </div>
                    <div style="display:flex; gap: 12px;">
                        <button class="btn btn-secondary" id="btn-generate-sessions">
                            <i class="fa-solid fa-gears"></i> Generate Sesi
                        </button>
                        <button class="btn btn-primary" id="btn-add-schedule">
                            <i class="fa-solid fa-plus"></i> Tambah Jadwal
                        </button>
                    </div>
                </div>

                <div class="schedule-calendar">
                    ${dayLabels.map((day, idx) => `
                        <div class="calendar-day-col">
                            <div class="calendar-day-header">${day}</div>
                            <div class="calendar-day-slots" data-day-index="${idx}">
                                ${renderCalendarSlots(schedules, idx)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            document.getElementById('btn-add-schedule').addEventListener('click', () => openScheduleModal());
            document.getElementById('btn-generate-sessions').addEventListener('click', () => openGenerateSessionsModal());
            setupCalendarListeners(schedules);

        } catch (err) {
            container.innerHTML = `<div class="empty-state danger"><i class="fa-solid fa-circle-exclamation"></i><h3>Gagal Memuat Jadwal</h3><p>${err.message}</p></div>`;
        }
    }

    function renderCalendarSlots(schedules, dayIndex) {
        const slots = (schedules || []).filter(s => s.day_of_week === dayIndex);
        if (slots.length === 0) return `<div class="empty-state" style="padding: 20px 0; font-size:0.8rem;"><p>Kosong</p></div>`;

        return slots.map(s => `
            <div class="calendar-slot-item" data-schedule-id="${s.id}">
                <div>${s.student_name}</div>
                <div style="font-size:0.7rem; opacity:0.85; margin-top:2px;">${s.subject_name}</div>
                <span class="slot-time"><i class="fa-regular fa-clock"></i> ${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}</span>
            </div>
        `).join('');
    }

    /* --------------------------------------------------------------------------
       5. SESI MENGAJAR PAGE
       -------------------------------------------------------------------------- */
    async function renderSessions(container) {
        try {
            // Load sessions for current month by default
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

            const [sessions, students] = await Promise.all([
                API.get(`/sessions?start_date=${startOfMonth}&end_date=${endOfMonth}`),
                API.get('/students')
            ]);

            container.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <h1>Sesi Mengajar</h1>
                        <p>Daftar sesi mengajar aktif, cancelled, atau rescheduled</p>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <button class="btn btn-primary" id="btn-add-session">
                            <i class="fa-solid fa-plus"></i> Tambah Sesi Tambahan
                        </button>
                    </div>
                </div>

                <!-- Filters panel -->
                <div class="card" style="padding: 20px; margin-bottom: 24px;">
                    <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); align-items: flex-end;">
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Mulai Tanggal</label>
                            <input type="date" id="filter-start-date" class="form-input form-input-no-icon" value="${startOfMonth}">
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Sampai Tanggal</label>
                            <input type="date" id="filter-end-date" class="form-input form-input-no-icon" value="${endOfMonth}">
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Filter Murid</label>
                            <select id="filter-student-id" class="form-input form-input-no-icon">
                                <option value="">Semua Murid</option>
                                ${students.map(st => `<option value="${st.id}">${st.full_name}</option>`).join('')}
                            </select>
                        </div>
                        <button class="btn btn-secondary" id="btn-apply-filters">
                            <i class="fa-solid fa-filter"></i> Terapkan Filter
                        </button>
                    </div>
                </div>

                <div class="card" style="padding: 0; overflow: hidden;">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Nama Murid</th>
                                    <th>Mata Pelajaran</th>
                                    <th>Waktu</th>
                                    <th>Status</th>
                                    <th>Fee Terhitung</th>
                                    <th style="text-align: right;">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="sessions-table-body">
                                ${renderSessionsTableRows(sessions)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            document.getElementById('btn-add-session').addEventListener('click', () => openSessionModal());
            
            // Filter Apply
            document.getElementById('btn-apply-filters').addEventListener('click', async () => {
                const sDate = document.getElementById('filter-start-date').value;
                const eDate = document.getElementById('filter-end-date').value;
                const stId = document.getElementById('filter-student-id').value;
                
                try {
                    const filtered = await API.get(`/sessions?start_date=${sDate}&end_date=${eDate}&student_id=${stId}`);
                    document.getElementById('sessions-table-body').innerHTML = renderSessionsTableRows(filtered);
                    setupSessionTableListeners(filtered);
                } catch (e) {
                    showToast('Gagal memfilter sesi: ' + e.message, 'danger');
                }
            });

            setupSessionTableListeners(sessions);

        } catch (err) {
            container.innerHTML = `<div class="empty-state danger"><i class="fa-solid fa-circle-exclamation"></i><h3>Gagal Memuat Sesi</h3><p>${err.message}</p></div>`;
        }
    }

    function renderSessionsTableRows(sessions) {
        if (!sessions || sessions.length === 0) {
            return `<tr><td colspan="7" style="text-align: center; padding: 40px;"><div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><h3>Tidak ada sesi ditemukan</h3><p>Sesuaikan range filter atau tambahkan sesi baru.</p></div></td></tr>`;
        }

        return sessions.map(s => {
            const sessionDate = new Date(s.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeRange = `${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}`;
            
            let statusBadge = '';
            if (s.status === 'completed') statusBadge = `<span class="badge badge-success">Selesai</span>`;
            else if (s.status === 'cancelled') statusBadge = `<span class="badge badge-danger">Batal</span>`;
            else statusBadge = `<span class="badge badge-warning">Reschedule</span>`;

            const feeFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(s.fee_calculated);

            return `
                <tr data-session-id="${s.id}">
                    <td class="text-primary-cell">${sessionDate}</td>
                    <td>${s.student_name}</td>
                    <td>${s.subject_name}</td>
                    <td>${timeRange}</td>
                    <td>${statusBadge}</td>
                    <td class="text-primary-cell">${feeFormatted}</td>
                    <td style="text-align: right;">
                        <div style="display:inline-flex; gap: 8px; justify-content: flex-end; align-items:center;">
                            <button class="btn-icon btn-edit-session" title="Edit Status/Waktu"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="btn-icon btn-delete-session" style="color:var(--danger)" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                            ${s.status === 'completed'
                                ? s.has_report
                                    ? `<button class="btn btn-secondary btn-view-report" style="padding: 6px 12px; font-size: 0.8rem; border-color:var(--success); color:var(--success);"><i class="fa-solid fa-file-circle-check"></i> Report</button>`
                                    : `<button class="btn btn-primary btn-write-report" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fa-solid fa-file-invoice"></i> Buat Report</button>`
                                : ''
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /* --------------------------------------------------------------------------
       6. REKAP BULANAN & CHART PAGE
       -------------------------------------------------------------------------- */
    async function renderRecap(container) {
        try {
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth() + 1;

            const recap = await API.get(`/recap/monthly?year=${currentYear}&month=${currentMonth}`);
            const trends = await API.get('/recap/trend?months=6');

            container.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <h1>Rekap Pendapatan & Laporan</h1>
                        <p>Ringkasan bulanan serta statistik fee dan performa mengajar Anda</p>
                    </div>
                </div>

                <!-- Month Selector -->
                <div class="card" style="padding: 20px; margin-bottom: 24px;">
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr; align-items: flex-end; max-width:600px;">
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Pilih Tahun</label>
                            <select id="recap-year" class="form-input form-input-no-icon">
                                <option value="2025">2025</option>
                                <option value="2026" selected>2026</option>
                                <option value="2027">2027</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Pilih Bulan</label>
                            <select id="recap-month" class="form-input form-input-no-icon">
                                <option value="1">Januari</option>
                                <option value="2">Februari</option>
                                <option value="3">Maret</option>
                                <option value="4">April</option>
                                <option value="5">Mei</option>
                                <option value="6">Juni</option>
                                <option value="7">Juli</option>
                                <option value="8">Agustus</option>
                                <option value="9">September</option>
                                <option value="10">Oktober</option>
                                <option value="11">November</option>
                                <option value="12">Desember</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" id="btn-load-recap">
                            <i class="fa-solid fa-magnifying-glass"></i> Cari Laporan
                        </button>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card" style="padding: 0; overflow: hidden;">
                        <div class="card-header" style="padding: 24px 24px 10px 24px;">
                            <h3 class="card-title">Rincian Per Murid</h3>
                        </div>
                        <div class="table-container" style="border:none;">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nama Murid</th>
                                        <th>Sesi (Selesai/Batal/Reschedule)</th>
                                        <th>Model Fee</th>
                                        <th>Estimasi Pendapatan</th>
                                    </tr>
                                </thead>
                                <tbody id="recap-students-body">
                                    ${renderRecapStudentsRows(recap.students)}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="padding: 20px 24px; background-color: var(--bg-app); border-top: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="font-weight: 700;">TOTAL ESTIMASI PENDAPATAN:</h4>
                            <h3 style="font-weight: 800; color: var(--primary);" id="recap-total-earnings">
                                ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(recap.total_earnings)}
                            </h3>
                        </div>
                    </div>

                    <div class="card" style="display:flex; flex-direction:column; justify-content:center;">
                        <h3 class="card-title" style="margin-bottom: 20px;">Tren Pendapatan (6 Bulan)</h3>
                        <div style="position: relative; height: 260px; width: 100%;">
                            <canvas id="trendChart"></canvas>
                        </div>
                    </div>
                </div>
            `;

            // Default month selections in inputs
            document.getElementById('recap-year').value = currentYear;
            document.getElementById('recap-month').value = currentMonth;

            // Load button
            document.getElementById('btn-load-recap').addEventListener('click', async () => {
                const year = document.getElementById('recap-year').value;
                const month = document.getElementById('recap-month').value;
                try {
                    const freshRecap = await API.get(`/recap/monthly?year=${year}&month=${month}`);
                    document.getElementById('recap-students-body').innerHTML = renderRecapStudentsRows(freshRecap.students);
                    document.getElementById('recap-total-earnings').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(freshRecap.total_earnings);
                } catch (e) {
                    showToast('Gagal memuat rekap: ' + e.message, 'danger');
                }
            });

            // Initialize chart
            renderTrendChart(trends);

        } catch (err) {
            container.innerHTML = `<div class="empty-state danger"><i class="fa-solid fa-circle-exclamation"></i><h3>Gagal Memuat Rekap</h3><p>${err.message}</p></div>`;
        }
    }

    function renderRecapStudentsRows(students) {
        if (!students || students.length === 0) {
            return `<tr><td colspan="4" style="text-align: center; padding: 30px;">Tidak ada data murid di bulan ini.</td></tr>`;
        }

        return students.map(s => {
            let modelLabel = '';
            if (s.fee_model === 'per_session') modelLabel = 'Per Sesi';
            else if (s.fee_model === 'monthly') modelLabel = 'Bulanan Flat';
            else modelLabel = 'Per Jam';

            const earningsFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(s.total_earnings);

            return `
                <tr>
                    <td class="text-primary-cell">${s.student_name}</td>
                    <td>
                        <span class="badge badge-success" style="font-size:0.65rem;">${s.completed_count} Selesai</span>
                        <span class="badge badge-danger" style="font-size:0.65rem;">${s.cancelled_count} Batal</span>
                        <span class="badge badge-warning" style="font-size:0.65rem;">${s.rescheduled_count} Reschedule</span>
                    </td>
                    <td>${modelLabel} (${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(s.fee_amount)})</td>
                    <td class="text-primary-cell" style="color:var(--primary); font-weight:700;">${earningsFormatted}</td>
                </tr>
            `;
        }).join('');
    }

    function renderTrendChart(trends) {
        const ctx = document.getElementById('trendChart').getContext('2d');
        if (!ctx) return;

        const labels = trends.map(t => t.label);
        const data = trends.map(t => t.earnings);

        // Get computed style for fonts/colors
        const isDark = document.body.classList.contains('theme-dark');
        const textColor = isDark ? '#94a3b8' : '#475569';
        const gridColor = isDark ? '#222e45' : '#e2e8f0';

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pendapatan (IDR)',
                    data: data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#4f46e5',
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        ticks: { color: textColor, font: { family: 'Inter' } },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor, font: { family: 'Inter' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // ==========================================================================
    // MODAL WINDOWS & OPERATIONS (SUB VIEWS)
    // ==========================================================================

    /* --------------------------------------------------------------------------
       MODAL: TAMBAH/EDIT MURID (+ ORANG TUA)
       -------------------------------------------------------------------------- */
    async function openStudentModal(studentId = null) {
        try {
            // Load subject details for checklists
            const subjects = await API.get('/subjects');
            let student = null;

            if (studentId) {
                student = await API.get(`/students/${studentId}`);
            }

            const isEdit = !!student;
            
            // Format dates
            let dobVal = '';
            if (student && student.birth_date) {
                dobVal = student.birth_date.split('T')[0];
            }

            const modalHtml = `
                <div class="modal-overlay" id="student-modal">
                    <div class="modal" style="max-width: 700px;">
                        <div class="modal-header">
                            <h3>${isEdit ? 'Ubah Informasi Murid' : 'Tambah Murid Baru'}</h3>
                            <button class="btn-close" id="close-student-modal"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <form id="student-form">
                            <div class="modal-body">
                                <h4 style="margin-bottom:12px; color:var(--primary); font-weight:700;"><i class="fa-solid fa-graduation-cap"></i> Data Diri Murid</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Nama Lengkap *</label>
                                        <input type="text" id="m-student-name" class="form-input form-input-no-icon" value="${student ? student.full_name : ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Tanggal Lahir</label>
                                        <input type="date" id="m-student-dob" class="form-input form-input-no-icon" value="${dobVal}">
                                    </div>
                                    <div class="form-group">
                                        <label>Jenis Kelamin</label>
                                        <select id="m-student-gender" class="form-input form-input-no-icon">
                                            <option value="Laki-laki" ${student && student.gender === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                                            <option value="Perempuan" ${student && student.gender === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Nomor Telepon Murid</label>
                                        <input type="text" id="m-student-phone" class="form-input form-input-no-icon" value="${student ? student.phone : ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Sekolah</label>
                                        <input type="text" id="m-student-school" class="form-input form-input-no-icon" value="${student ? student.school : ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Kelas</label>
                                        <input type="text" id="m-student-grade" class="form-input form-input-no-icon" value="${student ? student.grade : ''}">
                                    </div>
                                    <div class="form-group form-grid-full">
                                        <label>Alamat Murid</label>
                                        <textarea id="m-student-address" class="form-input form-input-no-icon" style="height:60px;">${student ? student.address : ''}</textarea>
                                    </div>
                                    <div class="form-group form-grid-full">
                                        <label>Catatan Khusus (Alergi, Hambatan Belajar, Kebutuhan)</label>
                                        <textarea id="m-student-notes" class="form-input form-input-no-icon" style="height:60px;">${student ? student.notes : ''}</textarea>
                                    </div>
                                </div>

                                <h4 style="margin:24px 0 12px 0; color:var(--primary); font-weight:700;"><i class="fa-solid fa-user-group"></i> Data Orangtua / Wali</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Nama Ayah</label>
                                        <input type="text" id="m-parent-father" class="form-input form-input-no-icon" value="${student && student.parent ? student.parent.father_name : ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Nama Ibu</label>
                                        <input type="text" id="m-parent-mother" class="form-input form-input-no-icon" value="${student && student.parent ? student.parent.mother_name : ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>No. HP Orangtua (Bisa lebih dari satu, pisah koma)</label>
                                        <input type="text" id="m-parent-phone" class="form-input form-input-no-icon" value="${student && student.parent ? student.parent.phones.join(', ') : ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Email Orangtua</label>
                                        <input type="email" id="m-parent-email" class="form-input form-input-no-icon" value="${student && student.parent ? student.parent.email : ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Pekerjaan</label>
                                        <input type="text" id="m-parent-job" class="form-input form-input-no-icon" value="${student && student.parent ? student.parent.occupation : ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Alamat Orangtua (Kosongi jika sama dengan murid)</label>
                                        <input type="text" id="m-parent-addr" class="form-input form-input-no-icon" value="${student && student.parent ? student.parent.address : ''}">
                                    </div>
                                </div>

                                <h4 style="margin:24px 0 12px 0; color:var(--primary); font-weight:700;"><i class="fa-solid fa-dollar-sign"></i> Model Fee & Pelajaran</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Model Perhitungan Fee *</label>
                                        <select id="m-student-feemodel" class="form-input form-input-no-icon" required>
                                            <option value="per_session" ${student && student.fee_model === 'per_session' ? 'selected' : ''}>Per Sesi</option>
                                            <option value="monthly" ${student && student.fee_model === 'monthly' ? 'selected' : ''}>Bulanan Flat</option>
                                            <option value="per_hour" ${student && student.fee_model === 'per_hour' ? 'selected' : ''}>Per Jam</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Jumlah Fee (Rp) *</label>
                                        <input type="number" id="m-student-feeamount" class="form-input form-input-no-icon" value="${student ? student.fee_amount : '0'}" required>
                                    </div>
                                    
                                    <div class="form-group form-grid-full">
                                        <label>Asosiasikan Mata Pelajaran</label>
                                        <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:8px;">
                                            ${subjects.map(sub => {
                                                const checked = student && student.subjects && student.subjects.some(s => s.id === sub.id) ? 'checked' : '';
                                                return `
                                                    <label style="display:inline-flex; align-items:center; gap:6px; font-weight:500; cursor:pointer;">
                                                        <input type="checkbox" name="m-student-subjects" value="${sub.id}" ${checked}> ${sub.name}
                                                    </label>
                                                `;
                                            }).join('')}
                                            ${subjects.length === 0 ? '<p style="font-size:0.85rem; color:var(--text-secondary);">Silakan daftarkan mata pelajaran terlebih dahulu di menu utama.</p>' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="btn-cancel-student">Batal</button>
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Modal elements listeners
            const modal = document.getElementById('student-modal');
            const closeBtn = document.getElementById('close-student-modal');
            const cancelBtn = document.getElementById('btn-cancel-student');

            const destroy = () => modal.remove();

            closeBtn.addEventListener('click', destroy);
            cancelBtn.addEventListener('click', destroy);

            // Form Submit handler
            document.getElementById('student-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                // Build values
                const name = document.getElementById('m-student-name').value;
                const dob = document.getElementById('m-student-dob').value || null;
                const gender = document.getElementById('m-student-gender').value;
                const phone = document.getElementById('m-student-phone').value;
                const school = document.getElementById('m-student-school').value;
                const grade = document.getElementById('m-student-grade').value;
                const address = document.getElementById('m-student-address').value;
                const notes = document.getElementById('m-student-notes').value;
                
                const fatherName = document.getElementById('m-parent-father').value;
                const motherName = document.getElementById('m-parent-mother').value;
                
                // Phones splitting
                const parentPhoneStr = document.getElementById('m-parent-phone').value;
                const phones = parentPhoneStr ? parentPhoneStr.split(',').map(p => p.trim()) : [];
                
                const email = document.getElementById('m-parent-email').value;
                const occupation = document.getElementById('m-parent-job').value;
                const parentAddr = document.getElementById('m-parent-addr').value;

                const feeModel = document.getElementById('m-student-feemodel').value;
                const feeAmount = parseFloat(document.getElementById('m-student-feeamount').value);

                // Collect subjects checked
                const checkedBoxes = document.querySelectorAll('input[name="m-student-subjects"]:checked');
                const subjectIds = Array.from(checkedBoxes).map(cb => cb.value);

                const payload = {
                    full_name: name,
                    birth_date: dob ? new Date(dob).toISOString() : null,
                    gender,
                    address,
                    school,
                    grade,
                    phone,
                    notes,
                    fee_model: feeModel,
                    fee_amount: feeAmount,
                    subjects: subjectIds,
                    father_name: fatherName,
                    mother_name: motherName,
                    phones,
                    email,
                    parent_address: parentAddr,
                    occupation
                };

                try {
                    if (isEdit) {
                        await API.put(`/students/${studentId}`, payload);
                        showToast('Berhasil mengubah data murid');
                    } else {
                        await API.post('/students', payload);
                        showToast('Berhasil mendaftarkan murid baru');
                    }
                    destroy();
                    renderStudents(document.getElementById('app-content'));
                } catch (err) {
                    showToast(err.message, 'danger');
                }
            });

        } catch (e) {
            showToast('Gagal memuat formulir: ' + e.message, 'danger');
        }
    }

    function setupStudentTableListeners(students) {
        document.querySelectorAll('.btn-edit-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tr = e.target.closest('tr');
                const studentId = tr.getAttribute('data-student-id');
                openStudentModal(studentId);
            });
        });

        document.querySelectorAll('.btn-delete-student').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tr = e.target.closest('tr');
                const studentId = tr.getAttribute('data-student-id');
                const name = tr.querySelector('td').innerText;
                
                if (confirm(`Apakah Anda yakin ingin menghapus data murid '${name}'? Seluruh data jadwal, sesi dan laporan terkait juga akan ikut terhapus.`)) {
                    try {
                        await API.del(`/students/${studentId}`);
                        showToast('Data murid berhasil dihapus');
                        renderStudents(document.getElementById('app-content'));
                    } catch (err) {
                        showToast(err.message, 'danger');
                    }
                }
            });
        });
    }

    /* --------------------------------------------------------------------------
       MODAL: TAMBAH/EDIT MATA PELAJARAN
       -------------------------------------------------------------------------- */
    async function openSubjectModal(subjectId = null) {
        const isEdit = !!subjectId;
        let subjectName = '';

        if (isEdit) {
            try {
                const subjects = await API.get('/subjects');
                const match = subjects.find(s => s.id === subjectId);
                if (match) subjectName = match.name;
            } catch (e) {
                showToast(e.message, 'danger');
                return;
            }
        }

        const modalHtml = `
            <div class="modal-overlay" id="subject-modal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran'}</h3>
                        <button class="btn-close" id="close-subject-modal"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <form id="subject-form">
                        <div class="modal-body">
                            <div class="form-group" style="margin-bottom:0;">
                                <label>Nama Mata Pelajaran *</label>
                                <input type="text" id="m-subject-name" class="form-input form-input-no-icon" value="${subjectName}" required>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="btn-cancel-subject">Batal</button>
                            <button type="submit" class="btn btn-primary">Simpan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('subject-modal');
        const destroy = () => modal.remove();

        document.getElementById('close-subject-modal').addEventListener('click', destroy);
        document.getElementById('btn-cancel-subject').addEventListener('click', destroy);

        document.getElementById('subject-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('m-subject-name').value;

            try {
                if (isEdit) {
                    await API.put(`/subjects/${subjectId}`, { name });
                    showToast('Berhasil mengubah mata pelajaran');
                } else {
                    await API.post('/subjects', { name });
                    showToast('Berhasil menambahkan mata pelajaran baru');
                }
                destroy();
                renderSubjects(document.getElementById('app-content'));
            } catch (err) {
                showToast(err.message, 'danger');
            }
        });
    }

    function setupSubjectTableListeners(subjects) {
        document.querySelectorAll('.btn-edit-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tr = e.target.closest('tr');
                const id = tr.getAttribute('data-subject-id');
                openSubjectModal(id);
            });
        });

        document.querySelectorAll('.btn-delete-subject').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tr = e.target.closest('tr');
                const id = tr.getAttribute('data-subject-id');
                const name = tr.querySelector('td').innerText;

                if (confirm(`Hapus mata pelajaran '${name}'?`)) {
                    try {
                        await API.del(`/subjects/${id}`);
                        showToast('Berhasil menghapus mata pelajaran');
                        renderSubjects(document.getElementById('app-content'));
                    } catch (err) {
                        showToast(err.message, 'danger');
                    }
                }
            });
        });
    }

    /* --------------------------------------------------------------------------
       MODAL: TAMBAH/EDIT JADWAL RUTIN
       -------------------------------------------------------------------------- */
    async function openScheduleModal(scheduleId = null) {
        try {
            const [students, subjects] = await Promise.all([
                API.get('/students'),
                API.get('/subjects')
            ]);

            let schedule = null;
            if (scheduleId) {
                const schedules = await API.get('/schedules') || [];
                schedule = schedules.find(s => s.id === scheduleId);
            }

            const isEdit = !!schedule;

            const modalHtml = `
                <div class="modal-overlay" id="schedule-modal">
                    <div class="modal" style="max-width: 480px;">
                        <div class="modal-header">
                            <h3>${isEdit ? 'Ubah Jadwal Rutin' : 'Tambah Jadwal Rutin'}</h3>
                            <button class="btn-close" id="close-schedule-modal"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <form id="schedule-form">
                            <div class="modal-body">
                                <div class="form-group">
                                    <label>Pilih Murid *</label>
                                    <select id="m-sched-student" class="form-input form-input-no-icon" required>
                                        <option value="">-- Pilih Murid --</option>
                                        ${students.map(st => `<option value="${st.id}" ${schedule && schedule.student_id === st.id ? 'selected' : ''}>${st.full_name}</option>`).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Mata Pelajaran *</label>
                                    <select id="m-sched-subject" class="form-input form-input-no-icon" required>
                                        <option value="">-- Pilih Pelajaran --</option>
                                        ${subjects.map(su => `<option value="${su.id}" ${schedule && schedule.subject_id === su.id ? 'selected' : ''}>${su.name}</option>`).join('')}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>Hari Mengajar *</label>
                                    <select id="m-sched-day" class="form-input form-input-no-icon" required>
                                        <option value="1" ${schedule && schedule.day_of_week === 1 ? 'selected' : ''}>Senin</option>
                                        <option value="2" ${schedule && schedule.day_of_week === 2 ? 'selected' : ''}>Selasa</option>
                                        <option value="3" ${schedule && schedule.day_of_week === 3 ? 'selected' : ''}>Rabu</option>
                                        <option value="4" ${schedule && schedule.day_of_week === 4 ? 'selected' : ''}>Kamis</option>
                                        <option value="5" ${schedule && schedule.day_of_week === 5 ? 'selected' : ''}>Jumat</option>
                                        <option value="6" ${schedule && schedule.day_of_week === 6 ? 'selected' : ''}>Sabtu</option>
                                        <option value="0" ${schedule && schedule.day_of_week === 0 ? 'selected' : ''}>Minggu</option>
                                    </select>
                                </div>

                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Jam Mulai *</label>
                                        <input type="time" id="m-sched-start" class="form-input form-input-no-icon" value="${schedule ? schedule.start_time.substring(0,5) : '15:00'}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Jam Selesai *</label>
                                        <input type="time" id="m-sched-end" class="form-input form-input-no-icon" value="${schedule ? schedule.end_time.substring(0,5) : '16:30'}" required>
                                    </div>
                                </div>

                                ${isEdit ? `
                                <div class="form-group">
                                    <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
                                        <input type="checkbox" id="m-sched-active" ${schedule.is_active ? 'checked' : ''}> Jadwal Aktif
                                    </label>
                                </div>` : ''}
                            </div>
                            <div class="modal-footer">
                                ${isEdit ? `<button type="button" class="btn btn-danger" id="btn-delete-schedule" style="margin-right:auto;">Hapus</button>` : ''}
                                <button type="button" class="btn btn-secondary" id="btn-cancel-schedule">Batal</button>
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById('schedule-modal');
            const destroy = () => modal.remove();

            document.getElementById('close-schedule-modal').addEventListener('click', destroy);
            document.getElementById('btn-cancel-schedule').addEventListener('click', destroy);

            if (isEdit) {
                // Delete schedule inside modal
                document.getElementById('btn-delete-schedule').addEventListener('click', async () => {
                    if (confirm('Hapus jadwal rutin ini?')) {
                        try {
                            await API.del(`/schedules/${scheduleId}`);
                            showToast('Jadwal rutin dihapus');
                            destroy();
                            renderSchedules(document.getElementById('app-content'));
                        } catch (err) {
                            showToast(err.message, 'danger');
                        }
                    }
                });
            }

            // Submit form
            document.getElementById('schedule-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const studentId = document.getElementById('m-sched-student').value;
                const subjectId = document.getElementById('m-sched-subject').value;
                const dayOfWeek = parseInt(document.getElementById('m-sched-day').value);
                const startTime = document.getElementById('m-sched-start').value + ':00';
                const endTime = document.getElementById('m-sched-end').value + ':00';
                const isActive = isEdit ? document.getElementById('m-sched-active').checked : true;

                const payload = {
                    student_id: studentId,
                    subject_id: subjectId,
                    day_of_week: dayOfWeek,
                    start_time: startTime,
                    end_time: endTime,
                    is_active: isActive
                };

                try {
                    if (isEdit) {
                        await API.put(`/schedules/${scheduleId}`, payload);
                        showToast('Berhasil mengubah jadwal');
                    } else {
                        await API.post('/schedules', payload);
                        showToast('Berhasil menambahkan jadwal rutin baru');
                    }
                    destroy();
                    renderSchedules(document.getElementById('app-content'));
                } catch (err) {
                    showToast(err.message, 'danger');
                }
            });

        } catch (e) {
            showToast('Gagal memuat formulir: ' + e.message, 'danger');
        }
    }

    function setupCalendarListeners(schedules) {
        document.querySelectorAll('.calendar-slot-item').forEach(slot => {
            slot.addEventListener('click', () => {
                const schedId = slot.getAttribute('data-schedule-id');
                openScheduleModal(schedId);
            });
        });
    }

    /* --------------------------------------------------------------------------
       MODAL: GENERATE SESI DARI JADWAL RUTIN
       -------------------------------------------------------------------------- */
    function openGenerateSessionsModal() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Senin
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Minggu

        const modalHtml = `
            <div class="modal-overlay" id="generate-sessions-modal">
                <div class="modal" style="max-width: 440px;">
                    <div class="modal-header">
                        <h3>Generate Sesi Mengajar</h3>
                        <button class="btn-close" id="close-gen-modal"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <form id="generate-sessions-form">
                        <div class="modal-body">
                            <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:16px;">
                                Buat sesi mengajar otomatis untuk seluruh jadwal rutin Anda dalam rentang tanggal yang dipilih. Sistem akan mendeteksi hari dan jam secara otomatis.
                            </p>
                            <div class="form-group">
                                <label>Mulai Tanggal</label>
                                <input type="date" id="m-gen-start" class="form-input form-input-no-icon" value="${startOfWeek.toISOString().split('T')[0]}" required>
                            </div>
                            <div class="form-group">
                                <label>Hingga Tanggal</label>
                                <input type="date" id="m-gen-end" class="form-input form-input-no-icon" value="${endOfWeek.toISOString().split('T')[0]}" required>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="btn-cancel-gen">Batal</button>
                            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-gears"></i> Jalankan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('generate-sessions-modal');
        const destroy = () => modal.remove();

        document.getElementById('close-gen-modal').addEventListener('click', destroy);
        document.getElementById('btn-cancel-gen').addEventListener('click', destroy);

        document.getElementById('generate-sessions-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const start = document.getElementById('m-gen-start').value;
            const end = document.getElementById('m-gen-end').value;

            try {
                const res = await API.post('/sessions/generate', { start_date: start, end_date: end });
                showToast(`Berhasil generate ${res.generated_count} sesi mengajar baru.`);
                destroy();
                // Reload current view
                if (activePath === '/dashboard') renderDashboard(document.getElementById('app-content'));
                else if (activePath === '/sessions') renderSessions(document.getElementById('app-content'));
            } catch (err) {
                showToast(err.message, 'danger');
            }
        });
    }

    /* --------------------------------------------------------------------------
       MODAL: TAMBAH/EDIT SESI (AD-HOC ATAU UPDATE STATUS)
       -------------------------------------------------------------------------- */
    async function openSessionModal(sessionId = null) {
        try {
            const [students, allSessions] = await Promise.all([
                API.get('/students'),
                sessionId ? API.get('/sessions') : Promise.resolve([])
            ]);

            const session = sessionId ? allSessions.find(s => s.id === sessionId) : null;
            const isEdit = !!session;

            // Load subjects for the selected student dynamically if student changes
            let subjectsHtml = '';
            
            const renderSubjectsSelect = (studentId) => {
                const match = students.find(s => s.id === studentId);
                if (match && match.subjects) {
                    return match.subjects.map(su => `<option value="${su.id}" ${session && session.subject_id === su.id ? 'selected' : ''}>${su.name}</option>`).join('');
                }
                return '<option value="">-- Pilih Murid Terlebih Dahulu --</option>';
            };

            const modalHtml = `
                <div class="modal-overlay" id="session-modal">
                    <div class="modal" style="max-width: 460px;">
                        <div class="modal-header">
                            <h3>${isEdit ? 'Ubah Detail Sesi' : 'Tambah Sesi Mengajar Tambahan'}</h3>
                            <button class="btn-close" id="close-sess-modal"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <form id="session-form">
                            <div class="modal-body">
                                <div class="form-group">
                                    <label>Pilih Murid *</label>
                                    <select id="m-sess-student" class="form-input form-input-no-icon" required ${isEdit ? 'disabled' : ''}>
                                        <option value="">-- Pilih Murid --</option>
                                        ${students.map(st => `<option value="${st.id}" ${session && session.student_id === st.id ? 'selected' : ''}>${st.full_name}</option>`).join('')}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>Mata Pelajaran *</label>
                                    <select id="m-sess-subject" class="form-input form-input-no-icon" required ${isEdit ? 'disabled' : ''}>
                                        ${isEdit ? renderSubjectsSelect(session.student_id) : '<option value="">-- Pilih Murid Terlebih Dahulu --</option>'}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>Tanggal Sesi *</label>
                                    <input type="date" id="m-sess-date" class="form-input form-input-no-icon" value="${session ? session.session_date.split('T')[0] : new Date().toISOString().split('T')[0]}" required>
                                </div>

                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Jam Mulai *</label>
                                        <input type="time" id="m-sess-start" class="form-input form-input-no-icon" value="${session ? session.start_time.substring(0,5) : '16:00'}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Jam Selesai *</label>
                                        <input type="time" id="m-sess-end" class="form-input form-input-no-icon" value="${session ? session.end_time.substring(0,5) : '17:30'}" required>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Status Sesi</label>
                                    <select id="m-sess-status" class="form-input form-input-no-icon">
                                        <option value="completed" ${session && session.status === 'completed' ? 'selected' : ''}>Selesai (Completed)</option>
                                        <option value="cancelled" ${session && session.status === 'cancelled' ? 'selected' : ''}>Batal (Cancelled)</option>
                                        <option value="rescheduled" ${session && session.status === 'rescheduled' ? 'selected' : ''}>Reschedule</option>
                                    </select>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="btn-cancel-sess">Batal</button>
                                <button type="submit" class="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById('session-modal');
            const destroy = () => modal.remove();

            document.getElementById('close-sess-modal').addEventListener('click', destroy);
            document.getElementById('btn-cancel-sess').addEventListener('click', destroy);

            const studentSelect = document.getElementById('m-sess-student');
            const subjectSelect = document.getElementById('m-sess-subject');

            // Dyn change subjects select
            if (!isEdit) {
                studentSelect.addEventListener('change', (e) => {
                    subjectSelect.innerHTML = renderSubjectsSelect(e.target.value);
                });
            }

            // Submit
            document.getElementById('session-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const date = document.getElementById('m-sess-date').value;
                const start = document.getElementById('m-sess-start').value + ':00';
                const end = document.getElementById('m-sess-end').value + ':00';
                const status = document.getElementById('m-sess-status').value;

                const payload = {
                    session_date: new Date(date).toISOString(),
                    start_time: start,
                    end_time: end,
                    status
                };

                if (!isEdit) {
                    payload.student_id = studentSelect.value;
                    payload.subject_id = subjectSelect.value;
                }

                try {
                    if (isEdit) {
                        await API.put(`/sessions/${sessionId}`, payload);
                        showToast('Berhasil mengubah sesi');
                    } else {
                        await API.post('/sessions', payload);
                        showToast('Berhasil menambahkan sesi tambahan');
                    }
                    destroy();
                    // Refresh view
                    if (activePath === '/dashboard') renderDashboard(document.getElementById('app-content'));
                    else if (activePath === '/sessions') renderSessions(document.getElementById('app-content'));
                } catch (err) {
                    showToast(err.message, 'danger');
                }
            });

        } catch (e) {
            showToast('Gagal memuat formulir: ' + e.message, 'danger');
        }
    }

    function setupSessionRowListeners(sessions) {
        document.querySelectorAll('.btn-action-edit-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('[data-session-id]').getAttribute('data-session-id');
                openSessionModal(id);
            });
        });

        document.querySelectorAll('.btn-write-report').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('[data-session-id]').getAttribute('data-session-id');
                openReportModal(id);
            });
        });
    }

    function setupSessionTableListeners(sessions) {
        document.querySelectorAll('.btn-edit-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('tr').getAttribute('data-session-id');
                openSessionModal(id);
            });
        });

        document.querySelectorAll('.btn-delete-session').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tr = e.target.closest('tr');
                const id = tr.getAttribute('data-session-id');
                if (confirm('Hapus sesi mengajar ini? Laporan yang terkait juga akan dihapus.')) {
                    try {
                        await API.del(`/sessions/${id}`);
                        showToast('Sesi berhasil dihapus');
                        renderSessions(document.getElementById('app-content'));
                    } catch (err) {
                        showToast(err.message, 'danger');
                    }
                }
            });
        });

        document.querySelectorAll('.btn-write-report').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('tr').getAttribute('data-session-id');
                openReportModal(id);
            });
        });

        document.querySelectorAll('.btn-view-report').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('tr').getAttribute('data-session-id');
                openReportModal(id, true);
            });
        });
    }

    /* --------------------------------------------------------------------------
       MODAL: BUAT / EDIT / DOWNLOAD REPORT (DENGAN TANDA TANGAN CANVAS)
       -------------------------------------------------------------------------- */
    async function openReportModal(sessionId, viewMode = false) {
        try {
            // Find existing report if any
            let report = null;
            try {
                report = await API.get(`/reports/session/${sessionId}`);
            } catch (e) {
                // Not found, stays null
            }

            // Get session info for labels
            const allSessions = await API.get('/sessions');
            const session = allSessions.find(s => s.id === sessionId);
            if (!session) throw new Error('Session info not found');

            const isEdit = !!report;
            const dateStr = new Date(session.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            const modalHtml = `
                <div class="modal-overlay" id="report-modal">
                    <div class="modal" style="max-width: 600px;">
                        <div class="modal-header">
                            <h3>${viewMode ? 'Detail Laporan Hasil Belajar' : (isEdit ? 'Ubah Laporan Belajar' : 'Buat Laporan Hasil Belajar')}</h3>
                            <button class="btn-close" id="close-rep-modal"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <form id="report-form">
                            <div class="modal-body">
                                <div style="display:flex; justify-content:space-between; margin-bottom:20px; font-size:0.9rem; color:var(--text-secondary); background:var(--bg-app); padding:12px; border-radius:var(--radius-md);">
                                    <div><strong>Murid:</strong> ${session.student_name}</div>
                                    <div><strong>Mapel:</strong> ${session.subject_name}</div>
                                    <div><strong>Tanggal:</strong> ${dateStr}</div>
                                </div>

                                <div class="form-group">
                                    <label>Materi Pembelajaran yang Diajarkan *</label>
                                    <textarea id="m-rep-material" class="form-input form-input-no-icon" style="height:70px;" required ${viewMode ? 'disabled' : ''}>${report ? report.material_taught : ''}</textarea>
                                </div>

                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Skala Pemahaman Murid *</label>
                                        <select id="m-rep-score" class="form-input form-input-no-icon" required ${viewMode ? 'disabled' : ''}>
                                            <option value="5" ${report && report.comprehension_score === 5 ? 'selected' : ''}>5 (Sangat Paham)</option>
                                            <option value="4" ${report && report.comprehension_score === 4 ? 'selected' : ''}>4 (Paham)</option>
                                            <option value="3" ${report && report.comprehension_score === 3 ? 'selected' : ''}>3 (Cukup Paham)</option>
                                            <option value="2" ${report && report.comprehension_score === 2 ? 'selected' : ''}>2 (Kurang Paham)</option>
                                            <option value="1" ${report && report.comprehension_score === 1 ? 'selected' : ''}>1 (Belum Paham)</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Catatan Pemahaman</label>
                                        <input type="text" id="m-rep-compnotes" class="form-input form-input-no-icon" value="${report ? report.comprehension_notes : ''}" ${viewMode ? 'disabled' : ''}>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Tugas / Pekerjaan Rumah (PR) yang Diberikan</label>
                                    <textarea id="m-rep-hw" class="form-input form-input-no-icon" style="height:50px;" ${viewMode ? 'disabled' : ''}>${report ? report.homework : ''}</textarea>
                                </div>

                                <div class="form-group">
                                    <label>Catatan Perilaku & Sikap Murid</label>
                                    <input type="text" id="m-rep-behavior" class="form-input form-input-no-icon" value="${report ? report.behavior_notes : ''}" ${viewMode ? 'disabled' : ''}>
                                </div>

                                <div class="form-group">
                                    <label>Rekomendasi untuk Sesi Pembelajaran Berikutnya</label>
                                    <input type="text" id="m-rep-recs" class="form-input form-input-no-icon" value="${report ? report.recommendations : ''}" ${viewMode ? 'disabled' : ''}>
                                </div>

                                <!-- Signature Section -->
                                ${!viewMode ? `
                                <div class="form-group">
                                    <label>Tanda Tangan Guru les *</label>
                                    <div class="signature-section">
                                        <canvas id="teacher-signature-canvas" class="signature-canvas" width="530" height="150"></canvas>
                                        <div class="signature-controls">
                                            <button type="button" class="btn btn-secondary" id="btn-clear-sig" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-eraser"></i> Hapus</button>
                                        </div>
                                    </div>
                                </div>
                                ` : `
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:20px;">
                                    <div>
                                        <label style="font-weight:600; font-size:0.85rem;">Tanda Tangan Guru:</label>
                                        <div style="border:1px solid var(--border-color); background:#ffffff; text-align:center; padding:10px; border-radius:var(--radius-md);">
                                            <img src="${report.teacher_signature}" style="max-height:80px; max-width:100%;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-weight:600; font-size:0.85rem;">Tanda Tangan Orangtua:</label>
                                        <div style="border:1px solid var(--border-color); background:#ffffff; text-align:center; padding:10px; border-radius:var(--radius-md); min-height:102px; display:flex; align-items:center; justify-content:center;">
                                            ${report.parent_signature ? `<img src="${report.parent_signature}" style="max-height:80px; max-width:100%;">` : '<span style="color:var(--text-tertiary); font-size:0.8rem;">Belum ditandatangani</span>'}
                                        </div>
                                    </div>
                                </div>
                                `}
                            </div>
                            <div class="modal-footer">
                                ${viewMode ? `
                                    <button type="button" class="btn btn-secondary" id="btn-copy-report-text" style="margin-right:auto;"><i class="fa-solid fa-copy"></i> Salin Teks</button>
                                    <button type="button" class="btn btn-primary" id="btn-download-pdf-report"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
                                    <button type="button" class="btn btn-secondary" id="btn-close-view-rep">Tutup</button>
                                ` : `
                                    <button type="button" class="btn btn-secondary" id="btn-cancel-rep">Batal</button>
                                    <button type="submit" class="btn btn-primary">Simpan Laporan</button>
                                `}
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById('report-modal');
            const destroy = () => modal.remove();

            document.getElementById('close-rep-modal').addEventListener('click', destroy);

            if (viewMode) {
                document.getElementById('btn-close-view-rep').addEventListener('click', destroy);
                
                // Copy text helper
                document.getElementById('btn-copy-report-text').addEventListener('click', () => {
                    const stars = '★'.repeat(report.comprehension_score) + '☆'.repeat(5 - report.comprehension_score);
                    const reportText = `LAPORAN LES PRIVAT
Nama Siswa: ${report.student_name}
Mata Pelajaran: ${report.subject_name}
Tanggal Sesi: ${dateStr}
Waktu Sesi: ${session.start_time.substring(0,5)} - ${session.end_time.substring(0,5)}

1. Materi yang Diajarkan:
${report.material_taught}

2. Pemahaman Murid:
${report.comprehension_score}/5 (${stars})
Catatan: ${report.comprehension_notes || '-'}

3. Tugas/PR Diberikan:
${report.homework || '-'}

4. Sikap & Perilaku:
${report.behavior_notes || '-'}

5. Rekomendasi Selanjutnya:
${report.recommendations || '-'}
`;
                    navigator.clipboard.writeText(reportText).then(() => {
                        showToast('Teks laporan berhasil disalin ke clipboard');
                    }).catch(err => {
                        showToast('Gagal menyalin teks: ' + err.message, 'danger');
                    });
                });

                // Download PDF
                document.getElementById('btn-download-pdf-report').addEventListener('click', async () => {
                    try {
                        const blob = await API.get(`/reports/${report.id}/pdf`);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Laporan-${report.student_name}-${session.session_date.split('T')[0]}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                        showToast('File PDF berhasil didownload.');
                    } catch (e) {
                        showToast('Gagal mengunduh PDF: ' + e.message, 'danger');
                    }
                });
                
            } else {
                document.getElementById('btn-cancel-rep').addEventListener('click', destroy);

                // Init signature pad drawing
                const canvas = document.getElementById('teacher-signature-canvas');
                const clearBtn = document.getElementById('btn-clear-sig');
                const ctx = canvas.getContext('2d');
                let drawing = false;

                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';

                const getMousePos = (e) => {
                    const rect = canvas.getBoundingClientRect();
                    return {
                        x: (e.clientX || e.touches[0].clientX) - rect.left,
                        y: (e.clientY || e.touches[0].clientY) - rect.top
                    };
                };

                const startDrawing = (e) => {
                    drawing = true;
                    const pos = getMousePos(e);
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y);
                };

                const draw = (e) => {
                    if (!drawing) return;
                    e.preventDefault();
                    const pos = getMousePos(e);
                    ctx.lineTo(pos.x, pos.y);
                    ctx.stroke();
                };

                const stopDrawing = () => { drawing = false; };

                canvas.addEventListener('mousedown', startDrawing);
                canvas.addEventListener('mousemove', draw);
                canvas.addEventListener('mouseup', stopDrawing);
                canvas.addEventListener('mouseleave', stopDrawing);

                canvas.addEventListener('touchstart', startDrawing);
                canvas.addEventListener('touchmove', draw);
                canvas.addEventListener('touchend', stopDrawing);

                clearBtn.addEventListener('click', () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                });

                // Load existing signature on edit if exists
                if (isEdit && report.teacher_signature) {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = report.teacher_signature;
                }

                // Submit Form
                document.getElementById('report-form').addEventListener('submit', async (e) => {
                    e.preventDefault();

                    // Convert signature canvas to base64
                    // Check if signature is blank
                    const isBlank = () => {
                        const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
                        return !buffer.some(color => color !== 0);
                    };

                    if (isBlank() && (!isEdit || !report.teacher_signature)) {
                        alert('Silakan berikan tanda tangan guru terlebih dahulu.');
                        return;
                    }

                    const teacherSigBase64 = canvas.toDataURL('image/png');

                    const material = document.getElementById('m-rep-material').value;
                    const score = parseInt(document.getElementById('m-rep-score').value);
                    const compNotes = document.getElementById('m-rep-compnotes').value;
                    const hw = document.getElementById('m-rep-hw').value;
                    const behavior = document.getElementById('m-rep-behavior').value;
                    const recs = document.getElementById('m-rep-recs').value;

                    const payload = {
                        session_id: sessionId,
                        material_taught: material,
                        comprehension_score: score,
                        comprehension_notes: compNotes,
                        homework: hw,
                        behavior_notes: behavior,
                        recommendations: recs,
                        teacher_signature: teacherSigBase64
                    };

                    try {
                        if (isEdit) {
                            await API.put(`/reports/${report.id}`, payload);
                            showToast('Laporan hasil belajar berhasil diperbarui');
                        } else {
                            await API.post('/reports', payload);
                            showToast('Laporan hasil belajar berhasil dibuat');
                        }
                        destroy();
                        // Reload current view
                        if (activePath === '/dashboard') renderDashboard(document.getElementById('app-content'));
                        else if (activePath === '/sessions') renderSessions(document.getElementById('app-content'));
                    } catch (err) {
                        showToast(err.message, 'danger');
                    }
                });
            }

        } catch (e) {
            showToast('Gagal memuat detail laporan: ' + e.message, 'danger');
        }
    }

    return {
        init
    };
})();

// Start App when elements ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
