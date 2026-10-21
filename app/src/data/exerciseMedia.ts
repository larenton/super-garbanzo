import type { ImageSourcePropType } from 'react-native';

/**
 * Start/finish illustrations and demo-video links from the Week 1 plan's
 * Exercise Guide (pages 6–9). Images are cropped from the PDF.
 */
export interface ExerciseMedia {
  image: ImageSourcePropType;
  /** Width ÷ height, so the image can be laid out before it loads. */
  aspect: number;
  video: string;
}

const yt = (q: string) => `https://www.youtube.com/results?search_query=${q}`;

export const EXERCISE_MEDIA: Record<string, ExerciseMedia> = {
  'seated-db-front-raise': {
    image: require('../../assets/exercises/seated-db-front-raise.png'),
    aspect: 3.137,
    video: yt('seated+dumbbell+front+raise'),
  },
  'seated-db-shoulder-press': {
    image: require('../../assets/exercises/seated-db-shoulder-press.png'),
    aspect: 2.612,
    video: yt('seated+dumbbell+shoulder+press+form'),
  },
  'incline-db-press': {
    image: require('../../assets/exercises/incline-db-press.png'),
    aspect: 2.737,
    video: yt('incline+dumbbell+press+form'),
  },
  'cable-lateral-raise': {
    image: require('../../assets/exercises/cable-lateral-raise.png'),
    aspect: 2.337,
    video: yt('cable+lateral+raise+form'),
  },
  'flat-db-fly': { image: require('../../assets/exercises/flat-db-fly.png'), aspect: 1.612, video: yt('flat+dumbbell+fly+form') },
  'chest-press-machine': {
    image: require('../../assets/exercises/chest-press-machine.png'),
    aspect: 3.151,
    video: yt('chest+press+machine+form'),
  },
  'rope-triceps-pushdown': {
    image: require('../../assets/exercises/rope-triceps-pushdown.png'),
    aspect: 2.29,
    video: yt('rope+tricep+pushdown+form'),
  },
  'cable-external-rotation': {
    image: require('../../assets/exercises/cable-external-rotation.png'),
    aspect: 2.896,
    video: yt('cable+external+rotation+shoulder'),
  },
  'pull-up': { image: require('../../assets/exercises/pull-up.png'), aspect: 1.733, video: yt('pull+up+form+beginner') },
  'straight-arm-pulldown': {
    image: require('../../assets/exercises/straight-arm-pulldown.png'),
    aspect: 2.282,
    video: yt('straight+arm+rope+pulldown+form'),
  },
  'lat-pulldown-neutral': {
    image: require('../../assets/exercises/lat-pulldown-neutral.png'),
    aspect: 1.506,
    video: yt('neutral+grip+lat+pulldown+form'),
  },
  'lying-t-bar-row': {
    image: require('../../assets/exercises/lying-t-bar-row.png'),
    aspect: 3.013,
    video: yt('chest+supported+t+bar+row+form'),
  },
  'cable-rear-delt-fly': {
    image: require('../../assets/exercises/cable-rear-delt-fly.png'),
    aspect: 2.554,
    video: yt('cable+rear+delt+fly+form'),
  },
  'face-pull': { image: require('../../assets/exercises/face-pull.png'), aspect: 2.337, video: yt('face+pull+form') },
  'hammer-curl': { image: require('../../assets/exercises/hammer-curl.png'), aspect: 2.573, video: yt('dumbbell+hammer+curl+form') },
  'leg-press': { image: require('../../assets/exercises/leg-press.png'), aspect: 2.628, video: yt('leg+press+form') },
  'db-rdl': { image: require('../../assets/exercises/db-rdl.png'), aspect: 2.573, video: yt('dumbbell+romanian+deadlift+form') },
  'goblet-squat': { image: require('../../assets/exercises/goblet-squat.png'), aspect: 2.573, video: yt('goblet+squat+form') },
  'lying-hamstring-curl': {
    image: require('../../assets/exercises/lying-hamstring-curl.png'),
    aspect: 3.384,
    video: yt('lying+hamstring+curl+form'),
  },
  'sled-push': { image: require('../../assets/exercises/sled-push.png'), aspect: 3.335, video: yt('sled+push+form') },
  'hip-bridge-hold': { image: require('../../assets/exercises/hip-bridge-hold.png'), aspect: 5.285, video: yt('glute+bridge+hold') },
  'ankle-taps': { image: require('../../assets/exercises/ankle-taps.png'), aspect: 1.967, video: yt('ankle+taps+core+exercise') },
  'lying-leg-raise': {
    image: require('../../assets/exercises/lying-leg-raise.png'),
    aspect: 2.936,
    video: yt('lying+leg+raise+on+bench'),
  },
  'plank-hands': { image: require('../../assets/exercises/plank-hands.png'), aspect: 2.752, video: yt('high+plank+on+hands+form') },
};

export function getMedia(exerciseId: string): ExerciseMedia | undefined {
  return EXERCISE_MEDIA[exerciseId];
}
