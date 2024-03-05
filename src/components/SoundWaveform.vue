<template>
  <div style="position: relative">
    <div ref="waveformNew" class="waveform-view"></div>
  </div>
</template>

<script setup lang="ts">
import { PropType, ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { useSoundsStore } from 'src/stores/sounds-store';
import { useSettingsStore } from '../stores/settings-store';
import { SoundModel } from './models';
import { Waveform } from 'src/scripts/waveform';
import { dbToGain } from 'src/scripts/math-helpers';
import { getCssVar } from 'quasar';
import {
  isCartSound,
  isPlaylistActiveSound,
} from 'src/scripts/sound-controller';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();
const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});
const sound = ref(props.sound);

let waveform: Waveform;
const waveformNew = ref<HTMLDivElement | null>(null);

const emits = defineEmits(['click', 'doubleClick', 'long-touch']);

onMounted(async () => {
  if (!waveformNew.value) return;
  waveform = new Waveform(waveformNew.value, props.sound.audioElement);

  waveform.addEventListener('click', handleClick);
  waveform.addEventListener('touchHold', handleTouchHold);

  if (sound.value.waveformChunks) {
    await waveform.setWaveformChunks(sound.value.waveformChunks);
    initWaveform();
  } else {
    soundsStore.waveformBeingCalculatedSounds.push(sound.value.id);

    await waveform.calculateWaveformChunks().then((chunks) => {
      sound.value.waveformChunks = chunks;
      sound.value.waveformChunksHasBeenCalculated = true;
      initWaveform();

      soundsStore.waveformBeingCalculatedSounds =
        soundsStore.waveformBeingCalculatedSounds.filter(
          (id) => id !== sound.value.id
        );
    });
  }
});

onBeforeUnmount(() => {
  waveform.removeEventListener('click', handleClick);
  waveform.removeEventListener('touchHold', handleTouchHold);
  waveform.cleanUp();
});

function handleClick(event: any) {
  emits('click', event);
}

function handleTouchHold(event: any) {
  emits('long-touch', event);
}

function initWaveform() {
  waveform.setHeight(getWaveformHeight());
  waveform?.setVerticalZoomFactor(
    dbToGain(sound.value.trimDb) * settingsStore.waveformVerticalZoomFactor
  );
  waveform.showInTime = true;
  waveform.showOutTime = true;
  waveform.inTimeColor = 'lightblue';
  waveform.outTimeColor = 'yellow';
  waveform.isZoomable = false;
  waveform.waveformLayer.listening(false);
  waveform.name = sound.value.name;
  waveform.setEnveloppePoints(sound.value.enveloppePoints);
  waveform.setShowEnveloppe(sound.value.enveloppeIsEnabled);
  waveform.setShowEnveloppeLine(false);
  waveform.setShowEnveloppePoints(false);

  if (sound.value.inTime) {
    waveform.setInTime(sound.value.inTime);
  }
  if (sound.value.outTime) {
    waveform.setOutTime(sound.value.outTime);
  }

  updateWaveformColor();
}
function getWaveformHeight() {
  if (!settingsStore.cartIsDifferentHeightThanPlaylist) {
    return settingsStore.playlistWaveformHeightFactor * 100;
  } else if (isCartSound(sound.value)) {
    return settingsStore.cartWaveformHeightFactor * 100;
  } else {
    return settingsStore.playlistWaveformHeightFactor * 100;
  }
}
watch(
  () => settingsStore.playlistWaveformHeightFactor,
  () => {
    waveform?.setHeight(getWaveformHeight());
  }
);
watch(
  () => settingsStore.cartWaveformHeightFactor,
  () => {
    waveform?.setHeight(getWaveformHeight());
  }
);

watch(
  () => sound.value.isSelected,
  () => {
    updateWaveformColor();
  }
);

watch(
  () => sound.value.isPlaylistActiveSound,
  () => {
    updateWaveformColor();
  }
);
watch(
  () => sound.value.inTime,
  (newValue) => {
    if (newValue) {
      waveform.setInTime(newValue);
    } else {
      waveform.setInTime(null);
    }
  }
);
watch(
  () => sound.value.outTime,
  (newValue) => {
    if (newValue) {
      waveform.setOutTime(newValue);
    } else {
      waveform.setOutTime(null);
    }
  }
);

function updateWaveformColor() {
  if (!sound.value.waveformChunks) return;
  if (isPlaylistActiveSound(sound.value)) {
    waveform?.setRemainingWaveformFillColor(getCssVar('secondary') ?? 'orange');
  } else {
    waveform?.setRemainingWaveformFillColor(sound.value.color);
  }
}

watch(
  () => sound.value.color,
  () => {
    updateWaveformColor();
  }
);

watch(
  () => sound.value.trimDb,
  (newValue) => {
    waveform?.setVerticalZoomFactor(
      dbToGain(newValue) * settingsStore.waveformVerticalZoomFactor
    );
  }
);

watch(
  () => sound.value.remainingTime,
  (newValue) => {
    if (newValue < 5) {
      if (waveform?.getPlayedWaveformFillColor() !== 'red') {
        waveform?.setPlayedWaveformFillColor('red');
      }
    } else {
      if (waveform?.getPlayedWaveformFillColor() !== 'green')
        waveform?.setPlayedWaveformFillColor('green');
    }
  }
);

watch(
  () => sound.value.isPlaying,
  () => {
    updateWaveformColor();
  }
);

watch(
  () => sound.value.enveloppePoints,
  (newValue) => {
    waveform.setShowEnveloppe(true);
    waveform?.setEnveloppePoints(newValue);
  },
  { deep: true }
);
</script>

<style scoped>
.waveform-view {
  width: 100%;
}
</style>
