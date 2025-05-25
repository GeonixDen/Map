import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Canvas, extend } from '@react-three/fiber';
import { OrthographicCamera, MapControls, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { MOUSE } from 'three';
import './App.scss';

// Регистрация PlaneBufferGeometry для R3F
extend({ PlaneBufferGeometry: THREE.PlaneGeometry });

// Эмодзи для тайлов
const floorEmoji = ["▫️"];
const wallEmoji = ["⬛", "🌲","🏠","🏡","🏘️","🏚️","🔥","⛺"];
const enemyEmojis = ["💀", "🐍", "👻", "🧌", "👹", "🐺", "⚔️"];
const npcEmojis = ["👩🏻‍🦰","🧙‍♂️"];
const rewardEmojis = ["💰", "🌿", "❓", "💎"];
const allEmojis = [...floorEmoji, ...wallEmoji, ...enemyEmojis, ...npcEmojis, ...rewardEmojis];
const emojiGroups = [
    floorEmoji,
    wallEmoji,
    enemyEmojis,
    npcEmojis,
    rewardEmojis
];
function App() {
    const rows = 30;
    const cols = 10;
    const cellSize = 1;

    // Состояние карты
    const [map, setMap] = useState(
        () => Array.from({ length: rows }, () => Array(cols).fill(0))
    );
    const [selectedEmoji, setSelectedEmoji] = useState(1);
    const drawing = useRef(false);

    // Генерация текстур эмодзи один раз
    const emojiTextures = useMemo(() =>
        allEmojis.map(emo => {
            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, size, size);
            ctx.font = `${size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emo, size / 2, size / 2);
            const tex = new THREE.CanvasTexture(canvas);
            tex.needsUpdate = true;
            return tex;
        }), []);

    // Функция рисования
    const paintCell = useCallback((i, j) => {
        setMap(prev => {
            const next = prev.map(r => r.slice());
            next[i][j] = selectedEmoji;
            return next;
        });
    }, [selectedEmoji]);

    // Обработчики мыши
    const handlePointerDown = (e, i, j) => {
        console.log(j,i)
        e.stopPropagation();
        if (e.button === 0) {
            drawing.current = true;
            paintCell(i, j);
        }
    };
    const handlePointerUp = () => {
        drawing.current = false;
    };
    const handlePointerOver = (e, i, j) => {
        e.stopPropagation();
        if (drawing.current) paintCell(i, j);
    };

    // Импорт карты
    const importMap = useCallback((event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedMap = JSON.parse(e.target.result);
                // Валидация размеров
                if (!Array.isArray(importedMap) || importedMap.length !== rows || !importedMap.every(row => Array.isArray(row) && row.length === cols)) {
                    alert('Неверный формат карты: размеры должны быть 30x10.');
                    return;
                }
                // Конвертация эмодзи в индексы
                const newMap = importedMap.map(row =>
                    row.map(emoji => {
                        const idx = allEmojis.indexOf(emoji);
                        return idx !== -1 ? idx : 0; // Если эмодзи не найден, использовать пол (0)
                    })
                );
                setMap(newMap);
                alert('Карта успешно импортирована!');
            } catch (err) {
                alert('Ошибка при парсинге файла. Убедитесь, что это валидный JSON.');
            }
        };
        reader.readAsText(file);
    }, [rows, cols]);

    // Экспорт карты
    const exportMap = useCallback(() => {
        console.log(JSON.stringify(map.map(row => row.map(idx => allEmojis[idx]))));
        alert('Карта экспортирована в консоль.');
    }, [map]);

    // Группировка по типу для всех клеток
    const grouped = useMemo(() => {
        const groups = {};
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const idx = map[i][j];
                if (!groups[idx]) groups[idx] = [];
                groups[idx].push([i, j]);
            }
        }
        return groups;
    }, [map]);

    return (
        <div className="App">
            <div className="toolbar">
                {emojiGroups.map((group, gi) => (
                    <div className="toolbar__block" key={gi}>
                        {group.map((emo, idx) => {
                            // считаем реальный индекс в одномерном массиве
                            const globalIndex = emojiGroups
                                    .slice(0, gi)
                                    .reduce((sum, g) => sum + g.length, 0)
                                + idx;

                            return (
                                <button
                                    key={globalIndex}
                                    className={globalIndex === selectedEmoji ? 'selected' : ''}
                                    onClick={() => setSelectedEmoji(globalIndex)}
                                >
                                    {emo}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="toolbar2">
                <input
                    type="file"
                    accept="application/json"
                    onChange={importMap}
                    style={{margin: '0 10px'}}
                />
                <button onClick={exportMap}>Export</button>
            </div>

            <Canvas
                orthographic
                onPointerUp={handlePointerUp}
                onContextMenu={e => e.preventDefault()}
            >
                <OrthographicCamera makeDefault position={[cols / 2, rows / 2, 100]} zoom={50} near={0} far={9999}/>
                <MapControls
                    enableRotate={false}
                    enableZoom
                    enablePan
                    enableDamping
                    dampingFactor={0.1}
                    panSpeed={2}
                    screenSpacePanning
                    target={[cols / 2, rows / 2, 0]}
                    mouseButtons={{LEFT: null, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN}}
                />
                {/* InstancedMesh для каждого типа эмодзи */}
                {Object.entries(grouped).map(([idx, cells]) => (
                    <Instances
                        key={idx}
                        limit={rows * cols}
                        castShadow={false}
                        receiveShadow={false}
                        frustumCulled={false}
                    >
                        <planeBufferGeometry args={[cellSize, cellSize]}/>
                        <meshBasicMaterial map={emojiTextures[idx]} transparent depthTest/>
                        {cells.map(([i, j], id) => (
                            <Instance
                                key={id}
                                position={[j * cellSize, (rows - 1 - i) * cellSize, 0]}
                                onPointerDown={e => handlePointerDown(e, i, j)}
                                onPointerOver={e => handlePointerOver(e, i, j)}
                            />
                        ))}
                    </Instances>
                ))}
            </Canvas>
        </div>
    );
}

export default App;