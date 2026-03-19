export const CROP_SPRITESHEET_KEY = 'crops';
export const CROP_FRAME_WIDTH = 200;
export const CROP_FRAME_HEIGHT = 180;

export const CROP_DEFINITIONS = [
    { frame: 0, crop: 'tomato' },
    { frame: 1, crop: 'corn' },
    { frame: 2, crop: 'carrot' },
    { frame: 3, crop: 'cabbage' },
    { frame: 4, crop: 'wheat' },
    { frame: 5, crop: 'strawberry' },
    { frame: 6, crop: 'eggplant' },
    { frame: 7, crop: 'potato' },
    { frame: 8, crop: 'radish' },
    { frame: 9, crop: 'blueberry' },
    { frame: 10, crop: 'pumpkin' },
    { frame: 11, crop: 'watermelon' },
    { frame: 12, crop: 'onion' },
    { frame: 13, crop: 'broccoli' },
    { frame: 14, crop: 'rice' },
    { frame: 15, crop: 'lettuce' },
    { frame: 16, crop: 'chili_pepper' },
    { frame: 17, crop: 'peas' },
    { frame: 18, crop: 'turnip' },
    { frame: 19, crop: 'hay_bale' },
    { frame: 20, crop: 'apple' },
    { frame: 21, crop: 'sugarcane' },
    { frame: 22, crop: 'mushroom' },
    { frame: 23, crop: 'strawberry_plant' },
    { frame: 24, crop: 'sunflower' }
] as const;

export type CropName = (typeof CROP_DEFINITIONS)[number]['crop'];

export const CROP_FRAME_BY_NAME: Record<CropName, number> = Object.fromEntries(
    CROP_DEFINITIONS.map(({ crop, frame }) => [crop, frame])
) as Record<CropName, number>;

export function getCropFrame (crop: CropName) {
    return CROP_FRAME_BY_NAME[crop];
}
