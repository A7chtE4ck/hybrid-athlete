// ─── SEED DATA ────────────────────────────────────────────────────────────────
function seedData() {
    if (state.exercises.length > 0) return;

    state.exercises = [
        { id: 1, name: 'Bankdrücken',     muscle: 'Brust',    type: 'weight',     notes: 'Flachbank' },
        { id: 2, name: 'Kniebeugen',      muscle: 'Beine',    type: 'weight',     notes: 'Freie Hantel' },
        { id: 3, name: 'Kreuzheben',      muscle: 'Rücken',   type: 'weight',     notes: '' },
        { id: 4, name: 'Schulterdrücken', muscle: 'Schulter', type: 'weight',     notes: 'OHP' },
        { id: 5, name: 'Klimmzüge',       muscle: 'Rücken',   type: 'bodyweight', notes: '' },
        { id: 6, name: 'Bizepscurl',      muscle: 'Bizeps',   type: 'weight',     notes: '' },
        { id: 7, name: 'Trizepsdrücken',  muscle: 'Trizeps',  type: 'weight',     notes: 'Kabelzug' },
        { id: 8, name: 'Beinpresse',      muscle: 'Beine',    type: 'weight',     notes: '' },
        { id: 9, name: 'Laufen',          muscle: 'Core',     type: 'cardio',     notes: 'Minuten' },
        { id:10, name: 'Plank',           muscle: 'Core',     type: 'bodyweight', notes: 'Sekunden' }
    ];

    const todayDate = new Date();
    const workoutDates = [0, 2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25, 28];

    state.workouts = workoutDates.map((daysAgo, wi) => {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - daysAgo);
        const ds = d.toISOString().split('T')[0];

        const isLeg = wi % 3 === 2;
        const isPull = wi % 3 === 1;
        const exIds = isLeg ? [2, 8] : isPull ? [3, 5, 6] : [1, 4, 7];

        return {
            id: wi + 1,
            date: ds,
            notes: '',
            program: null,
            exercises: exIds.map(eid => {
                const ex = state.exercises.find(e => e.id === eid);

                const base =
                    eid === 1 ? 80  :
                        eid === 2 ? 100 :
                            eid === 3 ? 120 :
                                eid === 4 ? 60  :
                                    eid === 5 ? 0   :
                                        eid === 6 ? 30  :
                                            eid === 7 ? 40  :
                                                eid === 8 ? 150 : 0;

                const prog = Math.floor(wi * 1.5);

                return {
                    exerciseId: eid,
                    sets: [1, 2, 3].map((s, si) => ({
                        reps: ex.type === 'bodyweight' ? 10 + si * 2 : 8 - si,
                        weight: ex.type === 'bodyweight' ? 0 : base + prog + si * 2.5,
                        duration: ex.type === 'cardio' ? 20 + wi : 0
                    }))
                };
            })
        };
    });

    save();
}