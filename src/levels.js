// Three acts. The mirror is in the third act; no extra fourth location.
export const levels = [
    {
        id: 'airlock',
        act: '01',
        name: 'Шлюз',
        objective: 'Найдите детский рисунок и включите повреждённый приёмник.',
        wallColor: 0x233746,
        lightColor: 0x4aafd0,
        walls: [
            {x: 0, y: 2.5, z: -5, w: 10, h: 5, d: 0.5},
            {x: 0, y: 2.5, z: 5, w: 10, h: 5, d: 0.5},
            {x: -5, y: 2.5, z: 0, w: 0.5, h: 5, d: 10},
            {x: 5, y: 2.5, z: 0, w: 0.5, h: 5, d: 10}
        ],
        objects: [
            {type: 'drawing', id: 'drawing_child', pos: [-2.8, 1.6, -4.55], fragment: 'child_drawing', label: 'Детский рисунок'},
            {type: 'radio', id: 'emergency_receiver', pos: [2.6, 1.35, -4.1], label: 'Приёмник связи'},
            {type: 'note', id: 'note_shift', pos: [-3.6, 1.35, -3.4], label: 'Неотправленное сообщение'},
            {type: 'note', id: 'note_radio', pos: [3.6, 1.5, -4.1], label: 'Сведения о приёмнике'}
        ],
        triggers: [{on: 'enter', pos: [0, 1.7, 3], whisper: 'whisper_airlock_enter'}],
        spawn: {x: 0, y: 1.7, z: 3.0},
        exit: {pos: [0, 1.2, 4.55], requires: ['child_drawing', 'radio_echo'], nextLevel: 1}
    },
    {
        id: 'lab',
        act: '02',
        name: 'Лаборатория',
        objective: 'Изучите приказ эвакуации, неполный реестр и журнал реактора.',
        wallColor: 0x243c48,
        lightColor: 0x6ac4b9,
        walls: [
            {x: 0, y: 2.5, z: -6, w: 12, h: 5, d: 0.5},
            {x: 0, y: 2.5, z: 6, w: 12, h: 5, d: 0.5},
            {x: -6, y: 2.5, z: 0, w: 0.5, h: 5, d: 12},
            {x: 6, y: 2.5, z: 0, w: 0.5, h: 5, d: 12},
            {x: 0, y: 2.4, z: -1, w: 2.5, h: 4.8, d: 0.3}
        ],
        objects: [
            {type: 'note', id: 'evacuation_order', pos: [-4.3, 1.5, -4], label: 'Приказ об эвакуации'},
            {type: 'note', id: 'registry_damaged', pos: [4.2, 1.5, -4], label: 'Повреждённый реестр'},
            {type: 'note', id: 'reactor_override', pos: [0, 1.5, 1.2], label: 'Журнал реактора'}
        ],
        triggers: [{on: 'enter', pos: [0, 1.7, 3], whisper: 'whisper_lab_enter'}],
        spawn: {x: 0, y: 1.7, z: 4.2},
        exit: {pos: [0, 1.2, 5.5], requires: ['evacuation_records'], nextLevel: 2}
    },
    {
        id: 'capsule',
        act: '03',
        name: 'Капсула',
        objective: 'Найдите игрушку, затем подойдите к зеркалу и сделайте выбор.',
        wallColor: 0x2e3d47,
        lightColor: 0xa1c3e0,
        walls: [
            {x: 0, y: 2.5, z: -5, w: 10, h: 5, d: 0.5},
            {x: 0, y: 2.5, z: 5, w: 10, h: 5, d: 0.5},
            {x: -5, y: 2.5, z: 0, w: 0.5, h: 5, d: 10},
            {x: 5, y: 2.5, z: 0, w: 0.5, h: 5, d: 10}
        ],
        objects: [
            {type: 'toy', id: 'memory_toy', pos: [2.2, 0.55, -1.6], fragment: 'toy_memory', label: 'Игрушка'},
            {type: 'mirror', id: 'final_mirror', pos: [0, 1.8, -4.55], label: 'Зеркало ECHO'},
            {type: 'note', id: 'capsule_protocol', pos: [-3.5, 1.35, -2], label: 'Протокол ECHO'},
            {type: 'note', id: 'mirror_instruction', pos: [3.6, 1.35, 1.1], label: 'Три протокола выбора'}
        ],
        triggers: [{on: 'enter', pos: [0, 1.7, 3], whisper: 'whisper_capsule_enter'}],
        spawn: {x: 0, y: 1.7, z: 3.5},
        exit: null
    }
];
