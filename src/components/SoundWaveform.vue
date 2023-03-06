<template>
  <div style="position: relative">
    <div ref="overview" class="overview-container"></div>
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
import { PropType, ref, onMounted, watch } from 'vue';
import { useSoundsStore } from '../stores/example-store';
import { SoundModel } from './models';
import Peaks from 'peaks.js';
import { dbToGain } from '../composables/math-helpers';
const soundsStore = useSoundsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});

const sound = ref(props.sound);
const overview = ref(null);
const waveformCreated = ref(false);
var peaksInstance = null as Peaks | null;
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
        playheadColor: 'transparent',
      },
      mediaElement: soundInterface.audioElement,
      webAudio: {
        audioContext: soundsStore.audioContext,
      },
      playHeadColor: 'transparent',
      zoomLevels: [16, 1024, 2048, 4096],
    };

    Peaks.init(options, function (err, peaks) {
      if (err) {
        console.error('Failed to initialize Peaks instance: ' + err.message);
        return;
      }
      if (peaks) {
        peaksInstance = peaks;
        const overview = peaksInstance.views.getView('overview');
        console.log('overview' + overview);
        overview?.enableSeek(false);
        overview?.showAxisLabels(false);
        overview?.fitToContainer();
        soundInterface.audioElement.addEventListener('play', () => {
          overview?.setWaveformColor('orange');
        });
        window.addEventListener('resize', function () {
          console.log('resize');
          const overview = peaksInstance?.views.getView('overview');
          overview?.fitToContainer();
        });
        waveformCreated.value = true;
      }
    });
  }
});

watch(
  () => soundInterface?.isSelected,
  (newValue) => {
    peaksInstance?.views
      .getView('overview')
      ?.setWaveformColor(getWaveformColor());
  }
);

watch(
  () => soundInterface?.trimGain,
  (newValue) => {
    if (newValue !== undefined) {
      peaksInstance?.views
        .getView('overview')
        ?.setAmplitudeScale(dbToGain(newValue));
    }
  }
);

function getWaveformColor() {
  if (soundInterface?.isPlaying) {
    return 'green';
  } else if (soundInterface?.isSelected) {
    return 'orange';
  } else {
    return 'rgb(40, 134, 189)';
  }
}

function waveformClicked() {
  console.log('waveform clicked');
}
</script>

<style scoped>
.overview-container {
  height: 100px;
}
</style>
