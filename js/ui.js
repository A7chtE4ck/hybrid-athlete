// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigate(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.getElementById('nav-' + view)?.classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        history: 'Verlauf',
        progress: 'Fortschritt',
        exercises: 'Übungen',
        programs: 'Programme',
        bodyweight: 'Körpergewicht'
    };

    document.getElementById('topbar-title').textContent = titles[view] || view;
    currentView = view;
    renderView(view);
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ─── THEME ────────────────────────────────────────────────────────────────────
(function () {
    const btn = document.querySelector('[data-theme-toggle]');
    const html = document.documentElement;
    let d = 'dark';

    html.setAttribute('data-theme', d);

    btn && btn.addEventListener('click', () => {
        d = d === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', d);
        btn.querySelector('span').textContent = d === 'dark' ? 'Dark Mode' : 'Hell';
        btn.querySelector('svg').innerHTML = d === 'dark'
            ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
            : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';

        renderView(currentView);
    });
})();

// ─── RENDER VIEWS ─────────────────────────────────────────────────────────────
function renderView(view) {
    if (view === 'dashboard') renderDashboard();
    else if (view === 'history') renderHistory();
    else if (view === 'progress') renderProgress();
    else if (view === 'exercises') renderExercises();
    else if (view === 'programs') renderPrograms();
    else if (view === 'bodyweight') renderBodyweight();

    lucide.createIcons();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
    const totalWorkouts = state.workouts.length;
    const now = new Date();

    const thisWeek = state.workouts.filter(w => {
        const d = new Date(w.date);
        const diff = (now - d) / 86400000;
        return diff < 7;
    });

    let totalVolume = 0;
    state.workouts.forEach(w => w.exercises.forEach(ex => {
        const e = state.exercises.find(x => x.id === ex.exerciseId);
        if (e?.type === 'weight') {
            ex.sets.forEach(s => {
                totalVolume += (s.weight || 0) * (s.reps || 0);
            });
        }
    }));

    document.getElementById('kpi-grid').innerHTML = `
        <div class="card card-sm">
            <div class="card-title">Workouts gesamt</div>
            <div class="card-value">${totalWorkouts}</div>
            <div class="card-delta">${thisWeek.length} diese Woche</div>
        </div>
        <div class="card card-sm">
            <div class="card-title">Volumen gesamt</div>
            <div class="card-value">${(totalVolume / 1000).toFixed(1)}t</div>
            <div class="card-delta">kg × Wdh.</div>
        </div>
        <div class="card card-sm">
            <div class="card-title">Übungen</div>
            <div class="card-value">${state.exercises.length}</div>
            <div class="card-delta">gespeichert</div>
        </div>
        <div class="card card-sm">
            <div class="card-title">Streak</div>
            <div class="card-value">${calcStreak()} 🔥</div>
            <div class="card-delta">Trainingstage</div>
        </div>
    `;

    const weeklyData = getWeeklyVolume().slice(-10);
    destroyChart('volumeChart');
    const cvol = document.getElementById('volumeChart');
    const { color, grid } = chartDefaults();

    charts.volumeChart = new Chart(cvol, {
        type: 'bar',
        data: {
            labels: weeklyData.map(([k]) => fmtShort(k)),
            datasets: [{
                label: 'Volumen (kg)',
                data: weeklyData.map(([, v]) => Math.round(v)),
                backgroundColor: getCSSVar('--color-primary') + 'aa',
                borderColor: getCSSVar('--color-primary'),
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => `${c.raw.toLocaleString('de')} kg`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color, font: { size: 11 } },
                    grid: { color: grid }
                },
                y: {
                    ticks: {
                        color,
                        font: { size: 11 },
                        callback: v => v.toLocaleString('de')
                    },
                    grid: { color: grid }
                }
            }
        }
    });

    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    let streakHTML = '<div class="streak-dots">';
    for (let i = 0; i < 7; i++) {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        const done = state.workouts.some(w => w.date === ds);
        const isToday = ds === today();
        streakHTML += `<div class="streak-dot${done ? ' done' : ''}${isToday ? ' today' : ''}">${days[i]}</div>`;
    }
    streakHTML += '</div>';
    document.getElementById('streak-week').innerHTML = streakHTML;

    const muscleCounts = {};
    state.workouts.forEach(w => w.exercises.forEach(ex => {
        const e = state.exercises.find(x => x.id === ex.exerciseId);
        if (e) muscleCounts[e.muscle] = (muscleCounts[e.muscle] || 0) + ex.sets.length;
    }));

    const top5 = Object.entries(muscleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    destroyChart('muscleChart');
    const cmus = document.getElementById('muscleChart');

    charts.muscleChart = new Chart(cmus, {
        type: 'doughnut',
        data: {
            labels: top5.map(([k]) => k),
            datasets: [{
                data: top5.map(([, v]) => v),
                backgroundColor: chartColors(),
                borderWidth: 0,
                hoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color,
                        font: { size: 11 },
                        boxWidth: 12
                    }
                }
            }
        }
    });

    const prHTML = state.exercises
        .filter(e => e.type === 'weight')
        .slice(0, 6)
        .map(e => {
            const pr = getExercisePR(e.id);
            return pr.weight > 0 ? `
                <div class="card card-sm" style="border-left:3px solid var(--color-gold)">
                    <div style="font-weight:600;margin-bottom:var(--space-1)">${e.name}</div>
                    <div class="card-value" style="font-size:var(--text-lg)">${pr.weight} kg</div>
                    <div class="card-delta">1RM ≈ ${pr.orm} kg</div>
                </div>
            ` : '';
        }).join('');

    document.getElementById('pr-list').innerHTML =
        prHTML || '<div class="card"><p style="color:var(--color-text-muted)">Noch keine Daten. Füge dein erstes Workout hinzu!</p></div>';
}

function calcStreak() {
    const sortedDates = [...new Set(state.workouts.map(w => w.date))].sort().reverse();
    if (!sortedDates.length) return 0;

    let streak = 0;
    let check = today();

    for (const d of sortedDates) {
        if (d === check || d === new Date(new Date(check) - 86400000).toISOString().split('T')[0]) {
            streak++;
            check = d;
        } else {
            break;
        }
    }

    return streak;
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function renderHistory() {
    const sorted = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));

    if (!sorted.length) {
        document.getElementById('history-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i data-lucide="calendar-x" width="48" height="48"></i></div>
                <h3>Noch keine Workouts</h3>
                <p>Erfasse dein erstes Training!</p>
                <button class="btn btn-primary" onclick="openWorkoutModal()">Workout starten</button>
            </div>
        `;
        return;
    }

    document.getElementById('history-list').innerHTML = sorted.map(w => {
        const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
        let totalVol = 0;

        w.exercises.forEach(ex => {
            const e = state.exercises.find(x => x.id === ex.exerciseId);
            if (e?.type === 'weight') {
                ex.sets.forEach(s => {
                    totalVol += (s.weight || 0) * (s.reps || 0);
                });
            }
        });

        const muscles = [...new Set(
            w.exercises
                .map(ex => state.exercises.find(e => e.id === ex.exerciseId)?.muscle || '')
                .filter(Boolean)
        )];

        return `
            <div class="card" style="margin-bottom:var(--space-3);cursor:pointer" onclick="toggleHistory('hw-${w.id}')">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
                    <div>
                        <div style="font-weight:600">${fmt(w.date)}</div>
                        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px">
                            ${muscles.map(m => `<span class="badge badge-primary">${m}</span>`).join(' ')}
                        </div>
                    </div>
                    <div style="text-align:right;font-size:var(--text-xs);color:var(--color-text-muted)">
                        <div>${totalSets} Sätze</div>
                        ${totalVol > 0 ? `<div>${totalVol.toLocaleString('de')} kg Volumen</div>` : ''}
                    </div>
                </div>
                <div id="hw-${w.id}" style="display:none;border-top:1px solid var(--color-divider);padding-top:var(--space-3);margin-top:var(--space-2)">
                    ${w.exercises.map(ex => {
            const e = state.exercises.find(x => x.id === ex.exerciseId);
            if (!e) return '';

            return `
                            <div style="margin-bottom:var(--space-3)">
                                <div style="font-weight:500;margin-bottom:var(--space-2)">${e.name}</div>
                                <div class="sets-list">
                                    ${ex.sets.map((s, i) => `
                                        <div class="set-row">
                                            <div class="set-num">${i + 1}</div>
                                            <div class="set-detail">
                                                ${e.type === 'weight'
                ? `<span>${s.weight} kg × ${s.reps} Wdh.</span>`
                : e.type === 'bodyweight'
                    ? `<span>${s.reps} Wdh.</span>`
                    : `<span>${s.duration} min</span>`}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
        }).join('')}
                    ${w.notes ? `<div style="font-size:var(--text-sm);color:var(--color-text-muted);font-style:italic;margin-top:var(--space-2)">"${w.notes}"</div>` : ''}
                    <div style="margin-top:var(--space-4)">
                        <button class="btn btn-danger btn-sm" onclick="deleteWorkout(${w.id},event)">
                            <i data-lucide="trash-2" width="12" height="12"></i> Löschen
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleHistory(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
    lucide.createIcons();
}

function deleteWorkout(id, e) {
    e.stopPropagation();
    state.workouts = state.workouts.filter(w => w.id !== id);
    save();
    renderHistory();
    toast('Workout gelöscht', 'error');
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────
function renderProgress() {
    const weightExercises = state.exercises.filter(e => e.type === 'weight');

    if (!weightExercises.length) {
        document.getElementById('progress-exercise-chips').innerHTML = '';
        return;
    }

    if (progressExerciseIdx >= weightExercises.length) progressExerciseIdx = 0;
    const selectedEx = weightExercises[progressExerciseIdx];

    document.getElementById('progress-exercise-chips').innerHTML = weightExercises.map((e, i) =>
        `<div class="chip ${i === progressExerciseIdx ? 'active' : ''}" onclick="selectProgressEx(${i})">${e.name}</div>`
    ).join('');

    const ormData = [];
    const maxWData = [];

    state.workouts.forEach(w => {
        const ex = w.exercises.find(e => e.exerciseId === selectedEx.id);
        if (!ex) return;

        let maxORM = 0;
        let maxW = 0;

        ex.sets.forEach(s => {
            const orm = calc1RM(s.weight || 0, s.reps || 0);
            if (orm > maxORM) maxORM = orm;
            if ((s.weight || 0) > maxW) maxW = s.weight;
        });

        ormData.push({ x: w.date, y: maxORM });
        maxWData.push({ x: w.date, y: maxW });
    });

    ormData.sort((a, b) => a.x.localeCompare(b.x));
    maxWData.sort((a, b) => a.x.localeCompare(b.x));

    const { color, grid } = chartDefaults();
    const primaryColor = getCSSVar('--color-primary');

    destroyChart('orm1Chart');
    charts.orm1Chart = new Chart(document.getElementById('orm1Chart'), {
        type: 'line',
        data: {
            labels: ormData.map(d => fmtShort(d.x)),
            datasets: [{
                label: '1RM (kg)',
                data: ormData.map(d => d.y),
                borderColor: primaryColor,
                backgroundColor: primaryColor + '22',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color, font: { size: 11 } }, grid: { color: grid } },
                y: { ticks: { color, font: { size: 11 } }, grid: { color: grid } }
            }
        }
    });

    destroyChart('maxWeightChart');
    charts.maxWeightChart = new Chart(document.getElementById('maxWeightChart'), {
        type: 'line',
        data: {
            labels: maxWData.map(d => fmtShort(d.x)),
            datasets: [{
                label: 'Max. Gewicht (kg)',
                data: maxWData.map(d => d.y),
                borderColor: getCSSVar('--color-chart-2'),
                backgroundColor: getCSSVar('--color-chart-2') + '22',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color, font: { size: 11 } }, grid: { color: grid } },
                y: { ticks: { color, font: { size: 11 } }, grid: { color: grid } }
            }
        }
    });

    const weeklyData = getWeeklyVolume().slice(-12);
    destroyChart('weeklyVolumeChart');
    charts.weeklyVolumeChart = new Chart(document.getElementById('weeklyVolumeChart'), {
        type: 'bar',
        data: {
            labels: weeklyData.map(([k]) => fmtShort(k)),
            datasets: [{
                label: 'Volumen (kg)',
                data: weeklyData.map(([, v]) => Math.round(v)),
                backgroundColor: getCSSVar('--color-chart-3') + 'aa',
                borderColor: getCSSVar('--color-chart-3'),
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color, font: { size: 11 } }, grid: { color: grid } },
                y: { ticks: { color, font: { size: 11 } }, grid: { color: grid } }
            }
        }
    });
}

function selectProgressEx(idx) {
    progressExerciseIdx = idx;
    renderProgress();
}

// ─── EXERCISES ────────────────────────────────────────────────────────────────
function renderExercises() {
    const muscles = ['Alle', ...new Set(state.exercises.map(e => e.muscle))];

    document.getElementById('muscle-filter-chips').innerHTML = muscles.map(m =>
        `<div class="chip ${m === muscleFilter ? 'active' : ''}" onclick="filterMuscle('${m}')">${m}</div>`
    ).join('');

    const filtered = muscleFilter === 'Alle'
        ? state.exercises
        : state.exercises.filter(e => e.muscle === muscleFilter);

    if (!filtered.length) {
        document.getElementById('exercise-grid').innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="empty-icon"><i data-lucide="dumbbell" width="48" height="48"></i></div>
                <h3>Keine Übungen</h3>
                <p>Füge deine erste Übung hinzu!</p>
                <button class="btn btn-primary" onclick="openAddExerciseModal()">Übung hinzufügen</button>
            </div>
        `;
        return;
    }

    document.getElementById('exercise-grid').innerHTML = filtered.map(e => {
        const pr = getExercisePR(e.id);
        const workoutCount = state.workouts.filter(w => w.exercises.some(ex => ex.exerciseId === e.id)).length;

        return `
            <div class="exercise-card" onclick="showExerciseDetail(${e.id})">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2)">
                    <div class="exercise-name">${e.name}</div>
                    <span class="badge badge-primary">${e.muscle}</span>
                </div>
                <div class="exercise-meta">${workoutCount} Trainings · ${e.type === 'weight' ? 'Gewicht' : 'Körpergew.'}</div>
                ${pr.weight > 0 ? `<div class="exercise-pr">🏆 PR: ${pr.weight} kg (1RM ≈ ${pr.orm} kg)</div>` : ''}
                ${e.notes ? `<div class="exercise-meta" style="margin-top:var(--space-1)">${e.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}

function filterMuscle(m) {
    muscleFilter = m;
    renderExercises();
}

function showExerciseDetail(id) {
    selectedExerciseId = id;
    const e = state.exercises.find(x => x.id === id);
    if (!e) return;

    const history = state.workouts
        .filter(w => w.exercises.some(ex => ex.exerciseId === id))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    const pr = getExercisePR(id);

    document.getElementById('ex-detail-content').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-4)">
            <div class="modal-title" style="margin-bottom:0">${e.name}</div>
            <span class="badge badge-primary">${e.muscle}</span>
        </div>
        ${pr.weight > 0 ? `
            <div class="card card-sm" style="margin-bottom:var(--space-4);display:flex;gap:var(--space-8)">
                <div>
                    <div class="card-title">Bestes Gewicht</div>
                    <div class="card-value" style="font-size:var(--text-lg)">${pr.weight} kg</div>
                </div>
                <div>
                    <div class="card-title">Gesch. 1RM</div>
                    <div class="card-value" style="font-size:var(--text-lg)">${pr.orm} kg</div>
                </div>
            </div>
        ` : ''}
        <div style="font-weight:600;margin-bottom:var(--space-3)">Letzte 5 Trainings</div>
        ${history.length ? history.map(w => `
            <div style="margin-bottom:var(--space-3)">
                <div style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-2)">${fmt(w.date)}</div>
                <div class="sets-list">
                    ${w.exercises.find(ex => ex.exerciseId === id)?.sets.map((s, i) => `
                        <div class="set-row">
                            <div class="set-num">${i + 1}</div>
                            <div class="set-detail">
                                ${e.type === 'weight'
        ? `<span>${s.weight} kg × ${s.reps} Wdh.</span><span style="color:var(--color-text-muted)">1RM ≈ ${calc1RM(s.weight, s.reps)} kg</span>`
        : e.type === 'bodyweight'
            ? `<span>${s.reps} Wdh.</span>`
            : `<span>${s.duration} min</span>`}
                            </div>
                        </div>
                    `).join('') || ''}
                </div>
            </div>
        `).join('') : '<p style="color:var(--color-text-muted);font-size:var(--text-sm)">Noch nicht trainiert.</p>'}
    `;

    document.getElementById('exerciseDetailModal').classList.add('open');
}

function deleteCurrentExercise() {
    if (!selectedExerciseId) return;
    state.exercises = state.exercises.filter(e => e.id !== selectedExerciseId);
    save();
    closeModal('exerciseDetailModal');
    renderExercises();
    toast('Übung gelöscht', 'error');
}

// ─── PROGRAMS ────────────────────────────────────────────────────────────────
function renderPrograms() {
    if (!state.programs.length) {
        document.getElementById('program-list').innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="empty-icon"><i data-lucide="layers" width="48" height="48"></i></div>
                <h3>Keine Programme</h3>
                <p>Erstelle dein erstes Trainingsprogramm!</p>
                <button class="btn btn-primary" onclick="openAddProgramModal()">Programm erstellen</button>
            </div>
        `;
        return;
    }

    document.getElementById('program-list').innerHTML = state.programs.map(p => {
        const count = state.workouts.filter(w => w.program === p.id).length;

        return `
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2)">
                    <div style="font-weight:600">${p.name}</div>
                    <button class="btn btn-danger btn-sm" onclick="deleteProgram(${p.id})">×</button>
                </div>
                ${p.desc ? `<div style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-2)">${p.desc}</div>` : ''}
                <div class="badge badge-primary">${count} Workouts</div>
            </div>
        `;
    }).join('');
}

function deleteProgram(id) {
    state.programs = state.programs.filter(p => p.id !== id);
    save();
    renderPrograms();
    toast('Programm gelöscht');
}

// ─── BODYWEIGHT ───────────────────────────────────────────────────────────────
function renderBodyweight() {
    const sorted = [...state.bodyweight].sort((a, b) => a.date.localeCompare(b.date));
    document.getElementById('bw-count').textContent = sorted.length;

    if (sorted.length) {
        const last = sorted[sorted.length - 1];
        document.getElementById('bw-current').textContent = last.weight + ' kg';

        if (sorted.length > 1) {
            const prev = sorted[sorted.length - 2];
            const diff = (last.weight - prev.weight).toFixed(1);
            const el = document.getElementById('bw-delta');

            el.textContent = (diff > 0 ? '+' : '') + diff + ' kg seit letztem Eintrag';
            el.className = 'card-delta ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : '');
        }
    } else {
        document.getElementById('bw-current').textContent = '–';
    }

    destroyChart('bwChart');
    const { color, grid } = chartDefaults();

    charts.bwChart = new Chart(document.getElementById('bwChart'), {
        type: 'line',
        data: {
            labels: sorted.map(d => fmtShort(d.date)),
            datasets: [{
                label: 'Gewicht (kg)',
                data: sorted.map(d => d.weight),
                borderColor: getCSSVar('--color-primary'),
                backgroundColor: getCSSVar('--color-primary') + '22',
                borderWidth: 2.5,
                fill: true,
                tension: 0.3,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color, font: { size: 11 } }, grid: { color: grid } },
                y: {
                    ticks: {
                        color,
                        font: { size: 11 },
                        callback: v => v + ' kg'
                    },
                    grid: { color: grid }
                }
            }
        }
    });

    document.getElementById('bw-list').innerHTML = [...sorted]
        .reverse()
        .slice(0, 10)
        .map(entry => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-divider)">
                <div style="font-size:var(--text-sm)">${fmt(entry.date)}</div>
                <div style="font-weight:600;font-variant-numeric:tabular-nums">${entry.weight} kg</div>
                <button class="btn btn-danger btn-sm" onclick="deleteBW('${entry.date}')">×</button>
            </div>
        `).join('');
}

function deleteBW(date) {
    state.bodyweight = state.bodyweight.filter(e => e.date !== date);
    save();
    renderBodyweight();
    toast('Eintrag gelöscht');
}

// ─── WORKOUT MODAL ────────────────────────────────────────────────────────────
function openWorkoutModal() {
    document.getElementById('w-date').value = today();
    const progSel = document.getElementById('w-program');

    progSel.innerHTML =
        '<option value="">Kein Programm</option>' +
        state.programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    workoutExercises = [];
    document.getElementById('workout-exercises-list').innerHTML = '';
    document.getElementById('w-notes').value = '';
    document.getElementById('workoutModal').classList.add('open');
}

function addExerciseToWorkout() {
    workoutExercises.push({
        exerciseId: null,
        sets: [{ weight: 0, reps: 0, duration: 0 }]
    });

    renderWorkoutExercises();
}

function renderWorkoutExercises() {
    document.getElementById('workout-exercises-list').innerHTML = workoutExercises.map((we, wi) => {
        const selEx = we.exerciseId ? state.exercises.find(e => e.id === we.exerciseId) : null;

        return `
            <div class="card card-sm" style="margin-bottom:var(--space-3)">
                <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-3);align-items:center">
                    <select class="form-input" style="flex:1" onchange="setWorkoutExercise(${wi},this.value)">
                        <option value="">Übung wählen…</option>
                        ${state.exercises.map(e =>
            `<option value="${e.id}" ${e.id === we.exerciseId ? 'selected' : ''}>${e.name} (${e.muscle})</option>`
        ).join('')}
                    </select>
                    <button class="btn btn-danger btn-sm" onclick="removeWorkoutExercise(${wi})">×</button>
                </div>

                ${selEx ? `
                    <div class="sets-list" id="we-sets-${wi}">
                        ${we.sets.map((s, si) => `
                            <div class="set-row">
                                <div class="set-num">${si + 1}</div>
                                <div class="set-detail">
                                    ${selEx.type === 'weight' ? `
                                        <input type="number" class="form-input" style="width:80px;padding:4px 8px" placeholder="kg"
                                            value="${s.weight || ''}" oninput="setSetVal(${wi},${si},'weight',this.value)">
                                        <span style="color:var(--color-text-faint)">kg ×</span>
                                        <input type="number" class="form-input" style="width:64px;padding:4px 8px" placeholder="Wdh"
                                            value="${s.reps || ''}" oninput="setSetVal(${wi},${si},'reps',this.value)">
                                        <span style="color:var(--color-text-faint)">Wdh.</span>
                                    ` : selEx.type === 'bodyweight' ? `
                                        <input type="number" class="form-input" style="width:64px;padding:4px 8px" placeholder="Wdh"
                                            value="${s.reps || ''}" oninput="setSetVal(${wi},${si},'reps',this.value)">
                                        <span style="color:var(--color-text-faint)">Wdh.</span>
                                    ` : `
                                        <input type="number" class="form-input" style="width:72px;padding:4px 8px" placeholder="Min"
                                            value="${s.duration || ''}" oninput="setSetVal(${wi},${si},'duration',this.value)">
                                        <span style="color:var(--color-text-faint)">Min</span>
                                    `}
                                </div>
                                ${si > 0 ? `<button class="btn btn-danger btn-sm" style="padding:2px 6px" onclick="removeSet(${wi},${si})">×</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-ghost btn-sm" style="margin-top:var(--space-2)" onclick="addSet(${wi})">
                        <i data-lucide="plus" width="12" height="12"></i> Satz
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function setWorkoutExercise(wi, val) {
    workoutExercises[wi].exerciseId = val ? parseInt(val) : null;
    renderWorkoutExercises();
}

function setSetVal(wi, si, key, val) {
    workoutExercises[wi].sets[si][key] = parseFloat(val) || 0;
}

function addSet(wi) {
    workoutExercises[wi].sets.push({ weight: 0, reps: 0, duration: 0 });
    renderWorkoutExercises();
}

function removeSet(wi, si) {
    workoutExercises[wi].sets.splice(si, 1);
    renderWorkoutExercises();
}

function removeWorkoutExercise(wi) {
    workoutExercises.splice(wi, 1);
    renderWorkoutExercises();
}

function saveWorkout() {
    const date = document.getElementById('w-date').value;
    if (!date) {
        toast('Bitte Datum angeben!', 'error');
        return;
    }

    const exs = workoutExercises.filter(we => we.exerciseId);
    if (!exs.length) {
        toast('Bitte mindestens eine Übung hinzufügen!', 'error');
        return;
    }

    const newW = {
        id: uid(),
        date,
        notes: document.getElementById('w-notes').value,
        program: document.getElementById('w-program').value || null,
        exercises: exs
    };

    state.workouts.push(newW);
    save();
    closeModal('workoutModal');
    toast('Workout gespeichert! 💪', 'success');
    renderView(currentView);
}

// ─── EXERCISE MODAL ───────────────────────────────────────────────────────────
function openAddExerciseModal() {
    document.getElementById('ex-name').value = '';
    document.getElementById('ex-notes').value = '';
    document.getElementById('addExerciseModal').classList.add('open');
}

function saveExercise() {
    const name = document.getElementById('ex-name').value.trim();
    if (!name) {
        toast('Name eingeben!', 'error');
        return;
    }

    const ex = {
        id: uid(),
        name,
        muscle: document.getElementById('ex-muscle').value,
        type: document.getElementById('ex-type').value,
        notes: document.getElementById('ex-notes').value
    };

    state.exercises.push(ex);
    save();
    closeModal('addExerciseModal');
    toast('Übung hinzugefügt!', 'success');
    renderView(currentView);
}

// ─── PROGRAM MODAL ────────────────────────────────────────────────────────────
function openAddProgramModal() {
    document.getElementById('prog-name').value = '';
    document.getElementById('prog-desc').value = '';
    document.getElementById('addProgramModal').classList.add('open');
}

function saveProgram() {
    const name = document.getElementById('prog-name').value.trim();
    if (!name) {
        toast('Name eingeben!', 'error');
        return;
    }

    state.programs.push({
        id: uid(),
        name,
        desc: document.getElementById('prog-desc').value
    });

    save();
    closeModal('addProgramModal');
    toast('Programm erstellt!', 'success');
    renderPrograms();
}

// ─── BODYWEIGHT MODAL ────────────────────────────────────────────────────────
function logBodyweight() {
    document.getElementById('bw-date').value = today();
    document.getElementById('bw-weight').value = '';
    document.getElementById('bwModal').classList.add('open');
}

function saveBW() {
    const date = document.getElementById('bw-date').value;
    const weight = parseFloat(document.getElementById('bw-weight').value);

    if (!date || !weight) {
        toast('Alle Felder ausfüllen!', 'error');
        return;
    }

    state.bodyweight = state.bodyweight.filter(e => e.date !== date);
    state.bodyweight.push({ date, weight });

    save();
    closeModal('bwModal');
    toast('Gewicht eingetragen!', 'success');
    renderBodyweight();
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

// ─── EXPORT ───────────────────────────────────────────────────────────────────
function exportData() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gymtrack-export.json';
    a.click();
    toast('Daten exportiert!', 'success');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    const el = document.createElement('div');
    el.className = 'toast-item' + (type === 'success' ? ' success' : '');
    el.innerHTML = (type === 'success' ? '✓ ' : type === 'error' ? '✕ ' : '') + msg;
    t.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}