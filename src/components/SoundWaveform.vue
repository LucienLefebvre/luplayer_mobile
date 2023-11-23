<template>
  <div style="position: relative">
    <div ref="overview" class="overview-container"></div>
    <div v-if="isSoundDetails" ref="zoomView" class="zoom-container"></div>
    <div
      style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "
      :hidden="waveformCreated"
    >
      <q-circular-progress
        indeterminate
        rounded
        size="50px"
        color="rgb(40, 134, 189)"
        class="q-ma-md"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  PropType,
  ref,
  Ref,
  onMounted,
  watch,
  defineExpose,
  defineEmits,
} from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from '../stores/settings-store';
import { SoundModel } from './models';
import Peaks, { PeaksInstance, PeaksOptions } from 'peaks.js';
import { dbToGain } from '../composables/math-helpers';
import { setInTime, setOutTime } from 'src/composables/sound-controller';
import { lerpRGBAColor } from 'src/composables/color-helpers';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
  isSoundDetails: { type: Boolean, required: false, default: false },
});

const emits = defineEmits([
  'isMaxZoomed',
  'isNotMaxZoomed',
  'isMinZoomed',
  'isNotMinZoomed',
]);

const sound = ref(props.sound);
const isSoundDetails = ref(props.isSoundDetails);

const overview: Ref<HTMLElement | null> = ref(null);
const zoomView = ref(null);

const waveformCreated = ref(false);
var peaksInstance = null as PeaksInstance | null;

const zoomLevels = [16, 32, 64, 128, 256, 512, 1024, 2048];

const playerHeight = ref(settingsStore.playerHeightFactor);

onMounted(() => {
  if (sound.value !== undefined) {
    document.body.appendChild<HTMLAudioElement>(
      sound.value.audioElement ?? document.createElement('audio')
    );

    const options = {
      overview: {
        container: overview.value,
        playedWaveformColor: sound.value.remainingTime < 5 ? 'red' : 'green',
        waveformColor: getWaveformColor(),
        showAxisLabel: false,
        axisGridlineColor: '#323E44',
        playheadColor: isSoundDetails.value ? 'black' : 'transparent',
        highlightColor: isSoundDetails.value
          ? 'rgba(255, 255, 255, 0.2)'
          : 'transparent',
        highlightOffset: 0,
        highlightCornerRadius: 10,
      },
      zoomview: {
        container: zoomView.value,
        playedWaveformColor: sound.value.remainingTime < 5 ? 'red' : 'green',
        waveformColor: getWaveformColor(),
        showAxisLabel: true,
        axisGridlineColor: '#323E44',
        playheadColor: 'black',
      },
      mediaElement: sound.value.audioElement,
      webAudio: {
        audioContext: soundsStore.audioContext,
        multiChannel: settingsStore.showMultiChannelWaveform,
      },
      playHeadColor: 'transparent',
      zoomLevels: zoomLevels,
    } as PeaksOptions;

    Peaks.init(options, function (err, peaks) {
      if (err) {
        console.error('Failed to initialize Peaks instance: ' + err.message);
        return;
      }
      if (peaks) {
        peaksInstance = peaks;
        const overview = peaksInstance.views.getView('overview');

        overview?.enableSeek(isSoundDetails.value ? true : false);
        overview?.showAxisLabels(false);
        overview?.fitToContainer();
        peaksInstance.zoom.setZoom(3);

        sound.value.audioElement.addEventListener('play', () => {
          overview?.setWaveformColor('orange');
        });

        if (sound.value.inTime !== null) {
          updateInPoint(sound.value.inTime);
        }
        if (sound.value.outTime !== null) {
          updateOutPoint(sound.value.outTime);
        }

        setWaveformScale(sound.value.trimGain);

        window.addEventListener('resize', function () {
          const overview = peaksInstance?.views.getView('overview');
          const zoomview = peaksInstance?.views.getView('zoomview');
          overview?.fitToContainer();
          zoomview?.fitToContainer();
        });
        waveformCreated.value = true;

        if (settingsStore.autoNormalize) {
          initTrimGain();
        }
      }
    });
    updateWaveformHeight(settingsStore.playerHeightFactor);
  }
});

function initTrimGain() {
  if (sound.value?.integratedLoudness !== null) {
    setWaveformScale(sound.value?.trimGain ?? 0);
  } else {
    setTimeout(() => {
      initTrimGain();
    }, 100);
  }
}

watch(
  () => sound.value?.isSelected,
  (newValue) => {
    peaksInstance?.views
      .getView('overview')
      ?.setWaveformColor(getWaveformColor());
    peaksInstance?.views
      .getView('zoomview')
      ?.setWaveformColor(getWaveformColor());
  }
);

watch(
  () => sound.value?.trimGain,
  (newValue) => {
    if (newValue !== undefined) {
      setWaveformScale(newValue);
    }
  }
);

function setWaveformScale(scale: number) {
  const scaleToSet = dbToGain(scale) * settingsStore.waveformVerticalZoomFactor;
  peaksInstance?.views.getView('overview')?.setAmplitudeScale(scaleToSet);
  peaksInstance?.views.getView('zoomview')?.setAmplitudeScale(scaleToSet);
}

watch(
  () => sound.value?.remainingTime,
  (newValue) => {
    if (newValue !== undefined) {
      if (newValue < 5) {
        peaksInstance?.views.getView('overview')?.setPlayedWaveformColor('red');
      } else {
        peaksInstance?.views
          .getView('overview')
          ?.setPlayedWaveformColor('green');
      }
    }
  }
);

function getWaveformColor() {
  if (sound.value?.isPlaying) {
    return sound.value?.remainingTime < 5 ? 'red' : 'green';
  } else if (sound.value?.isSelected && soundsStore.playerMode === 'playlist') {
    return 'orange';
  } else {
    return 'rgb(40, 134, 189)';
  }
}

function setWaveformColor(color: string) {
  peaksInstance?.views.getView('overview')?.setWaveformColor(color);
  peaksInstance?.views.getView('zoomview')?.setWaveformColor(color);
}

let redAmount = 0;
function setRedAmount(amount: number) {
  redAmount = amount;
  const lerpedColor = lerpRGBAColor(
    [40, 134, 189, 1],
    [255, 0, 0, 1],
    redAmount
  );
  peaksInstance?.views.getView('overview')?.setWaveformColor(lerpedColor);
}

function zoomIn() {
  peaksInstance?.zoom.zoomIn();
  updateZoomState();
}

function zoomOut() {
  peaksInstance?.zoom.zoomOut();
  updateZoomState();
}

function updateZoomState() {
  emits('isMaxZoomed', peaksInstance?.zoom.getZoom() === 0);
  emits('isMinZoomed', peaksInstance?.zoom.getZoom() === zoomLevels.length - 1);
}

function setInPoint() {
  if (sound.value) {
    setInTime(sound.value, peaksInstance?.player.getCurrentTime() ?? 0);
  }
}

function setOutPoint() {
  if (sound.value) {
    setOutTime(sound.value, peaksInstance?.player.getCurrentTime() ?? 0);
  }
}

function updateInPoint(time: number) {
  peaksInstance?.points.removeById('inPoint');
  peaksInstance?.points.add({
    time: time,
    editable: true,
    color: 'blue',
    labelText: 'In',
    id: 'inPoint',
  });
}

function updateOutPoint(time: number) {
  peaksInstance?.points.removeById('outPoint');
  peaksInstance?.points.add({
    time: time,
    editable: true,
    color: 'yellow',
    labelText: 'Out',
    id: 'outPoint',
  });
}

watch(
  () => sound.value?.inTime,
  (newValue) => {
    if (newValue !== null && newValue !== undefined) {
      updateInPoint(newValue);
    } else {
      peaksInstance?.points.removeById('inPoint');
    }
  }
);

watch(
  () => sound.value?.outTime,
  (newValue) => {
    if (newValue !== null && newValue !== undefined) {
      updateOutPoint(newValue);
    } else {
      peaksInstance?.points.removeById('outPoint');
    }
  }
);

watch(
  () => settingsStore.playerHeightFactor,
  (newValue) => {
    updateWaveformHeight(newValue);
  }
);

function updateWaveformHeight(factor: number) {
  if (overview.value) {
    const height = 100 * factor;
    overview.value.style.height = height + 'px';
    const peaksOverview = peaksInstance?.views.getView('overview');

    peaksOverview?.fitToContainer();
  }
}

defineExpose({
  zoomIn,
  zoomOut,
  setInPoint,
  setOutPoint,
  setRedAmount,
  setWaveformColor,
});
</script>

<style scoped>
.overview-container {
  height: 100px;
}
.zoom-container {
  height: 100px;
}
</style>
