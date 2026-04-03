import { CropName } from '../../crops';
import { BalanceEquationGameScene } from './BalanceEquationGameScene';

export class AdvancedBalanceEquationGameScene extends BalanceEquationGameScene
{
    constructor ()
    {
        super('AdvancedBalanceEquationGameScene', 'Advanced Balance Equations');
    }

    buildLevelOneRound ()
    {
        return this.buildAdvancedRound(['carrot', 'corn', 'tomato'], 3, 6, 3, 6, 2, 3, 2, 4, 2, 'Balance both sides using as few crops as possible.');
    }

    buildLevelTwoRound ()
    {
        return this.buildAdvancedRound(['carrot', 'corn', 'tomato', 'cabbage'], 4, 7, 3, 7, 2, 3, 2, 4, 3, 'Balance both sides using as few crops as possible.');
    }

    buildLevelThreeRound ()
    {
        return this.buildAdvancedRound(['corn', 'tomato', 'cabbage', 'pumpkin'], 7, 14, 6, 14, 2, 4, 2, 6, 4, 'Balance both sides using as few crops as possible.');
    }

    buildAdvancedRound (
        cropPool: CropName[],
        solutionMin: number,
        solutionMax: number,
        lighterMin: number,
        lighterMax: number,
        solutionMinPieces: number,
        solutionMaxPieces: number,
        baseMinPieces: number,
        baseMaxPieces: number,
        roundCropCount: number,
        prompt = 'Use the crop bin on either tray until both sides are equal.'
    )
    {
        const roundCropPool = Phaser.Utils.Array.Shuffle([...cropPool]).slice(0, roundCropCount);
        const solutionCrops = this.findRandomCombination(
            Phaser.Math.Between(solutionMin, solutionMax),
            roundCropPool,
            solutionMinPieces,
            solutionMaxPieces
        ) ?? [roundCropPool[0], roundCropPool[1]];
        const difference = this.getCropTotal(solutionCrops);
        const lighterTotal = Phaser.Math.Between(lighterMin, lighterMax);
        const heavierTotal = lighterTotal + difference;
        const leftHeavier = Phaser.Math.Between(0, 1) === 0;
        const leftTotal = leftHeavier ? heavierTotal : lighterTotal;
        const rightTotal = leftHeavier ? lighterTotal : heavierTotal;
        const leftBaseCrops = this.findRandomCombination(leftTotal, roundCropPool, baseMinPieces, baseMaxPieces) ?? [roundCropPool[0], roundCropPool[1]];
        const rightBaseCrops = this.findRandomCombination(rightTotal, roundCropPool, baseMinPieces, baseMaxPieces) ?? [roundCropPool[0]];

        return {
            prompt,
            helper: 'Try the two crop values in different combinations.',
            equationHint: `${leftTotal} + ? = ${rightTotal} + ?`,
            leftBaseCrops,
            rightBaseCrops,
            allowedCrops: roundCropPool,
            allowLeftPlacement: true,
            allowRightPlacement: true,
            removableSide: null,
            showValues: true
        };
    }

    handleSolvedRound ()
    {
        const placedCropCount = this.leftPlacedCrops.length + this.rightPlacedCrops.length;
        const minimumCropCount = this.getMinimumSolutionCropCount();

        if (placedCropCount > minimumCropCount) {
            this.feedbackText.setText('Balanced. See if you can do it with fewer crops.');
            return;
        }

        super.handleSolvedRound();
    }

    getMinimumSolutionCropCount ()
    {
        const difference = Math.abs(this.getLeftTotal() - this.getRightTotal());

        if (difference === 0) {
            const startingDifference = Math.abs(
                this.getCropTotal(this.round?.leftBaseCrops ?? []) - this.getCropTotal(this.round?.rightBaseCrops ?? [])
            );
            const minimumSolution = this.findRandomCombination(
                startingDifference,
                this.round?.allowedCrops ?? [],
                1,
                BalanceEquationGameScene.MAX_PLACED_CROPS_PER_SIDE
            );

            return minimumSolution?.length ?? this.leftPlacedCrops.length + this.rightPlacedCrops.length;
        }

        const minimumSolution = this.findRandomCombination(
            difference,
            this.round?.allowedCrops ?? [],
            1,
            BalanceEquationGameScene.MAX_PLACED_CROPS_PER_SIDE
        );

        return minimumSolution?.length ?? this.leftPlacedCrops.length + this.rightPlacedCrops.length;
    }
}
