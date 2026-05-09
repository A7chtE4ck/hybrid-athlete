// ─── STATE ─────────────────────────────────────────────────────────────────────
let state = {
    exercises: [],
    workouts: [],
    programs: [],
    bodyweight: []
};

let currentView = 'dashboard';
let workoutExercises = [];
let progressExerciseIdx = 0;
let selectedExerciseId = null;
let muscleFilter = 'Alle';

// ─── PERSIST ───────────────────────────────────────────────────────────────────
function save() {
    try {
        localStorage.setItem('gymtrack', JSON.stringify(state));
    } catch (e) {}
}

function load() {
    try {
        const d = localStorage.getItem('gymtrack');
        if (d) state = JSON.parse(d);
    } catch (e) {}
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function uid() {
    return Date.now() + Math.random();
}

function fmt(d) {
    return new Date(d).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function fmtShort(d) {
    return new Date(d).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short'
    });
}

function today() {
    return new Date().toISOString().split('T')[0];
}

function getCSSVar(v) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(v)
        .trim();
}

// 1RM Epley formula
function calc1RM(weight, reps) {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
}

function getExercisePR(exerciseId) {
    let maxORM = 0;
    let maxW = 0;

    state.workouts.forEach(w => {
        const ex = w.exercises.find(e => e.exerciseId === exerciseId);
        if (!ex) return;

        ex.sets.forEach(s => {
            const orm = calc1RM(s.weight || 0, s.reps || 0);
            if (orm > maxORM) maxORM = orm;
            if ((s.weight || 0) > maxW) maxW = s.weight;
        });
    });

    return { orm: maxORM, weight: maxW };
}

function getWeeklyVolume() {
    const weeks = {};

    state.workouts.forEach(w => {
        const d = new Date(w.date);
        const mon = new Date(d);
        mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const key = mon.toISOString().split('T')[0];

        let vol = 0;
        w.exercises.forEach(ex => {
            const e = state.exercises.find(x => x.id === ex.exerciseId);
            if (!e || e.type !== 'weight') return;

            ex.sets.forEach(s => {
                vol += (s.weight || 0) * (s.reps || 0);
            });
        });

        weeks[key] = (weeks[key] || 0) + vol;
    });

    return Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0]));
}