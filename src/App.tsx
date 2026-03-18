import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import { GameScene } from './game/scenes/GameScene';

const difficultyModes = [
    { value: 1, label: 'Level 1' },
    { value: 2, label: 'Level 2' },
    { value: 3, label: 'Level 3' }
];

const gameBackgrounds: Record<string, string> = {
    default: 'coop'
};

const activities = [
    {
        key: 'CountingGameScene',
        label: 'Counting Coop',
        description: 'Count the chickens one by one and match the total.'
    },
    {
        key: 'MakeTenGameScene',
        label: 'Fill the Frame',
        description: 'Tap the egg group that fills the frame.'
    },
    {
        key: 'AdditionGameScene',
        label: 'Egg Addition',
        description: 'See two egg groups, count them together, and build bigger sums.'
    },
    {
        key: 'SubtractionGameScene',
        label: 'Egg Subtraction',
        description: 'Watch eggs roll away and figure out how many are left.'
    },
    {
        key: 'PatternGameScene',
        label: 'Coop Patterns',
        description: 'Start with egg and chicken patterns, then move into number patterns.'
    },
    {
        key: 'MemoryGameScene',
        label: 'Egg Match',
        description: 'Flip cards to match numbers and egg groups, then make-10 pairs.'
    }
];

function App()
{
    const [gameTitle, setGameTitle] = useState("");
    const [activeSceneKey, setActiveSceneKey] = useState("MainMenu");
    const [panelOpen, setPanelOpen] = useState(false);
    const [difficultyLevel, setDifficultyLevel] = useState(1);
    const showingChooser = activeSceneKey === "MainMenu";
    const backgroundKey = gameBackgrounds[activeSceneKey] ?? gameBackgrounds.default;

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {
        setActiveSceneKey(scene.scene.key);
        if (scene instanceof GameScene && scene.scene.key !== "MainMenu") {
            setGameTitle(scene.title);
        }
        else {
            setGameTitle("");
        }
        
    }

    const launchScene = (key: string) => {

        if(phaserRef.current)
        {     
            const scene = phaserRef.current.scene as GameScene;
            
            if (scene)
            {
                scene.startScene(key);
                setPanelOpen(false);
            }
        }
    }

    return (
        <div id="app" className={panelOpen ? "drawer_open" : ""}>
            <button
                type="button"
                id="drawer_scrim"
                aria-label="Close game picker"
                onClick={() => { setPanelOpen(false); }}
            />

            <section id="contents">
                <div id="game-shell">
                    <div className="topbar">
                        <div className="topbar_copy">
                            <div className="brand_chip">Tiny Sprouts</div>
                            <div id="title">{gameTitle || "Pick a game"}</div>
                        </div>
                        <div className="topbar_controls">
                            <div className="mode_picker" role="group" aria-label="Difficulty level">
                                {difficultyModes.map((mode) => (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        className={`mode_button${difficultyLevel === mode.value ? ' active' : ''}`}
                                        onClick={() => { setDifficultyLevel(mode.value); }}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="drawer_toggle"
                                aria-expanded={panelOpen}
                                aria-controls="controls"
                                onClick={() => { setPanelOpen((open) => !open); }}
                            >
                                {showingChooser ? "Game List" : panelOpen ? "Close Games" : "Change Game"}
                            </button>
                        </div>
                    </div>

                    <PhaserGame
                        ref={phaserRef}
                        currentActiveScene={currentScene}
                        difficultyLevel={difficultyLevel}
                        backgroundKey={backgroundKey}
                    />

                    {showingChooser ? (
                        <div className="game_picker_overlay">
                            <div className="game_picker_panel">
                                <p className="panel_eyebrow">Start Here</p>
                                <h2>Pick a game</h2>
                                <p className="panel_text">
                                    Choose any activity to jump straight in.
                                </p>

                                <div className="activity_list chooser_list">
                                    {activities.map((activity) => (
                                        <button
                                            key={activity.key}
                                            type="button"
                                            className="game_button"
                                            onClick={() => { launchScene(activity.key); }}
                                        >
                                            <span className="game_button_title">{activity.label}</span>
                                            <span className="game_button_text">{activity.description}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </section>

            <aside id="controls" aria-hidden={!panelOpen}>
                <div className="panel_card drawer_card">
                    <div className="drawer_header">
                        <div>
                            <p className="panel_eyebrow">Learning Garden</p>
                            <h2>Pick a game</h2>
                        </div>
                        <button
                            type="button"
                            className="drawer_close"
                            aria-label="Close game picker"
                            onClick={() => { setPanelOpen(false); }}
                        >
                            x
                        </button>
                    </div>

                    <p className="panel_text">
                        Jump to a new activity whenever the player wants a different challenge.
                    </p>

                    <div className="activity_list">
                        {activities.map((activity) => (
                            <button
                                key={activity.key}
                                type="button"
                                className={`game_button${activeSceneKey === activity.key ? ' active' : ''}`}
                                onClick={() => { launchScene(activity.key); }}
                            >
                                <span className="game_button_title">{activity.label}</span>
                                <span className="game_button_text">{activity.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="panel_card tip_card">
                    <p className="panel_eyebrow">Grown-up Tip</p>
                    <p className="panel_text">
                        Short play sessions work well here. Switch often and let repetition happen naturally.
                    </p>
                </div>
            </aside>
        </div>
    )
}

export default App
