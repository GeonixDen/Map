// App.jsx
import React, {
    useState,
    useRef,
    useEffect,
    useCallback
} from 'react';
import {Canvas, useThree, extend} from '@react-three/fiber';
import {OrthographicCamera, MapControls} from '@react-three/drei';
import * as THREE from 'three';
import {MOUSE} from 'three';
import './App.scss';

// Регистрация PlaneBufferGeometry для R3F
extend({PlaneBufferGeometry: THREE.PlaneGeometry});

// Палитра эмоджи
const floorEmoji = ['▫️'];
const wallEmoji = ['⬛', '🌲', '🏠', '🏡', '🏘️', '🏚️', '🔥', '⛺', '🧱'];
const enemyEmojis = ['💀', '🐺', '⚔️', '👣', '🏴‍☠️', '🔼', '◀️', '▶️', '🔽'];
const npcEmojis = ['👩🏻‍🦰', '🧙‍♂️', '💬', '📜', '❓', '❗️'];
const rewardEmojis = ['💰', '🌿', '💎', '🪞', '⛏️', '✨'];
const allEmojis = [
    ...floorEmoji,
    ...wallEmoji,
    ...enemyEmojis,
    ...npcEmojis,
    ...rewardEmojis
];
const emojiGroups = [
    floorEmoji,
    wallEmoji,
    enemyEmojis,
    npcEmojis,
    rewardEmojis,
];

function App() {
    const [mapRows, setMapRows] = useState(50);
    const [mapCols, setMapCols] = useState(50);
    const [selectedEmoji, setSelectedEmoji] = useState(1);
    const drawing = useRef(false);
    const cellSize = 1;

    // Карта хранится в ref, чтобы не триггерить React-рендеры
    const mapRef = useRef(
        Array.from({length: mapRows}, () => Array(mapCols).fill(0))
    );

    // При изменении размеров — восстанавливаем старые данные
    useEffect(() => {
        const prev = mapRef.current;
        mapRef.current = Array.from({length: mapRows}, (_, i) =>
            Array.from({length: mapCols}, (_, j) =>
                prev[i]?.[j] ?? 0
            )
        );
    }, [mapRows, mapCols]);

    // Генерация текстур эмоджи
    const emojiTextures = useRef(
        allEmojis.map(emo => {
            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.font = `${size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emo, size / 2, size / 2);
            const tex = new THREE.CanvasTexture(canvas);
            tex.needsUpdate = true;
            return tex;
        })
    ).current;

    // Импорт JSON-карты
    const importMap = useCallback(e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (
                    !Array.isArray(data) ||
                    !data.every(row => Array.isArray(row))
                ) {
                    throw new Error('Неверный формат');
                }
                const newRows = data.length;
                const newCols = data[0].length;
                // конвертация эмоджи в индексы
                mapRef.current = data.map(row =>
                    row.map(ch => {
                        const idx = allEmojis.indexOf(ch);
                        return idx !== -1 ? idx : 0;
                    })
                );
                setMapRows(newRows);
                setMapCols(newCols);
            } catch {
                alert('Ошибка импорта: проверьте JSON');
            }
        };
        reader.readAsText(file);
    }, []);

    // Экспорт в JSON
    const exportMap = useCallback(() => {
        const out = mapRef.current.map(row =>
            row.map(idx => allEmojis[idx])
        );
        const blob = new Blob([JSON.stringify(out)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'map.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

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
                <div>
                    <div>
                        <div>
                            Rows:
                        </div>
                        <input
                            type="number"
                            min="1"
                            value={mapRows}
                            onChange={e => setMapRows(Math.max(1, +e.target.value))}
                        />
                    </div>
                    <div>
                        <div>
                            Columns:
                        </div>
                        <input
                            type="number"
                            min="1"
                            value={mapCols}
                            onChange={e => setMapCols(Math.max(1, +e.target.value))}
                        />
                    </div>
                </div>
                <div>
                    <input
                        type="file"
                        accept="application/json"
                        onChange={importMap}
                        style={{margin: '0 10px'}}
                    />
                    <button onClick={exportMap}>Export</button>
                </div>
            </div>

            <Canvas
                orthographic
                frameloop="demand"
                dpr={1}
                gl={{antialias: false}}
                onContextMenu={e => e.preventDefault()}
            >
                <OrthographicCamera
                    makeDefault
                    position={[mapCols / 2, mapRows / 2, 100]}
                    zoom={50}
                    near={0}
                    far={9999}
                />
                <MapControls
                    enableRotate={false}
                    enableZoom
                    enablePan
                    enableDamping
                    dampingFactor={0.1}
                    panSpeed={2}
                    screenSpacePanning
                    target={[mapCols / 2, mapRows / 2, 0]}
                    mouseButtons={{
                        LEFT: null,
                        MIDDLE: MOUSE.DOLLY,
                        RIGHT: MOUSE.PAN
                    }}
                />

                <Grid
                    rows={mapRows}
                    cols={mapCols}
                    cellSize={cellSize}
                    mapRef={mapRef}
                    textures={emojiTextures}
                    selectedEmoji={selectedEmoji}
                    drawing={drawing}
                />
            </Canvas>
        </div>
    );
}

function Grid({
                  rows,
                  cols,
                  cellSize,
                  mapRef,
                  textures,
                  selectedEmoji,
                  drawing
              }) {
    const meshRefs = useRef(textures.map(() => React.createRef()));
    const {invalidate} = useThree();

    // Инициализация instancedMesh для каждой текстуры
    useEffect(() => {
        const total = rows * cols;
        const mat = new THREE.Matrix4();

        textures.forEach((_, texIdx) => {
            const mesh = meshRefs.current[texIdx].current;
            mesh.count = total;
            let id = 0;

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++, id++) {
                    if (mapRef.current[i][j] === texIdx) {
                        mat.makeTranslation(
                            j * cellSize,
                            (rows - 1 - i) * cellSize,
                            0
                        );
                    } else {
                        mat.makeScale(0, 0, 0);
                    }
                    mesh.setMatrixAt(id, mat);
                }
            }
            mesh.instanceMatrix.needsUpdate = true;
        });
        invalidate();
    }, [rows, cols, textures, cellSize, invalidate]);

    // Меняем один инстанс при рисовании
    const paintCell = useCallback(
        (i, j) => {
            if (i < 0 || i >= rows || j < 0 || j >= cols) return;
            const prev = mapRef.current[i][j];
            if (prev === selectedEmoji) return;

            const id = i * cols + j;
            const matNew = new THREE.Matrix4().makeTranslation(
                j * cellSize,
                (rows - 1 - i) * cellSize,
                0
            );
            const matOff = new THREE.Matrix4().makeScale(0, 0, 0);

            // Скрываем старую
            const meshOld = meshRefs.current[prev].current;
            meshOld.setMatrixAt(id, matOff);
            meshOld.instanceMatrix.needsUpdate = true;

            // Рисуем новую
            const meshNew = meshRefs.current[selectedEmoji].current;
            meshNew.material.map = textures[selectedEmoji];
            meshNew.setMatrixAt(id, matNew);
            meshNew.instanceMatrix.needsUpdate = true;

            mapRef.current[i][j] = selectedEmoji;
            invalidate();
        },
        [rows, cols, selectedEmoji, textures, cellSize, invalidate]
    );

    // Обработчики мыши
    const onPointerDown = e => {
        if (e.button !== 0) return;
        drawing.current = true;
        const j = Math.round(e.point.x / cellSize);
        const i = rows - 1 - Math.round(e.point.y / cellSize);
        paintCell(i, j);
    };
    const onPointerUp = () => {
        drawing.current = false;
    };
    const onPointerMove = e => {
        if (!drawing.current) return;
        const j = Math.round(e.point.x / cellSize);
        const i = rows - 1 - Math.round(e.point.y / cellSize);
        paintCell(i, j);
    };

    return (
        <>
            {/* Скрытая плоскость для событий */}
            <mesh
                position={[(cols * cellSize) / 2, (rows * cellSize) / 2, 0]}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerMove={onPointerMove}
            >
                <planeBufferGeometry args={[cols * cellSize, rows * cellSize]}/>
                <meshBasicMaterial visible={false}/>
            </mesh>

            {/* InstancedMesh для каждой текстуры */}
            {textures.map((tex, idx) => (
                <instancedMesh
                    key={idx}
                    ref={meshRefs.current[idx]}
                    args={[null, null, rows * cols]}
                    frustumCulled={false}
                >
                    <planeBufferGeometry args={[cellSize, cellSize]}/>
                    <meshBasicMaterial map={tex} transparent depthTest/>
                </instancedMesh>
            ))}
        </>
    );
}

export default App;
