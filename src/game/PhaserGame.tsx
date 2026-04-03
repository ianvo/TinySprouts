import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame, { GAME_VERSION } from './main';
import { EventBus } from './EventBus';

export interface IRefPhaserGame
{
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps
{
    currentActiveScene?: (scene_instance: Phaser.Scene) => void;
    difficultyLevel: number;
    backgroundKey: string;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame({ currentActiveScene, difficultyLevel, backgroundKey }, ref)
{
    const game = useRef<Phaser.Game | null>(null!);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() =>
    {
        const container = containerRef.current;
        let resizeObserver: ResizeObserver | null = null;
        let resizeFrame = 0;

        const refreshGameScale = () =>
        {
            resizeFrame = 0;

            if (!game.current || !container)
            {
                return;
            }

            const { width, height } = container.getBoundingClientRect();

            if (width === 0 || height === 0)
            {
                return;
            }

            game.current.scale.refresh();
        };

        const queueScaleRefresh = () =>
        {
            if (resizeFrame)
            {
                window.cancelAnimationFrame(resizeFrame);
            }

            resizeFrame = window.requestAnimationFrame(refreshGameScale);
        };

        if (game.current)
        {
            game.current.destroy(true);
            game.current = null;
        }

        if (container)
        {
            container.innerHTML = '';
        }

        game.current = StartGame('game-container');
        game.current.registry.set('difficultyLevel', difficultyLevel);
        queueScaleRefresh();

        if (container && typeof ResizeObserver !== 'undefined')
        {
            resizeObserver = new ResizeObserver(() =>
            {
                queueScaleRefresh();
            });
            resizeObserver.observe(container);
        }

        if (typeof ref === 'function')
        {
            ref({ game: game.current, scene: null });
        } else if (ref)
        {
            ref.current = { game: game.current, scene: null };

        }

        return () =>
        {
            if (resizeObserver)
            {
                resizeObserver.disconnect();
            }

            if (resizeFrame)
            {
                window.cancelAnimationFrame(resizeFrame);
            }

            if (game.current)
            {
                game.current.destroy(true);
                if (game.current !== null)
                {
                    game.current = null;
                }
            }
        }
    }, [ref, GAME_VERSION]);

    useEffect(() =>
    {
        const handleCurrentSceneReady = (scene_instance: Phaser.Scene) =>
        {
            if (currentActiveScene && typeof currentActiveScene === 'function')
            {

                currentActiveScene(scene_instance);

            }

            if (typeof ref === 'function')
            {

                ref({ game: game.current, scene: scene_instance });
            
            } else if (ref)
            {

                ref.current = { game: game.current, scene: scene_instance };

            }
            
        };

        EventBus.on('current-scene-ready', handleCurrentSceneReady);
        return () =>
        {
            EventBus.off('current-scene-ready', handleCurrentSceneReady);
        }
    }, [currentActiveScene, ref, GAME_VERSION]);

    useEffect(() =>
    {
        if (game.current)
        {
            game.current.registry.set('difficultyLevel', difficultyLevel);
            EventBus.emit('difficulty-changed', difficultyLevel);
        }
    }, [difficultyLevel]);

    return (
        <div
            id="game-frame"
            style={{ '--game-bg-image': `url(/assets/background/${backgroundKey}.png)` } as React.CSSProperties}
        >
            <div
                id="game-container"
                ref={containerRef}
            ></div>
        </div>
    );

});
