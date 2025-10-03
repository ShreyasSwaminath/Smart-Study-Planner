// Authentication State Management
let currentUser = null;
let users = JSON.parse(localStorage.getItem('studyPlannerUsers')) || {};

// DOM Elements
const loginPage = document.getElementById('login-page');
const registerPage = document.getElementById('register-page');
const mainApp = document.getElementById('main-app');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');

const displayUserName = document.getElementById('display-user-name');
const displayUserEmail = document.getElementById('display-user-email');

// Navigation Elements
const navLinks = document.querySelectorAll('.nav-link');
const pageContents = document.querySelectorAll('.page-content');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');

// Main App DOM Elements
const taskForm = document.getElementById('task-form');
const tasksContainer = document.getElementById('tasks-container');
const recentTasksContainer = document.getElementById('recent-tasks-container');
const totalTasksEl = document.getElementById('total-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');

// Study Planning Elements
const studySessionForm = document.getElementById('study-session-form');
const weeklyPlanContainer = document.getElementById('weekly-plan-container');
const todayPlanContainer = document.getElementById('today-plan-container');

// Timer Elements
const quickTimerDisplay = document.getElementById('quick-timer-display');
const mainTimerDisplay = document.getElementById('main-timer-display');
const quickStartBtn = document.getElementById('quick-start-timer');
const quickPauseBtn = document.getElementById('quick-pause-timer');
const quickResetBtn = document.getElementById('quick-reset-timer');
const mainStartBtn = document.getElementById('main-start-timer');
const mainPauseBtn = document.getElementById('main-pause-timer');
const mainResetBtn = document.getElementById('main-reset-timer');
const timerSession = document.getElementById('timer-session');
const presetBtns = document.querySelectorAll('.preset-btn');
const saveTimerSettings = document.getElementById('save-timer-settings');
const addTaskBtn = document.getElementById('add-task-btn');
const addStudyBtn = document.getElementById('add-study-btn');

// Constants
const CONSTANTS = {
    DEFAULT_FOCUS_DURATION: 25,
    DEFAULT_BREAK_DURATION: 5,
    DEFAULT_LONG_BREAK_DURATION: 15,
    DEFAULT_TOTAL_SESSIONS: 4,
    MIN_PASSWORD_LENGTH: 6,
    NOTIFICATION_DURATION: 3000,
    TIMER_UPDATE_INTERVAL: 100,
    ALARM_REPEAT_INTERVAL: 2000,
    MAX_RECENT_ITEMS: 5,
    MAX_WEEKLY_SESSIONS: 7
};

// Initialize data arrays
let tasks = [];
let studySessions = [];
let studyItems = [];
let focusHistory = [];
let longestStreakDays = 0;
let timer = {
    isRunning: false,
    timeLeft: CONSTANTS.DEFAULT_FOCUS_DURATION * 60,
    isBreak: false,
    sessionsCompleted: 0,
    totalSessions: CONSTANTS.DEFAULT_TOTAL_SESSIONS,
    focusDuration: CONSTANTS.DEFAULT_FOCUS_DURATION,
    breakDuration: CONSTANTS.DEFAULT_BREAK_DURATION,
    longBreakDuration: CONSTANTS.DEFAULT_LONG_BREAK_DURATION
};

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Set minimum dates to today
const now = new Date();
const today = now.toISOString().split('T')[0];
const localToday = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

// Initialize date fields safely
try {
    const taskDueDateEl = document.getElementById('task-due-date');
    const studyDateEl = document.getElementById('study-date');
    if (taskDueDateEl) {
        taskDueDateEl.min = localToday;
        taskDueDateEl.value = localToday;
    }
    if (studyDateEl) {
        studyDateEl.min = localToday;
        studyDateEl.value = localToday;
    }
} catch (error) {
    console.warn('Date field initialization failed:', error.message);
}

// Event Listeners for Authentication
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showAuthPage('register');
});
showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showAuthPage('login');
});
logoutBtn.addEventListener('click', handleLogout);

// Event Listeners for Navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        switchPage(page);
        if (sidebar) { sidebar.style.transform = 'translateX(-100%)'; }
    });
});

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        if (!sidebar) return;
        const isOpen = sidebar.style.transform === 'translateX(0px)' || sidebar.style.transform === 'translateX(0)';
        sidebar.style.transform = isOpen ? 'translateX(-100%)' : 'translateX(0)';
    });
}
if (sidebarClose) {
    sidebarClose.addEventListener('click', () => {
        if (!sidebar) return;
        sidebar.style.transform = 'translateX(-100%)';
    });
}

// Event Listeners for Main App
taskForm.addEventListener('submit', addTask);
studySessionForm.addEventListener('submit', addStudySession);

// Timer Event Listeners
quickStartBtn.addEventListener('click', () => {
    if (timer.isRunning) {
        pauseTimer('quick');
    } else {
        startTimer('quick');
    }
});
if (quickPauseBtn) quickPauseBtn.style.display = 'none';
quickResetBtn.addEventListener('click', () => resetTimer('quick'));
mainStartBtn.addEventListener('click', () => {
    if (timer.isRunning) {
        pauseTimer('main');
    } else {
        startTimer('main');
    }
});
if (mainPauseBtn) mainPauseBtn.style.display = 'none';
mainResetBtn.addEventListener('click', () => resetTimer('main'));

presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const minutes = parseInt(e.target.getAttribute('data-minutes'));
        setTimer(minutes);
    });
});

saveTimerSettings.addEventListener('click', saveTimerSettingsHandler);

if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addQuickTask);
}
if (addStudyBtn) {
    addStudyBtn.addEventListener('click', addQuickStudyItem);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('ssp-theme');
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-mode');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }

    // Load user session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        initializeApp();
        showAuthPage('main');
    } else {
        showAuthPage('login');

        // Ensure all page contents are hidden on login page
        pageContents.forEach(content => {
            content.style.display = 'none';
        });
    }
});

// Authentication Functions
function handleLogin(e) {
    e.preventDefault();

    try {
        const email = document.getElementById('login-email')?.value?.trim();
        const password = document.getElementById('login-password')?.value;

        resetErrors('login');

        if (!validateLoginInput(email, password)) return;

        if (users[email]) {
            if (users[email].password === password) {
                currentUser = { email, name: users[email].name };
                safeLocalStorageSet('currentUser', JSON.stringify(currentUser));
                initializeApp();
                showNotification('Welcome back!', 'success');
            } else {
                showError('login-password-error', 'Invalid password');
            }
        } else {
            showError('login-email-error', 'No account found with this email');
        }
    } catch (error) {
        showError('login-email-error', 'Login failed. Please try again.');
    }
}

function validateLoginInput(email, password) {
    let isValid = true;

    if (!email || !isValidEmail(email)) {
        showError('login-email-error', 'Please enter a valid email');
        isValid = false;
    }

    if (!password || password.length < 1) {
        showError('login-password-error', 'Password is required');
        isValid = false;
    }

    return isValid;
}

function handleRegister(e) {
    e.preventDefault();

    try {
        const formData = {
            name: document.getElementById('register-name')?.value?.trim(),
            email: document.getElementById('register-email')?.value?.trim(),
            password: document.getElementById('register-password')?.value,
            confirmPassword: document.getElementById('register-confirm-password')?.value
        };

        resetErrors('register');

        if (!validateRegisterInput(formData)) return;

        users[formData.email] = {
            name: formData.name,
            password: hashPassword(formData.password),
            createdAt: new Date().toISOString()
        };

        safeLocalStorageSet('studyPlannerUsers', JSON.stringify(users));

        currentUser = { email: formData.email, name: formData.name };
        safeLocalStorageSet('currentUser', JSON.stringify(currentUser));

        initializeApp();
        showNotification('Account created successfully!', 'success');
    } catch (error) {
        showError('register-email-error', 'Registration failed. Please try again.');
    }
}

function validateRegisterInput({ name, email, password, confirmPassword }) {
    let isValid = true;

    if (!name || name.length < 2) {
        showError('register-name-error', 'Name must be at least 2 characters');
        isValid = false;
    }

    if (!email || !isValidEmail(email)) {
        showError('register-email-error', 'Please enter a valid email');
        isValid = false;
    } else if (users[email]) {
        showError('register-email-error', 'An account with this email already exists');
        isValid = false;
    }

    if (!password || password.length < CONSTANTS.MIN_PASSWORD_LENGTH) {
        showError('register-password-error', `Password must be at least ${CONSTANTS.MIN_PASSWORD_LENGTH} characters`);
        isValid = false;
    }

    if (!confirmPassword || password !== confirmPassword) {
        showError('register-confirm-password-error', 'Passwords do not match');
        isValid = false;
    }

    return isValid;
}

// Simple password hashing (basic security improvement)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Safe localStorage operations
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn('LocalStorage operation failed:', error.message);
        showNotification('Storage error. Some data may not be saved.', 'warning');
    }
}

function safeLocalStorageGet(key, defaultValue = null) {
    try {
        return localStorage.getItem(key) || defaultValue;
    } catch (error) {
        console.warn('LocalStorage read failed:', error.message);
        return defaultValue;
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthPage('login');
    showNotification('Logged out successfully', 'success');
}

function showAuthPage(page) {
    if (page === 'login') {
        loginPage.style.display = 'flex';
        registerPage.style.display = 'none';
        mainApp.style.display = 'none';

        // Also hide all page contents to prevent any visibility issues
        pageContents.forEach(content => {
            content.style.display = 'none';
        });
    } else if (page === 'register') {
        loginPage.style.display = 'none';
        registerPage.style.display = 'flex';
        mainApp.style.display = 'none';

        // Also hide all page contents to prevent any visibility issues
        pageContents.forEach(content => {
            content.style.display = 'none';
        });
    } else if (page === 'main') {
        loginPage.style.display = 'none';
        registerPage.style.display = 'none';
        mainApp.style.display = 'block';

        // Show the active page content
        pageContents.forEach(content => {
            if (content.classList.contains('active')) {
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        });
    }
}

function resetErrors(formType) {
    const errors = document.querySelectorAll(`#${formType}-form .error-message`);
    errors.forEach(error => {
        error.style.display = 'none';
        error.textContent = '';
    });
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

// Navigation Functions
function switchPage(page) {
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    pageContents.forEach(content => {
        if (content.id === `${page}-page`) {
            content.classList.add('active');
            content.style.display = 'block'; // Ensure it's visible
        } else {
            content.classList.remove('active');
            content.style.display = 'none'; // Hide others
        }
    });

    if (page === 'study-planning') {
        renderStudyPlanning();
    } else if (page === 'history') {
        renderHistory();
    }

    if (sidebar) { sidebar.style.transform = 'translateX(-100%)'; }
}

function initializeTimerSettings() {
    const timerSettings = JSON.parse(localStorage.getItem(`timerSettings_${currentUser.email}`)) || {};

    if (timerSettings.focusDuration) {
        timer.focusDuration = timerSettings.focusDuration;
        timer.breakDuration = timerSettings.breakDuration;
        timer.longBreakDuration = timerSettings.longBreakDuration;
        timer.totalSessions = timerSettings.totalSessions || 4;

        document.getElementById('focus-duration').value = timer.focusDuration;
        document.getElementById('break-duration').value = timer.breakDuration;
        document.getElementById('long-break-duration').value = timer.longBreakDuration;
        document.getElementById('sessions-before-long-break').value = timer.totalSessions;

        setTimer(timer.focusDuration);
        timerSession.textContent = `Session 1 of ${timer.totalSessions}`;
    }
}

function initializeApp() {
    try {
        showAuthPage('main');

        if (displayUserName) displayUserName.textContent = currentUser.name;
        if (displayUserEmail) displayUserEmail.textContent = currentUser.email;

        loadUserData();
        initializeTimerSettings();
        renderAllViews();
        checkReminders();
    } catch (error) {
        console.warn('App initialization failed:', error.message);
        showNotification('Failed to load app data', 'error');
    }
}

function loadUserData() {
    try {
        tasks = JSON.parse(safeLocalStorageGet(`studyTasks_${currentUser.email}`, '[]'));
        studySessions = JSON.parse(safeLocalStorageGet(`studySessions_${currentUser.email}`, '[]'));
        studyItems = JSON.parse(safeLocalStorageGet(`studyItems_${currentUser.email}`, '[]'));
        focusHistory = JSON.parse(safeLocalStorageGet(`focusHistory_${currentUser.email}`, '[]'));
    } catch (error) {
        console.warn('Failed to load user data:', error.message);
        tasks = [];
        studySessions = [];
        studyItems = [];
        focusHistory = [];
    }
}

function renderAllViews() {
    renderDashboard();
    renderTasks();
    renderStudyPlanning();
}

// Task Management Functions
function addTask(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value;
    const subject = document.getElementById('task-subject').value;
    const dueDate = document.getElementById('task-due-date').value;
    const priority = document.getElementById('task-priority').value;
    const description = document.getElementById('task-description').value;

    const newTask = {
        id: Date.now().toString(),
        title,
        subject,
        dueDate,
        priority,
        description,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
    renderDashboard();
    showNotification('Task added successfully!', 'success');

    taskForm.reset();
    document.getElementById('task-due-date').min = localToday;
    document.getElementById('task-due-date').value = localToday;
}

// ...existing code...

// Archive task (soft delete - moves to history)
function deleteTask(id) {
    try {
        const task = tasks.find(t => t.id === id);
        if (!task) {
            showNotification('Task not found!', 'error');
            return;
        }

        if (confirm('Remove this task from active list? It will remain in your History.')) {
            tasks = tasks.map(t =>
                t.id === id ? {
                    ...t,
                    archived: true,
                    completed: true,
                    completedAt: new Date().toISOString()
                } : t
            );

            saveTasks();
            renderAllViews();
            renderHistory();
            showNotification('Task moved to History!', 'success');
        }
    } catch (error) {
        console.warn('Error deleting task:', error.message);
        showNotification('Failed to delete task', 'error');
    }
}

// Hard delete (permanent removal)
function hardDeleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
    renderDashboard();
    renderHistory();
    showNotification('Task deleted permanently!', 'warning');
}

// ...existing code...


function toggleComplete(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            const updatedTask = { ...task, completed: !task.completed };
            if (updatedTask.completed && !task.completed) {
                updatedTask.completedAt = new Date().toISOString();
            }
            return updatedTask;
        }
        return task;
    });

    saveTasks();
    renderTasks();
    renderDashboard();
    showNotification('Task status updated!', 'success');
}

function saveTasks() {
    localStorage.setItem(`studyTasks_${currentUser.email}`, JSON.stringify(tasks));
}

function renderTasks() {
    const activeTasks = tasks.filter(task => !task.archived);

    if (activeTasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>No tasks yet</h3>
                <p>Add your first study task to get started!</p>
            </div>
        `;
        return;
    }

    const sortedTasks = [...activeTasks].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    tasksContainer.innerHTML = sortedTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <span class="task-priority priority-${task.priority}">${task.priority.toUpperCase()}</span>
            </div>
            <p>${task.description || 'No description provided.'}</p>
            <div class="task-details">
                <span><i class="fas fa-book"></i> ${task.subject}</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}</span>
            </div>
            <div class="task-actions">
                <button class="${task.completed ? 'secondary' : 'success'}" onclick="toggleComplete('${task.id}')">
                    <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i> 
                    ${task.completed ? 'Mark Incomplete' : 'Mark Complete'}
                </button>
                <button class="warning" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i> ${task.completed ? 'Remove' : 'Delete'}
                </button>
            </div>
        </div>
    `).join('');
}

// Study Planning Functions
function addStudySession(e) {
    e.preventDefault();

    const subject = document.getElementById('study-subject').value;
    const date = document.getElementById('study-date').value;
    const time = document.getElementById('study-time').value;
    const duration = document.getElementById('study-duration').value;
    const topic = document.getElementById('study-topic').value;

    const newSession = {
        id: Date.now().toString(),
        subject,
        date,
        time,
        duration: parseInt(duration),
        topic,
        completed: false,
        createdAt: new Date().toISOString()
    };

    studySessions.push(newSession);
    saveStudySessions();
    renderStudyPlanning();
    renderDashboard();
    showNotification('Study session added successfully!', 'success');

    studySessionForm.reset();
    document.getElementById('study-date').min = localToday;
    document.getElementById('study-date').value = localToday;
}

function saveStudySessions() {
    localStorage.setItem(`studySessions_${currentUser.email}`, JSON.stringify(studySessions));
}

function saveStudyItems() {
    localStorage.setItem(`studyItems_${currentUser.email}`, JSON.stringify(studyItems));
}

function toggleStudySessionComplete(id) {
    studySessions = studySessions.map(s => s.id === id ? { ...s, completed: !s.completed, completedAt: !s.completed ? new Date().toISOString() : undefined } : s);
    saveStudySessions();
    renderStudyPlanning();
    renderDashboard();
    showNotification('Study session status updated!', 'success');
}

function toggleStudyItemComplete(id) {
    studyItems = studyItems.map(i => i.id === id ? { ...i, completed: !i.completed, completedAt: !i.completed ? new Date().toISOString() : undefined } : i);
    saveStudyItems();
    renderStudyPlanning();
    renderDashboard();
    showNotification('Study item status updated!', 'success');
}

function removeStudySession(id) {
    try {
        const session = studySessions.find(s => s.id === id);
        if (!session) {
            showNotification('Session not found!', 'error');
            return;
        }

        if (confirm('Remove this session from Study Plan? It will remain in your History.')) {
            studySessions = studySessions.map(s =>
                s.id === id ? {
                    ...s,
                    archived: true,
                    completed: true,
                    completedAt: new Date().toISOString()
                } : s
            );

            saveStudySessions();
            renderAllViews();
            renderHistory();
            showNotification('Session moved to History!', 'success');
        }
    } catch (error) {
        console.warn('Error removing session:', error.message);
        showNotification('Failed to remove session', 'error');
    }
}

function removeStudyItem(id) {
    studyItems = studyItems.filter(i => i.id !== id);
    saveStudyItems();
    renderStudyPlanning();
    renderDashboard();
    showNotification('Study item removed', 'warning');
}

function addQuickTask() {
    const titleEl = document.getElementById('quick-task-title');
    const dateEl = document.getElementById('quick-task-date');
    const priorityEl = document.getElementById('quick-task-priority');
    if (!titleEl || !dateEl || !priorityEl) return;
    const title = titleEl.value;
    const dueDate = dateEl.value;
    const priority = priorityEl.value || 'medium';
    if (!title) { alert('Please enter a task title'); return; }
    const newTask = {
        id: Date.now().toString(),
        title,
        subject: 'General',
        dueDate,
        priority,
        description: '',
        completed: false,
        createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    saveTasks();
    renderTasks();
    renderDashboard();
    showNotification('Task added successfully!', 'success');
    titleEl.value = '';
    if (dateEl) dateEl.value = localToday;
    if (priorityEl) priorityEl.value = 'medium';
}

function addQuickStudyItem() {
    const titleEl = document.getElementById('study-title');
    const timeEl = document.getElementById('study-time-quick');
    const durationEl = document.getElementById('study-duration-quick');
    const priorityEl = document.getElementById('study-priority');
    if (!titleEl || !timeEl || !durationEl || !priorityEl) return;
    const title = titleEl.value;
    const time = timeEl.value;
    const duration = durationEl.value;
    const priority = priorityEl.value || 'medium';
    if (!title || !time || !duration) { alert('Please fill all study item fields'); return; }
    const newStudyItem = {
        id: Date.now().toString(),
        title,
        time,
        duration,
        priority,
        createdAt: new Date().toISOString()
    };
    studyItems.push(newStudyItem);
    saveStudyItems();
    renderStudyPlanning();
    renderDashboard();
    showNotification('Study item added successfully!', 'success');
    titleEl.value = '';
    timeEl.value = '';
    durationEl.value = '';
    priorityEl.value = 'medium';
}

function renderStudyPlanning() {
    if (studySessions.length === 0) {
        weeklyPlanContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar"></i>
                <h3>No study sessions planned</h3>
                <p>Add your first study session to see your weekly plan</p>
            </div>
        `;
    } else {
        const sessionsByDate = {};
        studySessions
            .filter(session => !session.archived)
            .forEach(session => {
                if (!sessionsByDate[session.date]) {
                    sessionsByDate[session.date] = [];
                }
                sessionsByDate[session.date].push(session);
            });

        weeklyPlanContainer.innerHTML = Object.keys(sessionsByDate)
            .sort()
            .slice(0, 7)
            .map(date => `
                <div class="study-plan-item">
                    <div class="study-time">${formatDate(date)}</div>
                    ${sessionsByDate[date].map(session => `
                        <div class="study-subject ${session.completed ? 'completed' : ''}">
                            <strong>${session.time}</strong> - ${session.subject} (${session.duration}min)
                            ${session.topic ? `<br><small>${session.topic}</small>` : ''}
                            <div class="task-actions" style="margin-top:8px; display:flex; gap:10px;">
                                <button class="${session.completed ? 'secondary' : 'success'}" onclick="toggleStudySessionComplete('${session.id}')">
                                    <i class="fas fa-${session.completed ? 'undo' : 'check'}"></i> ${session.completed ? 'Mark Incomplete' : 'Mark Complete'}
                                </button>
                                <button class="warning" onclick="removeStudySession('${session.id}')">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('');
    }
}

// Dashboard Functions
function renderDashboard() {
    updateStats();
    renderRecentTasks();
    renderTodayPlan();

    const activeTasks = tasks.filter(task => !task.archived);
    const totalTasks = activeTasks.length;
    const completedTasks = activeTasks.filter(task => task.completed).length;

    const activeSessions = studySessions.filter(session => !session.archived);
    const totalSessions = activeSessions.length;
    const completedSessions = activeSessions.filter(session => session.completed).length;

    const totalItems = totalTasks + totalSessions;
    const completedItems = completedTasks + completedSessions;

    document.getElementById('total-tasks').textContent = totalItems;
    document.getElementById('completed-tasks').textContent = completedItems;

    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    document.getElementById('progress-fill').style.width = progressPercent + '%';
    document.getElementById('progress-percent').textContent = progressPercent + '%';
}

function updateStats() {
    const totalTasksCount = tasks.length + studySessions.length;
    const completedTasksCount = tasks.filter(task => task.completed).length +
        studySessions.filter(session => session.completed).length;
    const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    totalTasksEl.textContent = totalTasksCount;
    completedTasksEl.textContent = completedTasksCount;
    progressFill.style.width = `${completionRate}%`;
    progressPercent.textContent = `${completionRate}%`;
}

function renderRecentTasks() {
    const items = [
        ...tasks.filter(task => !task.archived).map(task => ({ ...task, type: 'task' })),
        ...(Array.isArray(studyItems) ? studyItems.map(item => ({ ...item, type: 'study' })) : [])
    ];
    const recentItems = items
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);

    if (recentItems.length === 0) {
        recentTasksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No tasks yet</h3>
                <p>Add your first study task to get started!</p>
            </div>
        `;
        return;
    }

    recentTasksContainer.innerHTML = recentItems.map(item => {
        if (item.type === 'task') {
            return `
                <div class="task-item ${item.completed ? 'completed' : ''}">
                    <div class="task-header">
                        <div class="task-title">${item.title}</div>
                        <span class="task-priority priority-${item.priority}">${item.priority.toUpperCase()}</span>
                    </div>
                    <div class="task-details">
                        <span><i class="fas fa-book"></i> ${item.subject}</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(item.dueDate)}</span>
                    </div>
                    <div class="task-actions" style="margin-top:8px; display:flex; gap:10px;">
                        <button class="${item.completed ? 'secondary' : 'success'}" onclick="toggleComplete('${item.id}')">
                            <i class="fas fa-${item.completed ? 'undo' : 'check'}"></i> ${item.completed ? 'Mark Incomplete' : 'Mark Complete'}
                        </button>
                        ${item.completed ? `<button class="warning" onclick="deleteTask('${item.id}')"><i class="fas fa-trash"></i> Remove</button>` : ''}
                    </div>
                </div>
            `;
        }
        return `
            <div class="study-item ${item.completed ? 'completed' : ''}">
                <div class="study-time">${item.time || ''}</div>
                <div class="study-content">
                    <div class="study-title">${item.title}</div>
                    <div class="study-duration">${item.duration}</div>
                </div>
                <div class="task-priority priority-${item.priority}">${item.priority.toUpperCase()}</div>
                <div class="task-actions" style="margin-left:auto; display:flex; gap:10px;">
                    <button class="${item.completed ? 'secondary' : 'success'}" onclick="toggleStudyItemComplete('${item.id}')">
                        <i class="fas fa-${item.completed ? 'undo' : 'check'}"></i> ${item.completed ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                    ${item.completed ? `<button class="warning" onclick="removeStudyItem('${item.id}')"><i class="fas fa-trash"></i> Remove</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderTodayPlan() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    console.log('Current date:', todayStr);
    console.log('All study sessions:', studySessions);
    console.log('All tasks:', tasks);

    const todaySessions = studySessions.filter(session => {
        if (!session.date || session.archived) return false;

        const sessionDate = session.date.split('T')[0];
        const isToday = sessionDate === todayStr ||
            session.date === todayStr ||
            new Date(session.date).toDateString() === now.toDateString();

        console.log(`Session ${session.subject}: ${session.date} -> ${isToday}`);
        return isToday;
    });

    const todayTasks = tasks.filter(task => {
        if (!task.dueDate) return false;

        const taskDate = task.dueDate.split('T')[0];
        const isToday = taskDate === todayStr ||
            task.dueDate === todayStr ||
            new Date(task.dueDate).toDateString() === now.toDateString();

        return isToday && !task.completed;
    });

    const weekStart = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(weekStart.getDate() + 6);

    const thisWeekSessions = studySessions.filter(session => {
        if (!session.date || session.archived) return false;

        const sessionDate = new Date(session.date);
        const isAlreadyInToday = todaySessions.some(todaySession => todaySession.id === session.id);

        return sessionDate >= weekStart && sessionDate <= weekEnd && !isAlreadyInToday;
    });

    console.log('Today sessions found:', todaySessions);
    console.log('Today tasks found:', todayTasks);
    console.log('This week sessions found:', thisWeekSessions);

    if (todaySessions.length === 0 && todayTasks.length === 0 && thisWeekSessions.length === 0) {
        document.getElementById('today-plan-container').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar"></i>
                <h3>No plan for today or this week</h3>
                <p>Add study sessions or tasks to get started</p>
            </div>
        `;
        return;
    }

    let html = '';

    if (todaySessions.length > 0) {
        html += '<h4 style="color: var(--primary); margin-bottom: 10px; margin-top: 20px;"><i class="fas fa-calendar"></i> Study Sessions</h4>';
        html += todaySessions.map(session => `
            <div class="study-plan-item ${session.completed ? 'completed' : ''}">
                <div class="study-time">${session.time || 'No time set'}</div>
                <div class="study-subject">
                    <strong>${session.subject}</strong> (${session.duration}min)
                    ${session.topic ? `<br><small>${session.topic}</small>` : ''}
                    <div class="task-actions" style="margin-top:8px; display:flex; gap:10px;">
                        <button class="${session.completed ? 'secondary' : 'success'}" onclick="toggleStudySessionComplete('${session.id}')">
                            <i class="fas fa-${session.completed ? 'undo' : 'check'}"></i> ${session.completed ? 'Mark Incomplete' : 'Mark Complete'}
                        </button>
                        <button class="warning" onclick="removeStudySession('${session.id}')"><i class="fas fa-trash"></i> Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (thisWeekSessions.length > 0) {
        html += '<h4 style="color: var(--primary); margin-bottom: 10px; margin-top: 20px;"></h4>';

        const sessionsByDate = {};
        thisWeekSessions.forEach(session => {
            const dateKey = session.date.split('T')[0];
            if (!sessionsByDate[dateKey]) {
                sessionsByDate[dateKey] = [];
            }
            sessionsByDate[dateKey].push(session);
        });

        html += Object.keys(sessionsByDate)
            .sort()
            .slice(0, 7)
            .map(date => `
                <div class="study-plan-item">
                    <div class="study-time">${formatDate(date)}</div>
                    ${sessionsByDate[date].map(session => `
                        <div class="study-subject ${session.completed ? 'completed' : ''}">
                            <strong>${session.time || 'No time'}</strong> - ${session.subject} (${session.duration}min)
                            ${session.topic ? `<br><small>${session.topic}</small>` : ''}
                            <div class="task-actions" style="margin-top:8px; display:flex; gap:10px;">
                                <button class="${session.completed ? 'secondary' : 'success'}" onclick="toggleStudySessionComplete('${session.id}')">
                                    <i class="fas fa-${session.completed ? 'undo' : 'check'}"></i> ${session.completed ? 'Mark Incomplete' : 'Mark Complete'}
                                </button>
                                <button class="warning" onclick="removeStudySession('${session.id}')">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('');
    }

    document.getElementById('today-plan-container').innerHTML = html;
}

// History rendering
function renderHistory() {
    renderCurrentTasks();
    renderCompletedTasks();
    renderCurrentSessions();
    renderCompletedSessions();
}

function renderCurrentTasks() {
    const currentTasks = tasks.filter(task => !task.completed && !task.archived);
    const container = document.getElementById('current-tasks-container');
    if (currentTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>No current tasks</h3>
                <p>All tasks are completed or archived!</p>
            </div>
        `;
        return;
    }
    container.innerHTML = currentTasks
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .map(task => `
            <div class="study-plan-item" style="border-left-color: var(--warning);">
                <div class="study-time">
                    <i class="fas fa-calendar"></i>
                    ${task.dueDate ? formatDate(task.dueDate) : ''}
                </div>
                <div class="study-subject">
                    <strong>${task.title}</strong> - ${task.subject}
                    <span class="task-priority priority-${task.priority}" style="margin-left: 10px;">${task.priority.toUpperCase()}</span>
                    ${task.description ? `<br><small>${task.description}</small>` : ''}
                    <div class="task-actions" style="margin-top:8px; display:flex; gap:10px;">
                        <button class="success" onclick="toggleComplete('${task.id}')">
                            <i class="fas fa-check"></i> Mark Complete
                        </button>
                        <button class="warning" onclick="deleteTask('${task.id}')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
}

function renderCompletedTasks() {
    const completedTasks = tasks.filter(task => task.completed);
    const container = document.getElementById('completed-tasks-container');

    if (completedTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-check"></i>
                <h3>No completed tasks yet</h3>
                <p>Complete some tasks to see your history</p>
            </div>
        `;
        return;
    }

    container.innerHTML = completedTasks
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
        .map(task => `
            <div class="study-plan-item completed" style="border-left-color: var(--success);">
                <div class="study-time">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    ${task.completedAt ? formatDate(task.completedAt.split('T')[0]) : 'Completed'}
                </div>
                <div class="study-subject">
                    <strong>${task.title}</strong> - ${task.subject}
                    <span class="task-priority priority-${task.priority}" style="margin-left: 10px;">${task.priority.toUpperCase()}</span>
                    ${task.description ? `<br><small>${task.description}</small>` : ''}
                    <div class="task-actions" style="margin-top:8px; display:flex; gap:10px;">
                        <button class="warning" onclick="deleteTaskFromHistory('${task.id}')">
                            <i class="fas fa-trash"></i> Delete from History
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
}

function renderCurrentSessions() {
    const currentSessions = studySessions.filter(session => !session.completed && !session.archived);
    const container = document.getElementById('current-sessions-container');
    if (currentSessions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-day"></i>
                <h3>No current study sessions</h3>
                <p>All sessions are completed or archived!</p>
            </div>
        `;
        return;
    }
    container.innerHTML = currentSessions
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(session => `
            <div class="study-plan-item" style="border-left-color: var(--primary);">
                <div class="study-time">
                    <i class="fas fa-clock"></i>
                    ${session.date ? formatDate(session.date) : ''} ${session.time ? session.time : ''}
                </div>
                <div class="study-subject">
                    <strong>${session.subject}</strong> (${session.duration}min)
                    ${session.topic ? `<br><small>${session.topic}</small>` : ''}
                    <div class="task-actions" style="margin-top:8px; display:flex; gap:10px;">
                        <button class="success" onclick="toggleStudySessionComplete('${session.id}')">
                            <i class="fas fa-check"></i> Mark Complete
                        </button>
                        <button class="warning" onclick="removeStudySession('${session.id}')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
}

function renderCompletedSessions() {
    const completedSessions = studySessions.filter(session => session.completed);
    const container = document.getElementById('completed-sessions-container');

    if (completedSessions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>No completed sessions yet</h3>
                <p>Complete study sessions to see your progress</p>
            </div>
        `;
        return;
    }

    container.innerHTML = completedSessions
        .sort((a, b) => new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date))
        .map(session => `
            <div class="study-plan-item completed" style="border-left-color: var(--success);">
                <div class="study-time">
                    <i class="fas fa-graduation-cap" style="color: var(--success);"></i>
                    ${formatDate(session.date)}
                </div>
                <div class="study-subject">
                    <strong>${session.subject}</strong> (${session.duration}min)
                    ${session.topic ? `<br><small>${session.topic}</small>` : ''}
                    <br><small style="color: var(--gray);">
                        Completed: ${session.completedAt ? new Date(session.completedAt).toLocaleDateString() : 'Recently'}
                    </small>
                    <div class="task-actions" style="margin-top:8px; display:flex; gap:10px;">
                        <button class="warning" onclick="deleteSessionFromHistory('${session.id}')">
                            <i class="fas fa-trash"></i> Delete from History
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
}

// Timer Functions
let timerInterval;
let timerStartTime;
let timerPausedTime = 0;
let alarmInterval = null;
let alarmIsPlaying = false;
let currentFocusRecordId = null;

function startTimer(type) {
    if (timer.isRunning) return;

    timer.isRunning = true;
    timerStartTime = Date.now() - timerPausedTime;
    updateToggleButtons('running');
    stopAlarmLoop();
    beginFocusRecordIfNeeded();

    timerInterval = setInterval(() => {
        const elapsed = Date.now() - timerStartTime;
        const timeLeft = (timer.initialTime * 1000) - elapsed;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timer.isRunning = false;
            timer.timeLeft = 0;
            updateTimerDisplay(type);
            handleTimerComplete();
        } else {
            timer.timeLeft = Math.ceil(timeLeft / 1000);
            updateTimerDisplay(type);
        }
    }, 100);
}

function pauseTimer(type) {
    if (!timer.isRunning) return;

    timer.isRunning = false;
    clearInterval(timerInterval);
    timerPausedTime = Date.now() - timerStartTime;
    updateToggleButtons('paused');
    stopAlarmLoop();
    updateOngoingFocusRecord();
}

function resetTimer(type) {
    timer.isRunning = false;
    clearInterval(timerInterval);
    timerPausedTime = 0;
    setTimer(timer.focusDuration);
    timer.isBreak = false;
    timer.sessionsCompleted = 0;
    timerSession.textContent = `Session 1 of ${timer.totalSessions}`;
    updateToggleButtons('reset');
    stopAlarmLoop();
    finalizeFocusRecord(false);
}

function setTimer(minutes) {
    timer.initialTime = minutes * 60;
    timer.timeLeft = timer.initialTime;
    timerPausedTime = 0;
    updateTimerDisplay('quick');
    updateTimerDisplay('main');
}

function updateTimerDisplay(type) {
    const minutes = Math.floor(timer.timeLeft / 60);
    const seconds = timer.timeLeft % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (type === 'quick') {
        quickTimerDisplay.textContent = display;
    } else {
        mainTimerDisplay.textContent = display;
    }
}

function handleTimerComplete() {
    startAlarmLoop();
    finalizeFocusRecord(true);
    showNotification('Timer completed!', 'success');

    if (!timer.isBreak) {
        timer.sessionsCompleted++;
        timerSession.textContent = `Session ${timer.sessionsCompleted} of ${timer.totalSessions}`;

        if (timer.sessionsCompleted % timer.totalSessions === 0) {
            setTimer(timer.longBreakDuration);
            showNotification('Great work! Time for a long break!', 'success');
        } else {
            setTimer(timer.breakDuration);
            showNotification('Good job! Time for a short break', 'success');
        }
        timer.isBreak = true;
    } else {
        setTimer(timer.focusDuration);
        timer.isBreak = false;
        showNotification('Break over! Time to focus', 'success');
    }
    updateToggleButtons('completed');
}

function beginFocusRecordIfNeeded() {
    try {
        if (currentFocusRecordId) return;
        const now = new Date();
        const dateISO = now.toISOString().slice(0, 10);
        const subjectField = document.getElementById('study-subject');
        const subject = (subjectField && subjectField.value) ? subjectField.value : 'General';
        const record = {
            id: Date.now().toString(),
            dateISO,
            seconds: 0,
            subject,
            status: 'ongoing'
        };
        currentFocusRecordId = record.id;
        focusHistory.push(record);
        localStorage.setItem(`focusHistory_${currentUser.email}`, JSON.stringify(focusHistory));
    } catch (_) { }
}

function updateOngoingFocusRecord() {
    try {
        if (!currentFocusRecordId) return;
        const record = focusHistory.find(r => r.id === currentFocusRecordId);
        if (!record) return;
        const elapsedMs = Date.now() - timerStartTime;
        const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
        record.seconds += elapsedSec;
        localStorage.setItem(`focusHistory_${currentUser.email}`, JSON.stringify(focusHistory));
        timerStartTime = Date.now();
    } catch (_) { }
}

function finalizeFocusRecord(completed) {
    try {
        if (!currentFocusRecordId) return;
        if (timer.isRunning === false) {
            updateOngoingFocusRecord();
        }
        const record = focusHistory.find(r => r.id === currentFocusRecordId);
        if (record) {
            record.status = completed ? 'completed' : 'ongoing';
            if (completed) {
                record.seconds = Math.max(record.seconds, timer.initialTime);
            }
        }
        localStorage.setItem(`focusHistory_${currentUser.email}`, JSON.stringify(focusHistory));
        if (completed) currentFocusRecordId = null;
    } catch (_) { }
}

function playAlarm() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const durationSec = 1.2;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
        oscillator.start();
        oscillator.stop(ctx.currentTime + durationSec + 0.05);
    } catch (e) {
        const beep = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAZGF0YQAAAAAA');
        try { beep.play(); } catch (_) { }
    }
}

function startAlarmLoop() {
    if (alarmIsPlaying) return;
    alarmIsPlaying = true;
    playAlarm();
    alarmInterval = setInterval(() => {
        playAlarm();
    }, 2000);
}

function stopAlarmLoop() {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
    alarmIsPlaying = false;
}

function updateToggleButtons(state) {
    const quickIcon = quickStartBtn && quickStartBtn.querySelector('i');
    const mainIcon = mainStartBtn && mainStartBtn.querySelector('i');
    const setPlay = (iconEl) => {
        if (iconEl) {
            iconEl.classList.remove('fa-pause');
            iconEl.classList.add('fa-play');
        }
    };
    const setPause = (iconEl) => {
        if (iconEl) {
            iconEl.classList.remove('fa-play');
            iconEl.classList.add('fa-pause');
        }
    };
    if (state === 'running') {
        setPause(quickIcon);
        setPause(mainIcon);
    } else {
        setPlay(quickIcon);
        setPlay(mainIcon);
    }
}

function saveTimerSettingsHandler() {
    timer.focusDuration = parseInt(document.getElementById('focus-duration').value);
    timer.breakDuration = parseInt(document.getElementById('break-duration').value);
    timer.longBreakDuration = parseInt(document.getElementById('long-break-duration').value);
    timer.totalSessions = parseInt(document.getElementById('sessions-before-long-break').value);

    localStorage.setItem(`timerSettings_${currentUser.email}`, JSON.stringify({
        focusDuration: timer.focusDuration,
        breakDuration: timer.breakDuration,
        longBreakDuration: timer.longBreakDuration,
        totalSessions: timer.totalSessions
    }));

    setTimer(timer.focusDuration);
    timerSession.textContent = `Session 1 of ${timer.totalSessions}`;
    showNotification('Timer settings saved!', 'success');
}

// Utility Functions
function checkReminders() {
    const upcomingTasks = tasks.filter(task => !task.completed && task.dueDate === today);

    if (upcomingTasks.length > 0) {
        showNotification(`You have ${upcomingTasks.length} task(s) due today!`, 'warning');
    }
}

function showNotification(message, type) {
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function deleteTaskFromHistory(id) {
    if (confirm('Permanently delete this task from history? This action cannot be undone.')) {
        tasks = tasks.filter(task => task.id !== id);
        localStorage.setItem(`studyTasks_${currentUser.email}`, JSON.stringify(tasks));
        renderHistory();
        renderDashboard();
        showNotification('Task deleted from history!', 'warning');
    }
}

function deleteSessionFromHistory(id) {
    if (confirm('Permanently delete this session from history? This action cannot be undone.')) {
        studySessions = studySessions.filter(session => session.id !== id);
        localStorage.setItem(`studySessions_${currentUser.email}`, JSON.stringify(studySessions));
        renderHistory();
        renderDashboard();
        showNotification('Session deleted from history!', 'warning');
    }
}

// Make functions available globally for onclick handlers
window.toggleComplete = toggleComplete;
window.deleteTask = deleteTask;
window.toggleStudySessionComplete = toggleStudySessionComplete;
window.toggleStudyItemComplete = toggleStudyItemComplete;
window.removeStudySession = removeStudySession;
window.removeStudyItem = removeStudyItem;
window.deleteTaskFromHistory = deleteTaskFromHistory;
window.deleteSessionFromHistory = deleteSessionFromHistory;

// Theme toggle logic
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('ssp-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        themeToggleBtn.innerHTML = document.body.classList.contains('dark-mode')
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    });
}