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

const overview = ref(null);
const zoomView = ref(null);

const waveformCreated = ref(false);
var peaksInstance = null as PeaksInstance | null;

const zoomLevels = [16, 32, 64, 128, 256, 512, 1024, 2048];

const soundInterface = soundsStore.sounds.find((s) => s.id === sound.value.id);

onMounted(() => {
  if (soundInterface !== undefined) {
    document.body.appendChild<HTMLAudioElement>(
      soundInterface.audioElement ?? document.createElement('audio')
    );

    const options = {
      overview: {
        container: overview.value,
        playedWaveformColor: 'green',
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
        playedWaveformColor: 'green',
        waveformColor: getWaveformColor(),
        showAxisLabel: true,
        axisGridlineColor: '#323E44',
        playheadColor: 'black',
      },
      mediaElement: soundInterface.audioElement,
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

        soundInterface.audioElement.addEventListener('play', () => {
          overview?.setWaveformColor('orange');
        });

        if (soundInterface.inTime !== null) {
          updateInPoint(soundInterface.inTime);
        }
        if (soundInterface.outTime !== null) {
          updateOutPoint(soundInterface.outTime);
        }

        setWaveformScale(soundInterface.trimGain);

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
  }
});

function initTrimGain() {
  if (soundInterface?.integratedLoudness !== null) {
    setWaveformScale(soundInterface?.trimGain ?? 0);
  } else {
    setTimeout(() => {
      initTrimGain();
    }, 100);
  }
}

watch(
  () => soundInterface?.isSelected,
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
  () => soundInterface?.trimGain,
  (newValue) => {
    if (newValue !== undefined) {
      setWaveformScale(newValue);
    }
  }
);

function setWaveformScale(scale: number) {
  peaksInstance?.views.getView('overview')?.setAmplitudeScale(dbToGain(scale));
  peaksInstance?.views.getView('zoomview')?.setAmplitudeScale(dbToGain(scale));
}

function getWaveformColor() {
  if (soundInterface?.isPlaying) {
    return 'green';
  } else if (soundInterface?.isSelected) {
    return 'orange';
  } else {
    return 'rgb(40, 134, 189)';
  }
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
  if (soundInterface) {
    setInTime(soundInterface, peaksInstance?.player.getCurrentTime() ?? 0);
  }
}

function setOutPoint() {
  if (soundInterface) {
    setOutTime(soundInterface, peaksInstance?.player.getCurrentTime() ?? 0);
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
  () => soundInterface?.inTime,
  (newValue) => {
    if (newValue !== null && newValue !== undefined) {
      updateInPoint(newValue);
    } else {
      peaksInstance?.points.removeById('inPoint');
    }
  }
);

watch(
  () => soundInterface?.outTime,
  (newValue) => {
    if (newValue !== null && newValue !== undefined) {
      updateOutPoint(newValue);
    } else {
      peaksInstance?.points.removeById('outPoint');
    }
  }
);

defineExpose({
  zoomIn,
  zoomOut,
  setInPoint,
  setOutPoint,
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
