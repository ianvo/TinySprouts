import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import { GameScene } from './game/scenes/GameScene';

const difficultyModes = [
    { value: 1, label: 'Level 1' },
    { value: 2, label: 'Level 2' },
    { value: 3, label: 'Level 3' }
];

const hiddenActivityKeys = new Set([
    'BuildShapeGameScene'
]);

const gameBackgrounds: Record<string, string> = {
    MainMenu: 'farmyard',
    PatternGameScene: 'greenhouse',
    ShapeMatchGameScene: 'greenhouse',
    BuildShapeGameScene: 'farmyard',
    CompareLengthGameScene: 'farmyard',
    OrderByLengthGameScene: 'farmyard',
    SortRuleGameScene: 'greenhouse',
    PictureGraphGameScene: 'greenhouse',
    AdditionGameScene: 'coop',
    SubtractionGameScene: 'coop',
    CountingGameScene: 'coop',
    CompareCoopsGameScene: 'coop',
    MakeTenGameScene: 'coop',
    MissingEggBasketGameScene: 'coop',
    ChickenNumberLineGameScene: 'coop',
    BuildCartonGameScene: 'coop',
    WaysToMakeGameScene: 'coop',
    MemoryGameScene: 'coop',
    default: 'coop'
};

const activityGroups = [
    {
        label: 'Number Sense',
        activities: [
            {
                key: 'CountingGameScene',
                label: 'Counting',
                description: 'Count objects and match the total.'
            },
            {
                key: 'CompareCoopsGameScene',
                label: 'Comparing Quantities',
                description: 'Compare two groups and choose more, less, or equal.'
            },
            {
                key: 'MakeTenGameScene',
                label: 'Make 5 and 10',
                description: 'Use frames to complete number bonds to 5 and 10.'
            },
            {
                key: 'ChickenNumberLineGameScene',
                label: 'Number Line',
                description: 'Place numbers on a number line and identify before, after, and between.'
            },
            {
                key: 'BuildCartonGameScene',
                label: 'Place Value',
                description: 'Read tens and ones to identify a number.'
            }
        ]
    },
    {
        label: 'Addition & Subtraction',
        activities: [
            {
                key: 'AdditionGameScene',
                label: 'Addition',
                description: 'Combine two groups to find the total.'
            },
            {
                key: 'MissingEggBasketGameScene',
                label: 'Missing Addends',
                description: 'Find the missing part in an addition equation.'
            },
            {
                key: 'SubtractionGameScene',
                label: 'Subtraction',
                description: 'Take away from a group and find how many are left.'
            },
            {
                key: 'WaysToMakeGameScene',
                label: 'Number Combinations',
                description: 'Find different pairs that make the same total.'
            }
        ]
    },
    {
        label: 'Patterns & Logic',
        activities: [
            {
                key: 'PatternGameScene',
                label: 'Patterns',
                description: 'Complete crop and number patterns.'
            },
            {
                key: 'MemoryGameScene',
                label: 'Memory Match',
                description: 'Match cards by value and number relationships.'
            }
        ]
    },
    {
        label: 'Geometry & Spatial Reasoning',
        activities: [
            {
                key: 'ShapeMatchGameScene',
                label: 'Shape Match',
                description: 'Match a shape to its outline.'
            },
            {
                key: 'BuildShapeGameScene',
                label: 'Build the Shape',
                description: 'Choose the pieces that build a target shape.'
            }
        ]
    },
    {
        label: 'Measurement',
        activities: [
            {
                key: 'CompareLengthGameScene',
                label: 'Compare Length',
                description: 'Decide which fence is longer or if they are the same.'
            },
            {
                key: 'OrderByLengthGameScene',
                label: 'Order by Length',
                description: 'Put fences in order from shortest to longest.'
            }
        ]
    },
    {
        label: 'Sorting & Data',
        activities: [
            {
                key: 'SortRuleGameScene',
                label: 'Sorting',
                description: 'Sort crops by a visible rule.'
            },
            {
                key: 'PictureGraphGameScene',
                label: 'Picture Graph',
                description: 'Read a crop graph and answer questions about it.'
            }
        ]
    }
];

const visibleActivityGroups = activityGroups
    .map((group) => ({
        ...group,
        activities: group.activities.filter((activity) => !hiddenActivityKeys.has(activity.key))
    }))
    .filter((group) => group.activities.length > 0);

function App()
{
    const [gameTitle, setGameTitle] = useState("");
    const [activeSceneKey, setActiveSceneKey] = useState("MainMenu");
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
            }
        }
    }

    const renderActivityGroups = (isChooser: boolean) => (
        <div className={`activity_groups${isChooser ? ' chooser_groups' : ''}`}>
            {visibleActivityGroups.map((group) => (
                <section key={group.label} className="activity_group">
                    <h3 className="activity_group_title">{group.label}</h3>
                    <div className="activity_group_list">
                        {group.activities.map((activity) => (
                            <button
                                key={activity.key}
                                type="button"
                                className={`game_button${!isChooser && activeSceneKey === activity.key ? ' active' : ''}`}
                                onClick={() => { launchScene(activity.key); }}
                            >
                                <span className="game_button_title">{activity.label}</span>
                                <span className="game_button_text">{activity.description}</span>
                            </button>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );

    return (
        <div id="app">
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
                                onClick={() => { launchScene("MainMenu"); }}
                                disabled={showingChooser}
                            >
                                {showingChooser ? "Home" : "Back Home"}
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

                                {renderActivityGroups(true)}
                            </div>
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    )
}

export default App
